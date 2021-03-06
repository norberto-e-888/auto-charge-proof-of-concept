import { HttpException, HttpStatus } from '@nestjs/common';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HookNextFunction, Model, Types } from 'mongoose';
import { Contract, ContractDocument } from './contract.model';
import { User } from './user.model';

export type EmploymentDocument = Employment & Document;

@Schema({
  id: true,
  timestamps: true,
})
export class Employment {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({
    type: Types.ObjectId,
    required: true,
    unique: true,
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
  })
  salary: number;
}

export const EmploymentSchema = SchemaFactory.createForClass(Employment);

EmploymentSchema.pre(
  'save',
  async function (this: EmploymentDocument, next: HookNextFunction) {
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
          `This employment cannot be assigned to any other user but the one related to the contract with ID: ${this.contract} `,
          HttpStatus.BAD_REQUEST,
        ),
      );
    }

    next();
  },
);
