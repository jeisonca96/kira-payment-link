import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  PaymentLink,
  PaymentLinkDocument,
  PaymentLinkStatus,
} from '../schemas/payment-link.schema';
import { CreatePaymentLinkDto } from '../dtos/create-payment-link.dto';
import { PaymentLinkResponseDto } from '../dtos/payment-link-response.dto';
import { PaymentLinkNotFoundException } from '../exceptions/payment-link-not-found.exception';
import { CustomLoggerService } from '../../core-services/logger/custom-logger.service';

@Injectable()
export class PaymentService {
  private readonly checkoutBaseUrl: string;
  private readonly logger: Logger;

  constructor(
    @InjectModel(PaymentLink.name)
    private readonly paymentLinkModel: Model<PaymentLinkDocument>,
    private readonly configService: ConfigService,
    private readonly customLoggerService: CustomLoggerService,
  ) {
    this.logger = this.customLoggerService.createLogger(PaymentService.name);
    this.checkoutBaseUrl = this.configService.get<string>('CHECKOUT_BASE_URL');
  }

  async createPaymentLink(
    dto: CreatePaymentLinkDto,
  ): Promise<PaymentLinkResponseDto> {
    this.logger.debug(
      `Creating payment link for merchant ${dto.merchantId} with amount ${dto.amountInCents} cents`,
    );

    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 3600000); // 1 hour in milliseconds

    const paymentLink = new this.paymentLinkModel({
      merchantId: dto.merchantId,
      amountInCents: dto.amountInCents,
      currency: dto.currency,
      description: dto.description,
      expiresAt,
    });

    const savedLink = await paymentLink.save();
    this.logger.log(
      `Payment link created successfully with ID ${savedLink._id}, expires at ${expiresAt.toISOString()}`,
    );
    return this.toResponseDto(savedLink);
  }

  async getPaymentLinkById(id: string): Promise<PaymentLinkResponseDto> {
    this.logger.debug(`Fetching payment link with ID ${id}`);

    const paymentLink = await this.paymentLinkModel.findById(id).exec();

    if (!paymentLink) {
      this.logger.warn(`Payment link with ID ${id} not found`);
      throw new PaymentLinkNotFoundException(id);
    }

    // Check if link has expired and update status
    if (
      paymentLink.status === PaymentLinkStatus.ACTIVE &&
      paymentLink.expiresAt &&
      paymentLink.expiresAt < new Date()
    ) {
      this.logger.debug(`Payment link ${id} has expired, updating status`);
      paymentLink.status = PaymentLinkStatus.EXPIRED;
      await paymentLink.save();
    }

    this.logger.debug(`Payment link ${id} retrieved successfully`);
    return this.toResponseDto(paymentLink);
  }

  private toResponseDto(
    paymentLink: PaymentLinkDocument,
  ): PaymentLinkResponseDto {
    return {
      id: paymentLink._id.toString(),
      url: `${this.checkoutBaseUrl}/${paymentLink._id.toString()}`,
      status: paymentLink.status,
      amountInCents: paymentLink.amountInCents,
      currency: paymentLink.currency,
      description: paymentLink.description,
      createdAt: paymentLink.createdAt.toISOString(),
      expiresAt: paymentLink.expiresAt?.toISOString(),
    };
  }
}
