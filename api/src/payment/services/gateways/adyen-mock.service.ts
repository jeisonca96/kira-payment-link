import { Injectable, Logger } from '@nestjs/common';
import {
  IPaymentGateway,
  PspChargeRequest,
  PspChargeResponse,
} from '../../interfaces/payment-gateway.interface';
import { CustomLoggerService } from '../../../core-services/logger/custom-logger.service';
import { PspNetworkException } from '../../exceptions';

@Injectable()
export class AdyenMockService implements IPaymentGateway {
  private readonly logger: Logger;

  constructor(private readonly customLoggerService: CustomLoggerService) {
    this.logger = this.customLoggerService.createLogger(AdyenMockService.name);
  }

  getName(): string {
    return 'ADYEN';
  }

  async charge(request: PspChargeRequest): Promise<PspChargeResponse> {
    this.logger.debug(
      `[ADYEN MOCK] Processing charge: amount=${request.amountInCents}, token=${request.token}`,
    );

    // Simulate network latency with jitter
    const delay = 150 + Math.random() * 350; // 150-500ms
    await this.sleep(delay);

    // Simulate different scenarios based on token
    if (request.token === 'tok_visa_success') {
      return this.successResponse(request);
    }

    if (request.token === 'tok_card_declined') {
      return this.declinedResponse();
    }

    if (request.token === 'tok_network_error') {
      throw new PspNetworkException('ADYEN', 'Connection timeout');
    }

    // Adyen has better reliability - only 5% random failure rate
    if (Math.random() < 0.05) {
      throw new PspNetworkException('ADYEN', 'Service temporarily unavailable');
    }

    return this.successResponse(request);
  }

  private successResponse(request: PspChargeRequest): PspChargeResponse {
    const reference = `adyen_${this.generateRandomId()}`;
    this.logger.log(`[ADYEN MOCK] Charge successful: ${reference}`);

    return {
      success: true,
      reference,
      status: 'COMPLETED',
      rawResponse: {
        pspReference: reference,
        amount: {
          value: request.amountInCents,
          currency: request.currency,
        },
        resultCode: 'Authorised',
        merchantReference: request.idempotencyKey,
      },
    };
  }

  private declinedResponse(): PspChargeResponse {
    const reference = `adyen_${this.generateRandomId()}`;
    this.logger.warn(`[ADYEN MOCK] Card declined: ${reference}`);

    return {
      success: false,
      reference,
      status: 'DECLINED',
      errorMessage: 'Transaction declined by issuer',
      rawResponse: {
        pspReference: reference,
        resultCode: 'Refused',
        refusalReason: 'Transaction declined by issuer',
      },
    };
  }

  private generateRandomId(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
