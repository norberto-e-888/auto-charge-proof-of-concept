import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DoneCallback, Job } from 'bull';
import { Model, Types } from 'mongoose';
import { STRIPE } from 'src/lib/stripe';
import { Contract, ContractDocument } from 'src/models/contract.model';
import {
  Payment,
  PaymentDocument,
  PaymentType,
} from 'src/models/payment.model';
import Stripe from 'stripe';
import { AutoChargeQueue, ChargeQueueData } from './typings';

@Processor(AutoChargeQueue.Charge)
export class ChargeQueueProcessor {
  private readonly logger = new Logger(ChargeQueueProcessor.name);

  constructor(
    @Inject(STRIPE)
    private readonly stripe: Stripe,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Contract.name)
    private readonly contractModel: Model<ContractDocument>,
  ) {}

  @Process()
  async charge(job: Job<ChargeQueueData>, done: DoneCallback) {
    try {
      const {
        contractId,
        effectiveLoanAmount,
        salary,
        salaryPercentageOwed,
        month,
        year,
      } = job.data;

      this.logger.debug(`Auto-charging contract: ${contractId}`);
      const contract = await this.contractModel.findById(contractId);
      const paymentsMadeForContract = await this.paymentModel.find({
        contract: contractId,
      });

      const totalPaidSoFar = paymentsMadeForContract.reduce(
        (total, { amount }) => total + amount,
        0,
      );

      const remainingDebt = effectiveLoanAmount - totalPaidSoFar;
      const incomeOwed = (salary / 12) * salaryPercentageOwed;
      const paymentAmount = Math.round(
        remainingDebt >= incomeOwed ? incomeOwed : remainingDebt,
      );

      const idempotencyKey = `${contractId}-${month}/${year}-${PaymentType.Auto}`;
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: paymentAmount,
          currency: 'usd',
        },
        { idempotencyKey },
      );

      await this.paymentModel.create({
        contract: new Types.ObjectId(contractId),
        amount: paymentAmount,
        user: contract.user,
        stripePaymentReference: paymentIntent.id,
        type: PaymentType.Auto,
        idempotencyKey,
        contractStateSnapshot: {
          effectiveLoanAmount,
          salaryPercentageOwed,
          salary,
        },
      });

      done();
    } catch (error) {
      if (error.code && error.code === 11000) {
        this.logger.warn(
          `Caught duplicate job in queue "${AutoChargeQueue.Charge}". Acknowledging...`,
        );

        done();
      } else {
        this.logger.debug(`Number of attempts: ${job.attemptsMade}`);
        this.logger.error(
          `Error charching contract with ID: ${job.data.contractId}. ${error.message}`,
        );

        done(new Error(error));
      }
    }
  }
}
