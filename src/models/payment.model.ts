import { HttpException, HttpStatus } from '@nestjs/common';
import {
  Prop,
  PropOptions,
  raw,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';
import { Document, HookNextFunction, Model, Types } from 'mongoose';
import { Contract, ContractDocument } from './contract.model';
import { User } from './user.model';

export type PaymentDocument = Payment & Document;
export enum PaymentType {
  Auto = 'auto',
  Manual = 'manual',
}

const ContractStateProp: { [key in keyof ContractStateSnapshot]: PropOptions } =
  {
    effectiveLoanAmount: { type: Number },
    salaryPercentageOwed: { type: Number },
    minimumIncomeThreshold: { type: Number },
    salary: { type: Number },
  };

@Schema({
  id: true,
  timestamps: {
    createdAt: true,
    updatedAt: false,
  },
})
export class Payment {
  id: string;
  createdAt: Date;

  @Prop({
    type: Types.ObjectId,
    required: true,
    ref: Contract.name,
  })
  contract: Contract | Types.ObjectId | string;

  @Prop({
    type: Types.ObjectId,
    required: true,
    ref: User.name,
  })
  user: User | Types.ObjectId | string;

  @Prop({
    type: Number,
    required: true,
    min: 0.01,
  })
  amount: number;

  @Prop({
    type: String,
    required: true,
    unique: true,
  })
  stripePaymentReference: string;

  @Prop({
    type: PaymentType,
    required: true,
    enum: Object.values(PaymentType),
  })
  type: PaymentType;

  @Prop({
    type: String,
    required: function (this: PaymentDocument) {
      return this.type === PaymentType.Auto;
    },
  })
  idempotencyKey: string;

  @Prop(raw(ContractStateProp))
  contractStateSnapshot: ContractStateSnapshot;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.pre(
  'save',
  async function (this: PaymentDocument, next: HookNextFunction) {
    const ContractModel: Model<ContractDocument> = this.db.model(Contract.name);
    const contract = await ContractModel.findById(this.contract);
    if (!contract) {
      next(
        new HttpException(
          `No contract exists with ID: ${this.contract}`,
          HttpStatus.BAD_REQUEST,
        ),
      );
    }

    if (
      !(contract.user as Types.ObjectId).equals(this.user as Types.ObjectId)
    ) {
      next(
        new HttpException(
          `This payment cannot be assigned to any other user but the one related to the contract with ID: ${this.contract} `,
          HttpStatus.BAD_REQUEST,
        ),
      );
    }

    next();
  },
);

export interface ContractStateSnapshot {
  effectiveLoanAmount: number;
  salaryPercentageOwed: number;
  minimumIncomeThreshold: number;
  salary: number;
}
