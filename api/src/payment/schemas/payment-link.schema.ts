import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentLinkDocument = PaymentLink & Document;

export enum PaymentLinkStatus {
  ACTIVE = 'ACTIVE',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum Currency {
  USD = 'USD',
  MXN = 'MXN',
}

@Schema({
  timestamps: true,
  collection: 'payment_links',
})
export class PaymentLink {
  @Prop({
    required: true,
    index: true,
    type: String,
    maxlength: 100,
  })
  merchantId: string;

  @Prop({
    required: true,
    type: Number,
    min: 1,
  })
  amountInCents: number;

  @Prop({
    required: true,
    enum: Currency,
    type: String,
  })
  currency: Currency;

  @Prop({
    required: true,
    type: String,
    maxlength: 500,
  })
  description: string;

  @Prop({
    required: true,
    enum: PaymentLinkStatus,
    default: PaymentLinkStatus.ACTIVE,
    index: true,
    type: String,
  })
  status: PaymentLinkStatus;

  @Prop({
    type: Date,
    index: true,
    required: true,
  })
  expiresAt: Date;

  @Prop({
    type: Date,
  })
  paidAt?: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const PaymentLinkSchema = SchemaFactory.createForClass(PaymentLink);

PaymentLinkSchema.index({ merchantId: 1, createdAt: -1 });
PaymentLinkSchema.index({ status: 1, expiresAt: 1 });
PaymentLinkSchema.index({ merchantId: 1, status: 1 });
