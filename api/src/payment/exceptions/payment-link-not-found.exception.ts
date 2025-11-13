import { NotFoundException } from '@nestjs/common';

export class PaymentLinkNotFoundException extends NotFoundException {
  constructor(linkId: string) {
    super({
      statusCode: 404,
      error: 'Not Found',
      message: `Payment link with ID '${linkId}' not found`,
      errorCode: 'PAYMENT_LINK_NOT_FOUND',
    });
  }
}
