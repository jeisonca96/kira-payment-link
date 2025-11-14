import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
  TransactionStatus,
} from '../schemas/transaction.schema';
import { CustomLoggerService } from '../../core-services/logger/custom-logger.service';

@Injectable()
export class TransactionService {
  private readonly logger: Logger;

  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    private readonly customLoggerService: CustomLoggerService,
  ) {
    this.logger = this.customLoggerService.createLogger(
      TransactionService.name,
    );
  }

  async countCompletedTransactionsByEmail(email: string): Promise<number> {
    if (!email) {
      return 0;
    }

    const count = await this.transactionModel
      .countDocuments({
        customerEmail: email,
        status: TransactionStatus.PAID,
      })
      .exec();

    this.logger.debug(`Transaction count for ${email}: ${count}`);
    return count;
  }
}
