import { Injectable, Logger } from '@nestjs/common';
import { IPaymentGateway } from '../interfaces/payment-gateway.interface';
import { LedgerService, CreateTransactionData } from './ledger.service';
import { StripeMockService } from './gateways/stripe-mock.service';
import { AdyenMockService } from './gateways/adyen-mock.service';
import { CustomLoggerService } from '../../core-services/logger/custom-logger.service';
import { PSPProvider, Transaction } from '../schemas/transaction.schema';
import { TransactionResponseDto } from '../dtos/transaction-response.dto';
import {
  PaymentProcessingFailedException,
  PspGatewayException,
} from '../exceptions';

export interface PaymentRequest {
  linkId: string;
  token: string;
  customerEmail: string;
  amountInCents: number;
  currency: string;
  description: string;
  feeBreakdown: any;
  fxRate: number;
  destinationAmountMxn: number;
  idempotencyKey?: string;
}

@Injectable()
export class PspOrchestratorService {
  private readonly logger: Logger;
  private readonly primaryGateway: IPaymentGateway;
  private readonly secondaryGateway: IPaymentGateway;

  constructor(
    private readonly stripeMock: StripeMockService,
    private readonly adyenMock: AdyenMockService,
    private readonly ledgerService: LedgerService,
    private readonly customLoggerService: CustomLoggerService,
  ) {
    this.logger = this.customLoggerService.createLogger(
      PspOrchestratorService.name,
    );

    this.primaryGateway = this.stripeMock;
    this.secondaryGateway = this.adyenMock;
  }

  async executeCharge(
    request: PaymentRequest,
  ): Promise<TransactionResponseDto> {
    this.logger.log(
      `[ORCHESTRATOR] Starting payment for link ${request.linkId} with amount ${request.amountInCents}`,
    );

    let transaction: Transaction;

    try {
      transaction = await this.attemptCharge(
        this.primaryGateway,
        request,
        PSPProvider.STRIPE,
      );

      this.logger.log(
        `[ORCHESTRATOR] Payment successful with primary gateway (STRIPE)`,
      );
    } catch (primaryError) {
      this.logger.warn(
        `[ORCHESTRATOR] Primary gateway (STRIPE) failed: ${primaryError.message}. Attempting failover...`,
      );

      try {
        transaction = await this.attemptCharge(
          this.secondaryGateway,
          request,
          PSPProvider.ADYEN,
        );

        this.logger.log(
          `[ORCHESTRATOR] Payment successful with secondary gateway (ADYEN) after failover`,
        );
      } catch (secondaryError) {
        this.logger.error(
          `[ORCHESTRATOR] Both gateways failed. Primary: ${primaryError.message}, Secondary: ${secondaryError.message}`,
        );

        throw new PaymentProcessingFailedException(
          primaryError.message,
          secondaryError.message,
        );
      }
    }

    return this.toTransactionResponseDto(transaction);
  }

  private async attemptCharge(
    gateway: IPaymentGateway,
    request: PaymentRequest,
    provider: PSPProvider,
  ): Promise<Transaction> {
    this.logger.debug(
      `[ORCHESTRATOR] Attempting charge with ${gateway.getName()}`,
    );

    const pspResponse = await gateway.charge({
      token: request.token,
      amountInCents: request.amountInCents,
      currency: request.currency,
      customerEmail: request.customerEmail,
      description: request.description,
      idempotencyKey: request.idempotencyKey,
    });

    this.logger.debug(
      `[ORCHESTRATOR] PSP response: success=${pspResponse.success}, status=${pspResponse.status}, ref=${pspResponse.reference}`,
    );

    const transactionData: CreateTransactionData = {
      paymentLinkId: request.linkId,
      amountInCents: request.amountInCents,
      customerEmail: request.customerEmail,
      feeBreakdown: request.feeBreakdown,
      fxRate: request.fxRate,
      destinationAmountMxn: request.destinationAmountMxn,
      token: request.token,
    };

    const transaction = await this.ledgerService.recordTransaction(
      transactionData,
      pspResponse,
      provider,
    );

    if (!pspResponse.success) {
      throw new PspGatewayException(
        gateway.getName(),
        pspResponse.status,
        pspResponse.errorMessage,
      );
    }

    return transaction;
  }

  private toTransactionResponseDto(transaction: any): TransactionResponseDto {
    return {
      transactionId: transaction._id.toString(),
      status: transaction.status,
      amountCharged: transaction.amountInCents,
      currency: 'USD', // Based on schema
      pspReference: transaction.pspMetadata?.reference || '',
      pspProvider: transaction.pspMetadata?.provider || '',
      failureReason: transaction.failureReason,
    };
  }
}
