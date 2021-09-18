import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class AutoPaymentsService {
  private readonly logger = new Logger(AutoPaymentsService.name);

  @Interval(5000)
  writeAutoPaymentsToMessageQueue() {
    this.logger.debug('I run every 5 seconds');
  }
}
