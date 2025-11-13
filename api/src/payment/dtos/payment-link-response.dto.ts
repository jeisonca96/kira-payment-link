import { ApiProperty } from '@nestjs/swagger';
import { PaymentLinkStatus } from '../schemas/payment-link.schema';
import { Currency } from './create-payment-link.dto';

export class PaymentLinkResponseDto {
  @ApiProperty({
    description: 'Payment link unique identifier (MongoDB ObjectId)',
    example: '655a1b2c3d4e5f6a7b8c9d0e',
  })
  id: string;

  @ApiProperty({
    description: 'Full checkout URL for the payer',
    example: 'https://checkout.kira.com/pay/655a1b2c3d4e5f6a7b8c9d0e',
  })
  url: string;

  @ApiProperty({
    description: 'Current status of the payment link',
    enum: PaymentLinkStatus,
    example: PaymentLinkStatus.ACTIVE,
  })
  status: PaymentLinkStatus;

  @ApiProperty({
    description: 'Amount in cents',
    example: 10000,
  })
  amountInCents: number;

  @ApiProperty({
    description: 'Currency of the payment',
    enum: Currency,
    example: Currency.USD,
  })
  currency: Currency;

  @ApiProperty({
    description: 'Payment description',
    example: 'Freelance Web Development Service',
  })
  description: string;

  @ApiProperty({
    description: 'Creation timestamp in ISO 8601 format',
    example: '2025-11-13T09:00:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Expiration timestamp in ISO 8601 format (if set)',
    example: '2025-12-31T23:59:59Z',
    required: false,
  })
  expiresAt?: string;
}
