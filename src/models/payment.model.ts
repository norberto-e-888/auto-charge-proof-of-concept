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

export enum PaymentStatus {
  Success = 'success',
  Failure = 'failure',
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
    type: String,
    enum: Object.values(PaymentStatus),
    required: true,
  })
  status: PaymentStatus;

  @Prop({
    type: Number,
    required: true,
    min: 0.01,
  })
  amount: number;

  @Prop({
    type: PaymentType,
    required: true,
    enum: Object.values(PaymentType),
  })
  type: PaymentType;

  @Prop({
    type: String,
    unique: true,
    required: function (this: PaymentDocument) {
      return this.status === PaymentStatus.Success;
    },
    set: function (this: PaymentDocument, val: string) {
      if (this.status !== PaymentStatus.Success) {
        return null;
      }

      return val;
    },
  })
  stripeReference: string;

  @Prop({
    type: String,
    unique: true,
    required: function (this: PaymentDocument) {
      return this.type === PaymentType.Auto;
    },
    set: function (this: PaymentDocument, val: string) {
      if (this.type !== PaymentType.Auto) {
        return null;
      }

      return val;
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
