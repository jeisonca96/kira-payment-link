import { Injectable, Logger } from '@nestjs/common';
import { CustomLoggerService } from '../../core-services/logger/custom-logger.service';
import { LedgerService } from './ledger.service';
import { PSPProvider, TransactionStatus } from '../schemas/transaction.schema';

export interface WebhookProcessResult {
  transactionId: string;
  previousStatus: TransactionStatus;
  newStatus: TransactionStatus;
  provider: PSPProvider;
  processed: boolean;
}

@Injectable()
export class WebhookService {
  private readonly logger: Logger;

  constructor(
    private readonly ledgerService: LedgerService,
    private readonly customLoggerService: CustomLoggerService,
  ) {
    this.logger = this.customLoggerService.createLogger(WebhookService.name);
  }

  async processWebhook(
    provider: PSPProvider,
    payload: Record<string, any>,
  ): Promise<WebhookProcessResult> {
    this.logger.log(
      `[WEBHOOK] Processing ${provider} webhook: ${JSON.stringify(payload)}`,
    );

    const { transactionId, status, pspReference } = this.parseWebhookPayload(
      provider,
      payload,
    );

    this.logger.debug(
      `[WEBHOOK] Parsed data - TransactionId: ${transactionId}, Status: ${status}, PSP Ref: ${pspReference}`,
    );

    const newStatus = this.mapWebhookStatusToTransactionStatus(status);

    const failureReason =
      newStatus === TransactionStatus.FAILED
        ? this.extractFailureReason(payload)
        : undefined;

    // Update transaction in ledger (with ACID guarantees)
    const updatedTransaction = await this.ledgerService.updateTransaction({
      transactionId,
      status: newStatus,
      pspProvider: provider,
      pspReference,
      pspRawResponse: payload,
      failureReason,
    });

    this.logger.log(
      `[WEBHOOK] Transaction ${transactionId} updated from ${updatedTransaction.status} to ${newStatus}`,
    );

    return {
      transactionId,
      previousStatus: updatedTransaction.status,
      newStatus,
      provider,
      processed: true,
    };
  }

  private parseWebhookPayload(
    provider: PSPProvider,
    payload: Record<string, any>,
  ): { transactionId: string; status: string; pspReference: string } {
    if (provider === PSPProvider.STRIPE) {
      // Stripe webhook format
      const object = payload.data?.object || payload.object || {};
      return {
        transactionId:
          object.metadata?.transactionId || object.metadata?.tx_id || object.id,
        status: object.status || 'unknown',
        pspReference: object.id || 'unknown',
      };
    } else if (provider === PSPProvider.ADYEN) {
      // Adyen webhook format
      const notificationItem =
        payload.notificationItems?.[0]?.NotificationRequestItem ||
        payload.data?.object ||
        {};
      return {
        transactionId:
          notificationItem.merchantReference ||
          notificationItem.metadata?.transactionId ||
          'unknown',
        status:
          notificationItem.eventCode || notificationItem.status || 'unknown',
        pspReference:
          notificationItem.pspReference || notificationItem.id || 'unknown',
      };
    }

    const object = payload.data?.object || {};
    return {
      transactionId: object.metadata?.transactionId || object.id || 'unknown',
      status: object.status || 'unknown',
      pspReference: object.id || 'unknown',
    };
  }

  private mapWebhookStatusToTransactionStatus(
    pspStatus: string,
  ): TransactionStatus {
    const normalizedStatus = pspStatus.toLowerCase();

    switch (normalizedStatus) {
      case 'succeeded':
      case 'success':
      case 'authorisation':
      case 'capture':
      case 'completed':
        return TransactionStatus.PAID;

      case 'failed':
      case 'failure':
      case 'declined':
      case 'error':
        return TransactionStatus.FAILED;

      case 'processing':
      case 'pending':
        return TransactionStatus.PROCESSING;

      case 'canceled':
      case 'cancelled':
      case 'cancellation':
      case 'cancel_or_refund':
        return TransactionStatus.CANCELLED;

      default:
        this.logger.warn(
          `[WEBHOOK] Unknown PSP status: ${pspStatus}, defaulting to PROCESSING`,
        );
        return TransactionStatus.PROCESSING;
    }
  }

  private extractFailureReason(payload: Record<string, any>): string {
    const object = payload.data?.object || payload.object || {};

    return (
      object.failure_message ||
      object.decline_code ||
      object.error_message ||
      object.reason ||
      'Payment failed'
    );
  }
}
