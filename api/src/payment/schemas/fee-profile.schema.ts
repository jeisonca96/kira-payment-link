import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FeeProfileDocument = FeeProfile & Document;

export enum FeeRuleType {
  FIXED_FEE = 'FIXED_FEE',
  PERCENTAGE_FEE = 'PERCENTAGE_FEE',
}

export enum IncentiveType {
  FIRST_N_TRANSACTIONS = 'FIRST_N_TRANSACTIONS',
}

@Schema({ _id: false })
export class FeeRuleConfig {
  @Prop({ type: Number })
  amountInCents?: number;

  @Prop({ type: String, maxlength: 200 })
  description?: string;

  @Prop({ type: Number, min: 0, max: 1 })
  rate?: number;
}

export const FeeRuleConfigSchema = SchemaFactory.createForClass(FeeRuleConfig);

@Schema({ _id: false })
export class FeeRule {
  @Prop({
    required: true,
    type: String,
    enum: FeeRuleType,
  })
  type: FeeRuleType;

  @Prop({
    required: true,
    type: FeeRuleConfigSchema,
  })
  config: FeeRuleConfig;
}

export const FeeRuleSchema = SchemaFactory.createForClass(FeeRule);

@Schema({ _id: false })
export class IncentiveConfig {
  @Prop({ type: Number, min: 1 })
  n?: number;

  @Prop({ type: Number, min: 0, max: 1 })
  discountPercentage?: number;
}

export const IncentiveConfigSchema =
  SchemaFactory.createForClass(IncentiveConfig);

@Schema({ _id: false })
export class Incentive {
  @Prop({
    required: true,
    type: String,
    enum: IncentiveType,
  })
  type: IncentiveType;

  @Prop({
    required: true,
    type: IncentiveConfigSchema,
  })
  config: IncentiveConfig;
}

export const IncentiveSchema = SchemaFactory.createForClass(Incentive);

@Schema({
  timestamps: true,
  collection: 'fee_profiles',
})
export class FeeProfile {
  @Prop({
    required: true,
    unique: true,
    index: true,
    type: String,
    maxlength: 100,
  })
  profileId: string;

  @Prop({
    required: true,
    type: [FeeRuleSchema],
  })
  rules: FeeRule[];

  @Prop({
    type: [IncentiveSchema],
    default: [],
  })
  incentives: Incentive[];

  createdAt: Date;

  updatedAt: Date;
}

export const FeeProfileSchema = SchemaFactory.createForClass(FeeProfile);

FeeProfileSchema.index({ profileId: 1 }, { unique: true });
