import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DoneCallback, Job, Queue } from 'bull';
import { Model, Types } from 'mongoose';
import { STRIPE } from 'src/lib/stripe';
import { Contract, ContractDocument } from 'src/models/contract.model';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
  PaymentType,
} from 'src/models/payment.model';
import { User } from 'src/models/user.model';
import Stripe from 'stripe';
import { AutoChargeQueue, ChargeQueueData } from './typings';
import autoChargeIdempotencyKey from './util/auto-charge-idempotency-key';

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
    @InjectQueue(AutoChargeQueue.ChargeDLQ)
    private readonly chargeQueueDLQ: Queue<
      ChargeQueueData & { error: unknown }
    >,
  ) {}

  @Process()
  async charge(job: Job<ChargeQueueData>, done: DoneCallback) {
    try {
      const { contractId, effectiveLoanAmount, salary, salaryPercentageOwed } =
        job.data;

      if (contractId === '614779b960e9ac1c6cd9dfde') {
        throw new Error('Forced error for contract 614779b960e9ac1c6cd9dfde');
      }

      this.logger.debug(`Auto-charging contract: ${contractId}`);
      const contract = await this.contractModel
        .findById(contractId)
        .populate('user');

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

      const idempotencyKey = autoChargeIdempotencyKey(job.data);
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: paymentAmount,
          currency: 'usd',
          customer: (contract.user as User).stripeReference,
          metadata: {
            idempotencyKey,
          },
        },
        { idempotencyKey },
      );

      await this.paymentModel.create({
        contract: new Types.ObjectId(contractId),
        amount: paymentAmount,
        user: contract.user,
        type: PaymentType.Auto,
        status: PaymentStatus.Success,
        stripeReference: paymentIntent.id,
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
        this.logger.debug(job.attemptsMade);
        if (job.attemptsMade >= 5) {
          try {
            this.logger.warn(
              `Moving charge job ${autoChargeIdempotencyKey(job.data)} to DLQ`,
            );

            await this.chargeQueueDLQ.add({
              ...job.data,
              error,
            });

            done();
          } catch (error) {
            this.logger.error(
              `Error moving charge job to DLQ: ${autoChargeIdempotencyKey(
                job.data,
              )}`,
            );

            done(new Error(error));
          }
        } else {
          this.logger.error(
            `Error charging contract with ID: ${job.data.contractId}. ${error.message}`,
          );

          done(new Error(error));
        }
      }
    }
  }
}
