import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  id: true,
  timestamps: true,
})
export class User {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({
    type: String,
    required: true,
  })
  firstName: string;

  @Prop({
    type: String,
    required: true,
  })
  lastName: string;

  @Prop({
    type: String,
  })
  stripeReference: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
