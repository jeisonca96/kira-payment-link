import { BadRequestException } from '@nestjs/common';

export class PspGatewayException extends BadRequestException {
  constructor(gatewayName: string, status: string, errorMessage?: string) {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message: errorMessage || `Payment failed with ${gatewayName}`,
      errorCode: 'PSP_GATEWAY_ERROR',
      details: {
        gateway: gatewayName,
        status,
        reason: errorMessage,
      },
    });
  }
}
