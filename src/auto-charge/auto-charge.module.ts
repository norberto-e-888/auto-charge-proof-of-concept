import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StripeProvider } from 'src/lib/stripe';
import { Contract, ContractSchema } from 'src/models/contract.model';
import { Employment, EmploymentSchema } from 'src/models/employment.model';
import { Payment, PaymentSchema } from 'src/models/payment.model';
import { User, UserSchema } from 'src/models/user.model';
import { AutoChargeTrigger } from './auto-charge-trigger.service';
import { ChargeDLQProcessor } from './charge-dlq.processor';
import { ChargeQueueProcessor } from './charge-queue.processor';
import { AutoChargeQueue } from './typings';
import { WriteChargesToQueueProcessor } from './write-charges-to-queue.processor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Employment.name, schema: EmploymentSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    BullModule.registerQueue(
      {
        name: AutoChargeQueue.WriteChargesToQueue,
      },
      {
        name: AutoChargeQueue.Charge,
      },
      {
        name: AutoChargeQueue.ChargeDLQ,
      },
    ),
  ],
  providers: [
    StripeProvider,
    AutoChargeTrigger,
    WriteChargesToQueueProcessor,
    ChargeQueueProcessor,
    ChargeDLQProcessor,
  ],
  exports: [BullModule],
})
export class AutoChargeModule {}
