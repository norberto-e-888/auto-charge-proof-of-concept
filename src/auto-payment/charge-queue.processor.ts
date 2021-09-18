import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { DoneCallback, Job } from 'bull';
import { AutoPaymentQueue, ChargeQueueData } from './typings';

@Processor(AutoPaymentQueue.Charge)
export class ChargeQueueProcessor {
  private readonly logger = new Logger(ChargeQueueProcessor.name);

  @Process()
  charge(job: Job<ChargeQueueData>, done: DoneCallback) {
    try {
      this.logger.debug(
        `Processing payment for contract: ${job.data.contractId}`,
      );

      done();
    } catch (error) {
      done(new Error(error));
      this.logger.error(
        `Error charching contract with ID: ${job.data.contractId}. ${error}`,
      );
    }
  }
}
