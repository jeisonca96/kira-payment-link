import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  IsISO8601,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum Currency {
  USD = 'USD',
  MXN = 'MXN',
}

export class CreatePaymentLinkDto {
  @ApiProperty({
    description: 'Merchant unique identifier',
    example: 'mer_123456789',
    maxLength: 100,
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  merchantId: string;

  @ApiProperty({
    description: 'Amount to charge in cents (e.g., 10000 = $100.00 USD)',
    example: 10000,
    minimum: 1,
    required: true,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1, { message: 'Amount must be at least 1 cent' })
  @Type(() => Number)
  amountInCents: number;

  @ApiProperty({
    description: 'Currency of the payment',
    enum: Currency,
    example: Currency.USD,
    required: true,
  })
  @IsNotEmpty()
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({
    description: 'Description of the payment',
    example: 'Freelance Web Development Service',
    maxLength: 500,
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({
    description: 'Expiration date in ISO 8601 format',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
