import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, ClientSession } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
  TransactionStatus,
  PSPProvider,
} from '../schemas/transaction.schema';
import {
  PaymentLink,
  PaymentLinkDocument,
  PaymentLinkStatus,
} from '../schemas/payment-link.schema';
import { CustomLoggerService } from '../../core-services/logger/custom-logger.service';
import { PspChargeResponse } from '../interfaces/payment-gateway.interface';

export interface CreateTransactionData {
  paymentLinkId: string;
  amountInCents: number;
  customerEmail: string;
  feeBreakdown: {
    totalFees: number;
    breakdown: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
  };
  fxRate: number;
  destinationAmountMxn: number;
  token: string;
}

export interface UpdateTransactionData {
  transactionId: string;
  status: TransactionStatus;
  pspProvider: PSPProvider;
  pspReference: string;
  pspRawResponse?: Record<string, any>;
  failureReason?: string;
}

@Injectable()
export class LedgerService {
  private readonly logger: Logger;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(PaymentLink.name)
    private readonly paymentLinkModel: Model<PaymentLinkDocument>,
    private readonly customLoggerService: CustomLoggerService,
  ) {
    this.logger = this.customLoggerService.createLogger(LedgerService.name);
  }

  async recordTransaction(
    data: CreateTransactionData,
    pspResponse: PspChargeResponse,
    pspProvider: PSPProvider,
  ): Promise<Transaction> {
    const supportsTransactions = await this.supportsTransactions();

    // PROD
    if (supportsTransactions) {
      return this.recordTransactionWithACID(data, pspResponse, pspProvider);
    } else {
      // NON-PROD
      this.logger.warn(
        `[NO-ACID] MongoDB replica set not detected. Using non-transactional mode.`,
      );
      return this.recordTransactionWithoutACID(data, pspResponse, pspProvider);
    }
  }

  private async recordTransactionWithACID(
    data: CreateTransactionData,
    pspResponse: PspChargeResponse,
    pspProvider: PSPProvider,
  ): Promise<Transaction> {
    const session: ClientSession = await this.connection.startSession();

    try {
      session.startTransaction();

      this.logger.debug(
        `[ACID] Starting transaction for payment link ${data.paymentLinkId}`,
      );

      const transaction = new this.transactionModel({
        paymentLinkId: data.paymentLinkId,
        amountInCents: data.amountInCents,
        status: this.mapPspStatusToTransactionStatus(pspResponse.status),
        customerEmail: data.customerEmail,
        feeBreakdown: data.feeBreakdown,
        fxRate: data.fxRate,
        destinationAmountMxn: data.destinationAmountMxn,
        pspMetadata: {
          provider: pspProvider,
          reference: pspResponse.reference,
          token: data.token,
          rawResponse: pspResponse.rawResponse,
        },
        failureReason: pspResponse.errorMessage,
      });

      const savedTransaction = await transaction.save({ session });

      if (savedTransaction.status === TransactionStatus.PROCESSING) {
        await this.paymentLinkModel
          .findByIdAndUpdate(
            data.paymentLinkId,
            {
              status: PaymentLinkStatus.PROCESSING,
            },
            { session },
          )
          .exec();

        this.logger.log(
          `[ACID] Payment link ${data.paymentLinkId} marked as PROCESSING`,
        );
      } else {
        this.logger.log(
          `[ACID] Payment link ${data.paymentLinkId} remains ACTIVE due to transaction status: ${savedTransaction.status}`,
        );
      }

      await session.commitTransaction();
      this.logger.log(
        `[ACID] Transaction committed successfully: ${savedTransaction._id}`,
      );

      return savedTransaction;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `[ACID] Transaction aborted for payment link ${data.paymentLinkId}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async recordTransactionWithoutACID(
    data: CreateTransactionData,
    pspResponse: PspChargeResponse,
    pspProvider: PSPProvider,
  ): Promise<Transaction> {
    try {
      this.logger.debug(
        `[NO-ACID] Recording transaction for payment link ${data.paymentLinkId}`,
      );

      const transaction = new this.transactionModel({
        paymentLinkId: data.paymentLinkId,
        amountInCents: data.amountInCents,
        status: this.mapPspStatusToTransactionStatus(pspResponse.status),
        customerEmail: data.customerEmail,
        feeBreakdown: data.feeBreakdown,
        fxRate: data.fxRate,
        destinationAmountMxn: data.destinationAmountMxn,
        pspMetadata: {
          provider: pspProvider,
          reference: pspResponse.reference,
          token: data.token,
          rawResponse: pspResponse.rawResponse,
        },
        failureReason: pspResponse.errorMessage,
      });

      const savedTransaction = await transaction.save();

      if (savedTransaction.status === TransactionStatus.PROCESSING) {
        await this.paymentLinkModel
          .findByIdAndUpdate(data.paymentLinkId, {
            status: PaymentLinkStatus.PROCESSING,
          })
          .exec();

        this.logger.log(
          `[NO-ACID] Payment link ${data.paymentLinkId} marked as PROCESSING`,
        );
      } else {
        this.logger.log(
          `[NO-ACID] Payment link ${data.paymentLinkId} remains ACTIVE due to transaction status: ${savedTransaction.status}`,
        );
      }

      this.logger.log(
        `[NO-ACID] Transaction recorded successfully: ${savedTransaction._id}`,
      );

      return savedTransaction;
    } catch (error) {
      this.logger.error(
        `[NO-ACID] Failed to record transaction for payment link ${data.paymentLinkId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async supportsTransactions(): Promise<boolean> {
    try {
      const admin = this.connection.db.admin();
      const serverInfo = await admin.serverStatus();

      const isReplicaSet = serverInfo.repl && serverInfo.repl.setName;

      return !!isReplicaSet;
    } catch (error) {
      this.logger.warn(
        `[TRANSACTION-CHECK] Failed to check replica set status: ${error.message}`,
      );
      return false;
    }
  }

  async updateTransaction(data: UpdateTransactionData): Promise<Transaction> {
    const supportsTransactions = await this.supportsTransactions();

    if (supportsTransactions) {
      return this.updateTransactionWithACID(data);
    } else {
      this.logger.warn(
        `[NO-ACID] MongoDB replica set not detected. Using non-transactional mode for update.`,
      );
      return this.updateTransactionWithoutACID(data);
    }
  }

  private async updateTransactionWithACID(
    data: UpdateTransactionData,
  ): Promise<Transaction> {
    const session: ClientSession = await this.connection.startSession();

    try {
      session.startTransaction();

      this.logger.debug(
        `[ACID] Updating transaction ${data.transactionId} to status ${data.status}`,
      );

      const transaction = await this.transactionModel
        .findByIdAndUpdate(
          data.transactionId,
          {
            status: data.status,
            'pspMetadata.provider': data.pspProvider,
            'pspMetadata.reference': data.pspReference,
            'pspMetadata.rawResponse': data.pspRawResponse,
            failureReason: data.failureReason,
          },
          { new: true, session },
        )
        .exec();

      if (!transaction) {
        throw new Error(`Transaction ${data.transactionId} not found`);
      }

      if (data.status === TransactionStatus.PAID) {
        await this.paymentLinkModel
          .findByIdAndUpdate(
            transaction.paymentLinkId,
            {
              status: PaymentLinkStatus.PAID,
              paidAt: new Date(),
            },
            { session },
          )
          .exec();

        this.logger.log(
          `[ACID] Payment link ${transaction.paymentLinkId} marked as PAID`,
        );
      } else if (data.status === TransactionStatus.FAILED) {
        await this.paymentLinkModel
          .findByIdAndUpdate(
            transaction.paymentLinkId,
            {
              status: PaymentLinkStatus.ACTIVE,
            },
            { session },
          )
          .exec();

        this.logger.log(
          `[ACID] Payment link ${transaction.paymentLinkId} reverted to ACTIVE after webhook failure`,
        );
      }

      await session.commitTransaction();
      this.logger.log(
        `[ACID] Transaction update committed: ${data.transactionId}`,
      );

      return transaction;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `[ACID] Transaction update aborted: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async updateTransactionWithoutACID(
    data: UpdateTransactionData,
  ): Promise<Transaction> {
    try {
      this.logger.debug(
        `[NO-ACID] Updating transaction ${data.transactionId} to status ${data.status}`,
      );

      const transaction = await this.transactionModel
        .findByIdAndUpdate(
          data.transactionId,
          {
            status: data.status,
            'pspMetadata.provider': data.pspProvider,
            'pspMetadata.reference': data.pspReference,
            'pspMetadata.rawResponse': data.pspRawResponse,
            failureReason: data.failureReason,
          },
          { new: true },
        )
        .exec();

      if (!transaction) {
        throw new Error(`Transaction ${data.transactionId} not found`);
      }

      if (data.status === TransactionStatus.PAID) {
        await this.paymentLinkModel
          .findByIdAndUpdate(transaction.paymentLinkId, {
            status: PaymentLinkStatus.PAID,
            paidAt: new Date(),
          })
          .exec();

        this.logger.log(
          `[NO-ACID] Payment link ${transaction.paymentLinkId} marked as PAID`,
        );
      } else if (data.status === TransactionStatus.FAILED) {
        await this.paymentLinkModel
          .findByIdAndUpdate(transaction.paymentLinkId, {
            status: PaymentLinkStatus.ACTIVE,
          })
          .exec();

        this.logger.log(
          `[NO-ACID] Payment link ${transaction.paymentLinkId} reverted to ACTIVE after webhook failure`,
        );
      }

      this.logger.log(
        `[NO-ACID] Transaction update completed: ${data.transactionId}`,
      );

      return transaction;
    } catch (error) {
      this.logger.error(
        `[NO-ACID] Transaction update failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private mapPspStatusToTransactionStatus(
    pspStatus: 'COMPLETED' | 'PENDING' | 'FAILED' | 'DECLINED',
  ): TransactionStatus {
    switch (pspStatus) {
      case 'COMPLETED':
        return TransactionStatus.PROCESSING;
      case 'PENDING':
        return TransactionStatus.PENDING;
      case 'FAILED':
      case 'DECLINED':
        return TransactionStatus.FAILED;
      default:
        return TransactionStatus.PENDING;
    }
  }
}
