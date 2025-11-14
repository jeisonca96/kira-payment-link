import { BadRequestException } from '@nestjs/common';

export class PaymentLinkNotActiveException extends BadRequestException {
  constructor(linkId: string, currentStatus: string) {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message: `Payment link is not active. Current status: ${currentStatus}`,
      errorCode: 'PAYMENT_LINK_NOT_ACTIVE',
      details: {
        linkId,
        currentStatus,
        allowedStatus: 'ACTIVE',
      },
    });
  }
}
