import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Interval } from '@nestjs/schedule';
import { JobOptions, Queue } from 'bull';
import { Model } from 'mongoose';
import { Employment, EmploymentDocument } from 'src/models/employment.model';
import { AutoPaymentQueue, ChargeQueueData } from './typings';

@Injectable()
export class AutoPaymentService {
  private readonly logger = new Logger(AutoPaymentService.name);

  constructor(
    @InjectQueue(AutoPaymentQueue.Charge)
    private chargeQueue: Queue,
    @InjectModel(Employment.name)
    private employmentModel: Model<EmploymentDocument>,
  ) {}

  @Interval(5000)
  async writeAutoPaymentsToMessageQueue() {
    try {
      this.logger.log('Running writeAutoPaymentsToMessageQueue');
      const employments = await this.employmentModel
        .find()
        .populate('contract');

      const employmentsThatSurpassMinimumThreshold = employments.filter(
        ({ salary, contract: { minimumIncomeThreshold } }) =>
          salary >= minimumIncomeThreshold,
      );

      const chargeQueueData: AddBulk<ChargeQueueData> =
        employmentsThatSurpassMinimumThreshold.map(
          ({
            contract: { id, effectiveLoanAmount, salaryPercentageOwed },
            salary,
          }) => ({
            data: {
              contractId: id,
              effectiveLoanAmount,
              salary,
              salaryPercentageOwed,
            },
            opts: {
              attempts: 5,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
            },
          }),
        );

      await this.chargeQueue.addBulk(chargeQueueData);
    } catch (error) {
      this.logger.error(
        'Error running "writeAutoPaymentsToMessageQueue"',
        error,
      );
    }
  }
}

type AddBulk<T> = {
  name?: string;
  data: T;
  opts?: JobOptions;
}[];
