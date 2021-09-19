import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DoneCallback, Job, Queue } from 'bull';
import { Model } from 'mongoose';
import { Contract } from 'src/models/contract.model';
import { Employment, EmploymentDocument } from 'src/models/employment.model';
import {
  AddBulkPayload,
  AutoChargeQueue,
  ChargeQueueData,
  WriteChargesToQueueData,
} from './typings';

@Processor(AutoChargeQueue.WriteChargesToQueue)
export class WriteChargesToQueueProcessor {
  private readonly logger = new Logger(WriteChargesToQueueProcessor.name);

  constructor(
    @InjectQueue(AutoChargeQueue.Charge)
    private readonly chargeQueue: Queue<ChargeQueueData>,
    @InjectModel(Employment.name)
    private readonly employmentModel: Model<EmploymentDocument>,
  ) {}

  @Process()
  async writeAutoCharges(
    job: Job<WriteChargesToQueueData>,
    done: DoneCallback,
  ) {
    try {
      const { month, year } = job.data;
      this.logger.debug(`Writing auto-charges to queue for: ${month}/${year}`);
      const employments = await this.employmentModel
        .find()
        .populate('contract');

      const employmentsThatSurpassMinimumThreshold = employments.filter(
        ({ salary, contract }) => {
          const { minimumIncomeThreshold } = contract as Contract;
          return salary >= minimumIncomeThreshold;
        },
      );

      const chargeQueueData: AddBulkPayload<ChargeQueueData> =
        employmentsThatSurpassMinimumThreshold.map(({ contract, salary }) => {
          const { id, effectiveLoanAmount, salaryPercentageOwed } =
            contract as Contract;

          return {
            data: {
              contractId: id,
              effectiveLoanAmount,
              salary,
              salaryPercentageOwed,
              month,
              year,
            },
            opts: {
              attempts: 5,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
            },
          };
        });

      await this.chargeQueue.addBulk(chargeQueueData);
      done();
    } catch (error) {
      done(new Error(error));
      this.logger.error(
        `Error writing charges to queue for: ${job.data.month}/${job.data.year}. ${error}`,
      );
    }
  }
}
