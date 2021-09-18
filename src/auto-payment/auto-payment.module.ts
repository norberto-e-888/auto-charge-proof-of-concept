import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Contract, ContractSchema } from 'src/models/contract.model';
import { Employment, EmploymentSchema } from 'src/models/employment.model';
import { User, UserSchema } from 'src/models/user.model';
import { AutoPaymentService } from './auto-payment.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Employment.name, schema: EmploymentSchema },
    ]),
  ],
  providers: [AutoPaymentService],
})
export class AutoPaymentModule {}
