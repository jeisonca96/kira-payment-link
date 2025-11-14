import { BadRequestException } from '@nestjs/common';

export class PaymentProcessingFailedException extends BadRequestException {
  constructor(primaryError: string, secondaryError: string) {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message:
        'Payment processing failed with all available payment providers. Please try again later.',
      errorCode: 'PAYMENT_PROCESSING_FAILED',
      details: {
        primaryGatewayError: primaryError,
        secondaryGatewayError: secondaryError,
      },
    });
  }
}
