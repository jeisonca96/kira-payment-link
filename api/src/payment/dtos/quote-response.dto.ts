import { ApiProperty } from '@nestjs/swagger';
import { Currency } from './create-payment-link.dto';

export enum FeeType {
  FIXED_FEE = 'FIXED_FEE',
  PERCENTAGE_FEE = 'PERCENTAGE_FEE',
  FX_MARKUP = 'FX_MARKUP',
}

export class FeeBreakdownItem {
  @ApiProperty({
    description: 'Type of fee applied',
    enum: FeeType,
    example: FeeType.FIXED_FEE,
  })
  type: FeeType;

  @ApiProperty({
    description: 'Fee amount in cents',
    example: 30,
  })
  amount: number;

  @ApiProperty({
    description: 'Human-readable description of the fee',
    example: 'Processing Fee',
  })
  description: string;
}

export class FeesDetail {
  @ApiProperty({
    description: 'Total fees charged in cents',
    example: 550,
  })
  totalFees: number;

  @ApiProperty({
    description: 'Detailed breakdown of all fees applied',
    type: [FeeBreakdownItem],
  })
  breakdown: FeeBreakdownItem[];
}

export class QuoteResponseDto {
  @ApiProperty({
    description: 'Payment link unique identifier',
    example: '655a1b2c3d4e5f6a7b8c9d0e',
  })
  linkId: string;

  @ApiProperty({
    description: 'Currency of the transaction',
    enum: Currency,
    example: Currency.USD,
  })
  currency: Currency;

  @ApiProperty({
    description: 'Base amount requested by the merchant in cents',
    example: 10000,
  })
  baseAmount: number;

  @ApiProperty({
    description:
      'Total amount to be charged to the card in cents (base + fees)',
    example: 10550,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Amount the merchant will receive in MXN cents',
    example: 200000,
  })
  destinationAmountMxn: number;

  @ApiProperty({
    description: 'Exchange rate used for conversion (1 USD = X MXN)',
    example: 20.0,
  })
  fxRate: number;

  @ApiProperty({
    description: 'Detailed fee information',
    type: FeesDetail,
  })
  fees: FeesDetail;
}
