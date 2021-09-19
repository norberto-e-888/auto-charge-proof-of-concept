import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Queue } from 'bull';
import { AutoChargeQueue, WriteChargesToQueueData } from './typings';

@Injectable()
export class AutoChargeTrigger {
  private readonly logger = new Logger(AutoChargeTrigger.name);

  constructor(
    @InjectQueue(AutoChargeQueue.WriteChargesToQueue)
    private readonly writeChargesQueue: Queue<WriteChargesToQueueData>,
  ) {}

  @Interval(60000)
  async initiateAutoCharge() {
    try {
      const present = new Date();
      const month = present.getMonth() + 1; // adding 1 to count from 1 instead of 0
      const year = present.getFullYear();
      this.logger.debug(`Initiating auto-charge for: ${month}/${year}`);
      await this.writeChargesQueue.add(
        {
          month,
          year,
        },
        {
          attempts: 10,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      );
    } catch (error) {
      this.logger.error(`Error running "initiateAutoCharge": ${error}`);
    }
  }
}
