import { IsNotEmpty, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdyenWebhookDto {
  @ApiProperty({
    description: 'Adyen webhook notification items',
    example: [
      {
        NotificationRequestItem: {
          eventCode: 'AUTHORISATION',
          success: 'true',
          merchantReference: '674b123456789abcdef12345',
          pspReference: '8515131751004933',
          amount: {
            value: 10550,
            currency: 'USD',
          },
        },
      },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  notificationItems: Array<Record<string, any>>;
}
