import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional } from 'class-validator';

export class GetQuoteDto {
  @ApiPropertyOptional({
    description:
      'Customer email for validating incentive rules like "First 3 Free"',
    example: 'cliente@ejemplo.com',
  })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;
}
