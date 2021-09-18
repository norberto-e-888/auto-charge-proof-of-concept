import { HttpException, HttpStatus } from '@nestjs/common';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HookNextFunction, Model, Types } from 'mongoose';
import { Contract, ContractDocument } from './contract.model';
import { User } from './user.model';

export type PaymentDocument = Payment & Document;

@Schema({
  id: true,
  timestamps: {
    createdAt: true,
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
  contract: Contract;

  @Prop({
    type: Types.ObjectId,
    required: true,
    ref: User.name,
  })
  user: User;

  @Prop({
    type: Number,
    required: true,
    min: 0.01,
  })
  amount: number;
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

    if (contract.user !== this.user) {
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

export enum PaymentType {}
