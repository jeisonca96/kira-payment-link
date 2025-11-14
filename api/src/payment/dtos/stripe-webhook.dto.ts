import { IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StripeWebhookDto {
  @ApiProperty({
    description: 'Stripe webhook event data',
    example: {
      object: {
        id: 'ch_stripe_abc123',
        status: 'succeeded',
        amount: 10550,
        currency: 'usd',
        metadata: {
          transactionId: '674b123456789abcdef12345',
        },
        failure_message: null,
      },
    },
  })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;
}
