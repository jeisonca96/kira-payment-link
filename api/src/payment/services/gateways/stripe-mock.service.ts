import { Injectable, Logger } from '@nestjs/common';
import {
  IPaymentGateway,
  PspChargeRequest,
  PspChargeResponse,
} from '../../interfaces/payment-gateway.interface';
import { CustomLoggerService } from '../../../core-services/logger/custom-logger.service';
import { PspNetworkException } from '../../exceptions';

@Injectable()
export class StripeMockService implements IPaymentGateway {
  private readonly logger: Logger;

  constructor(private readonly customLoggerService: CustomLoggerService) {
    this.logger = this.customLoggerService.createLogger(StripeMockService.name);
  }

  getName(): string {
    return 'STRIPE';
  }

  async charge(request: PspChargeRequest): Promise<PspChargeResponse> {
    this.logger.debug(
      `[STRIPE MOCK] Processing charge: amount=${request.amountInCents}, token=${request.token}`,
    );

    // Simulate network latency with jitter
    const delay = 100 + Math.random() * 400; // 100-500ms
    await this.sleep(delay);

    // Simulate different scenarios based on token
    if (request.token === 'tok_visa_success') {
      return this.successResponse(request);
    }

    if (request.token === 'tok_card_declined') {
      return this.declinedResponse();
    }

    if (request.token === 'tok_network_error') {
      throw new PspNetworkException('STRIPE', 'Connection timeout');
    }

    // Random failure (50% chance)
    if (Math.random() < 0.5) {
      throw new PspNetworkException(
        'STRIPE',
        'Service temporarily unavailable',
      );
    }

    return this.successResponse(request);
  }

  private successResponse(request: PspChargeRequest): PspChargeResponse {
    const reference = `ch_stripe_${this.generateRandomId()}`;
    this.logger.log(`[STRIPE MOCK] Charge successful: ${reference}`);

    return {
      success: true,
      reference,
      status: 'COMPLETED',
      rawResponse: {
        id: reference,
        amount: request.amountInCents,
        currency: request.currency,
        status: 'succeeded',
        customer: request.customerEmail,
      },
    };
  }

  private declinedResponse(): PspChargeResponse {
    const reference = `ch_stripe_${this.generateRandomId()}`;
    this.logger.warn(`[STRIPE MOCK] Card declined: ${reference}`);

    return {
      success: false,
      reference,
      status: 'DECLINED',
      errorMessage: 'Your card was declined',
      rawResponse: {
        id: reference,
        status: 'failed',
        failure_code: 'card_declined',
        failure_message: 'Your card was declined',
      },
    };
  }

  private generateRandomId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
