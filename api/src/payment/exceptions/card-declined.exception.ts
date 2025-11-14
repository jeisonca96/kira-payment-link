import { BadRequestException } from '@nestjs/common';

export class CardDeclinedException extends BadRequestException {
  constructor(reason?: string) {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message: reason || 'Your card was declined by the issuing bank',
      errorCode: 'CARD_DECLINED',
      details: {
        reason: reason || 'Card declined',
        action:
          'Please try a different payment method or contact your bank for more information',
      },
    });
  }
}
