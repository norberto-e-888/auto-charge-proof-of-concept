import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DoneCallback, Job } from 'bull';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { STRIPE } from 'src/lib/stripe';
import { Payment, PaymentDocument } from 'src/models/payment.model';

import { AutoChargeQueue, ChargeQueueData } from './typings';
import autoChargeIdempotencyKey from './util/auto-charge-idempotency-key';

@Processor(AutoChargeQueue.ChargeDLQ)
export class ChargeDLQProcessor {
  private readonly logger = new Logger(ChargeDLQProcessor.name);

  constructor(
    @Inject(STRIPE)
    private readonly stripe: Stripe,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  @Process()
  async charge(
    job: Job<ChargeQueueData & { error: unknown }>,
    done: DoneCallback,
  ) {
    try {
      const idempotencyKey = autoChargeIdempotencyKey(job.data);
      const response = await this.stripe.paymentIntents.list({
        idempotencyKey,
      });

      this.logger.debug(response);
      done();
    } catch (error) {
      this.logger.error('Error processing charge DQL job', error);
      done();
    }
  }
}
