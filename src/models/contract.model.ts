import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.model';

export type ContractDocument = Contract & Document;

@Schema({
  id: true,
})
export class Contract {
  @Prop({
    type: Types.ObjectId,
    required: true,
    ref: User.name,
  })
  user: User;

  @Prop({
    type: Number,
    required: true,
    min: 500,
  })
  effectiveLoanAmount: number;

  @Prop({
    type: Number,
    required: true,
    min: 0,
    max: 1,
  })
  salaryPercentageOwed: number;

  @Prop({
    type: Number,
    required: true,
  })
  minimumIncomeThreshold: number;
}

export const ContractSchema = SchemaFactory.createForClass(Contract);