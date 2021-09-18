import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { DoneCallback, Job } from 'bull';
import { AutoPaymentQueue, ChargeQueueData } from './typings';

@Processor(AutoPaymentQueue.Charge)
export class ChargeQueueProcessor {
  private readonly logger = new Logger(ChargeQueueProcessor.name);

  @Process()
  async charge(job: Job<ChargeQueueData>, done: DoneCallback) {
    try {
      if (job.data.test) {
        this.logger.debug(
          `FORCED: ${job.attemptsMade}, ${job.data.contractId}`,
        );

        done(new Error('forced error'));
      } else {
        done();
      }
    } catch (error) {
      done(new Error(error));
      this.logger.error(
        `Error charching contract with ID: ${job.data.contractId}. ${error}`,
      );
    }
  }
}
