import { Process, Processor } from '@nestjs/bull';
import { /* Inject, */ Logger } from '@nestjs/common';
import { DoneCallback, Job } from 'bull';
/* import { STRIPE } from 'src/lib/stripe';
import Stripe from 'stripe'; */
import { AutoChargeQueue, ChargeQueueData } from './typings';

@Processor(AutoChargeQueue.Charge)
export class ChargeQueueProcessor {
  private readonly logger = new Logger(ChargeQueueProcessor.name);

  /*   constructor(
    @Inject(STRIPE)
    private readonly stripe: Stripe,
  ) {}
 */
  @Process()
  charge(job: Job<ChargeQueueData>, done: DoneCallback) {
    try {
      this.logger.debug(`Auto-charging contract: ${job.data.contractId}`);
      done();
    } catch (error) {
      done(new Error(error));
      this.logger.error(
        `Error charching contract with ID: ${job.data.contractId}. ${error}`,
      );
    }
  }
}
