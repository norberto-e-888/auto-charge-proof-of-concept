import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DoneCallback, Job } from 'bull';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { STRIPE } from 'src/lib/stripe';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
  PaymentType,
} from 'src/models/payment.model';
import { AutoChargeQueue, ChargeQueueData } from './typings';
import { autoChargeIdempotencyKey } from './util/auto-charge-idempotency-key';
import { User } from 'src/models/user.model';
import { Contract, ContractDocument } from 'src/models/contract.model';

@Processor(AutoChargeQueue.ChargeDLQ)
export class ChargeDLQProcessor {
  private readonly logger = new Logger(ChargeDLQProcessor.name);

  constructor(
    @Inject(STRIPE)
    private readonly stripe: Stripe,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Contract.name)
    private readonly contractModel: Model<ContractDocument>,
  ) {}

  @Process()
  async charge(
    job: Job<ChargeQueueData & { error: unknown }>,
    done: DoneCallback,
  ) {
    try {
      const { contractId, effectiveLoanAmount, salary, salaryPercentageOwed } =
        job.data;

      const idempotencyKey = autoChargeIdempotencyKey(job.data);
      const contract = await this.contractModel
        .findById(contractId)
        .populate('user');

      const response = await this.stripe.paymentIntents.list({
        customer: (contract.user as User).stripeReference,
      });

      const wasPaymentProcessed =
        response.data.filter(
          ({ metadata }) => metadata.idempotencyKey === idempotencyKey,
        ).length !== 0;

      this.logger.debug(wasPaymentProcessed);
      if (!wasPaymentProcessed) {
        const paymentsMadeForContract = await this.paymentModel.find({
          contract: contractId,
          status: PaymentStatus.Success,
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

        await this.paymentModel.create({
          contract: new Types.ObjectId(contractId),
          amount: paymentAmount,
          user: new Types.ObjectId((contract.user as User).id),
          type: PaymentType.Auto,
          status: PaymentStatus.Failure,
          idempotencyKey: autoChargeIdempotencyKey(job.data),
          contractStateSnapshot: {
            effectiveLoanAmount,
            salaryPercentageOwed,
            salary,
          },
        });
      }

      done();
    } catch (error) {
      if (error.code && error.code === 11000) {
        this.logger.warn(
          `Caught duplicate job in queue "${AutoChargeQueue.ChargeDLQ}". Acknowledging...`,
        );

        done();
      } else {
        this.logger.error('Error processing charge DQL job', error);
        done(new Error(error));
      }
    }
  }
}
