import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionResponseDto {
  @ApiProperty({
    description: 'MongoDB ID of the transaction',
    example: 'tx_88888888',
  })
  transactionId: string;

  @ApiProperty({
    description: 'Transaction status',
    example: 'COMPLETED',
    enum: ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'],
  })
  status: string;

  @ApiProperty({
    description: 'Amount charged in cents',
    example: 10550,
  })
  amountCharged: number;

  @ApiProperty({
    description: 'Currency of the transaction',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'PSP external reference ID',
    example: 'ch_stripe_abc123',
  })
  pspReference: string;

  @ApiProperty({
    description: 'PSP provider that processed the payment',
    example: 'STRIPE',
    enum: ['STRIPE', 'ADYEN'],
  })
  pspProvider: string;

  @ApiPropertyOptional({
    description: 'Failure reason if the transaction failed',
    example: null,
  })
  failureReason?: string;
}
