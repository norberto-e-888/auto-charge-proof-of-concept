import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class AutoPaymentService {
  private readonly logger = new Logger(AutoPaymentService.name);

  @Interval(5000)
  writeAutoPaymentsToMessageQueue() {
    this.logger.debug('I run every 5 seconds');
  }
}
