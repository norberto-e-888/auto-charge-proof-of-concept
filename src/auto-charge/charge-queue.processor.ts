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
      this.logger.debug(`Auto-charging contract: ${job.data.contractId}`);
      const contract = await this.contractModel.findById(job.data.contractId);
      const paymentsMadeForContract = await this.paymentModel.find({
        contract: job.data.contractId,
      });

      const totalPaidSoFar = paymentsMadeForContract.reduce(
        (total, { amount }) => total + amount,
        0,
      );

      const remainingDebt = job.data.effectiveLoanAmount - totalPaidSoFar;
      const incomeOwed = (job.data.salary / 12) * job.data.salaryPercentageOwed;
      const paymentAmount = Math.round(
        remainingDebt >= incomeOwed ? incomeOwed : remainingDebt,
      );

      const idempotencyKey = `${job.data.contractId}-${job.data.month}/${job.data.year}-${PaymentType.Auto}`;
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: paymentAmount,
          currency: 'usd',
        },
        { idempotencyKey },
      );

      this.logger.debug(paymentIntent.id);
      const payment = await this.paymentModel.create({
        contract: new Types.ObjectId(job.data.contractId),
        amount: paymentAmount,
        user: contract.user,
        stripePaymentReference: paymentIntent.id,
        type: PaymentType.Auto,
      });

      this.logger.debug(`Successful payment: ${payment}`);
      done();
    } catch (error) {
      done(new Error(error));
      this.logger.error(
        `Error charching contract with ID: ${job.data.contractId}. ${error}`,
      );
    }
  }
}
