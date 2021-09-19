import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression /* Interval */ } from '@nestjs/schedule';
import { Queue } from 'bull';
import { AutoChargeQueue, WriteChargesToQueueData } from './typings';

@Injectable()
export class AutoChargeTrigger {
  private readonly logger = new Logger(AutoChargeTrigger.name);

  constructor(
    @InjectQueue(AutoChargeQueue.WriteChargesToQueue)
    private readonly writeChargesQueue: Queue<WriteChargesToQueueData>,
  ) {}

  // @Interval(60000) Uncomment this and comment out @Cron for testing purposes
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async initiateAutoCharge() {
    try {
      const present = new Date();
      const month = present.getMonth() + 1;
      const year = present.getFullYear();
      this.logger.debug(`Initiating auto-charge for: ${month}/${year}`);
      await this.writeChargesQueue.add(
        {
          month,
          year,
        },
        {
          attempts: 5,
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
