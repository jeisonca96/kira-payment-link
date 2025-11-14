import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum PSPProvider {
  STRIPE = 'STRIPE',
  ADYEN = 'ADYEN',
}

@Schema({ _id: false })
export class PSPMetadata {
  @Prop({ type: String, enum: PSPProvider })
  provider?: PSPProvider;

  @Prop({ type: String })
  reference?: string;

  @Prop({ type: String })
  token?: string;

  @Prop({ type: Object })
  rawResponse?: Record<string, any>;
}

export const PSPMetadataSchema = SchemaFactory.createForClass(PSPMetadata);

@Schema({
  timestamps: true,
  collection: 'transactions',
})
export class Transaction {
  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'PaymentLink',
    index: true,
  })
  paymentLinkId: Types.ObjectId;

  @Prop({
    required: true,
    type: Number,
    min: 1,
  })
  amountInCents: number;

  @Prop({
    required: true,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
    index: true,
    type: String,
  })
  status: TransactionStatus;

  @Prop({
    type: String,
    index: true,
  })
  customerEmail?: string;

  @Prop({
    type: Object,
    required: true,
  })
  feeBreakdown: {
    totalFees: number;
    breakdown: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
  };

  @Prop({
    type: Number,
    required: true,
  })
  fxRate: number;

  @Prop({
    type: Number,
    required: true,
  })
  destinationAmountMxn: number;

  @Prop({
    type: PSPMetadataSchema,
  })
  pspMetadata?: PSPMetadata;

  @Prop({
    type: String,
  })
  failureReason?: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ paymentLinkId: 1, status: 1 });
TransactionSchema.index({ customerEmail: 1, status: 1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({
  'pspMetadata.provider': 1,
  'pspMetadata.reference': 1,
});
