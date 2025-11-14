import { BadRequestException } from '@nestjs/common';

export class IdempotencyKeyMissingException extends BadRequestException {
  constructor() {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Idempotency-Key header is required for payment processing',
      errorCode: 'IDEMPOTENCY_KEY_MISSING',
    });
  }
}
