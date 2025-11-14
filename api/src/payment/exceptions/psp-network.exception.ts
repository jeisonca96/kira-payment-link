import { ServiceUnavailableException } from '@nestjs/common';

export class PspNetworkException extends ServiceUnavailableException {
  constructor(gatewayName: string, originalError: string) {
    super({
      statusCode: 503,
      error: 'Service Unavailable',
      message: `${gatewayName} payment gateway is temporarily unavailable`,
      errorCode: 'PSP_NETWORK_ERROR',
      details: {
        gateway: gatewayName,
        originalError,
      },
    });
  }
}
