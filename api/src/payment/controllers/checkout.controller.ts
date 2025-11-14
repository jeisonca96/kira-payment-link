import {
  Controller,
  Post,
  Param,
  Body,
  HttpStatus,
  HttpCode,
  Headers,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { FeeCalculatorService } from '../services/fee-calculator.service';
import { PspOrchestratorService } from '../services/psp-orchestrator.service';
import { ObjectIdValidationPipe } from '../../core-services/pipes/object-id-validation.pipe';
import { GetQuoteDto } from '../dtos/get-quote.dto';
import { ProcessPaymentDto } from '../dtos/process-payment.dto';
import { QuoteResponseDto } from '../dtos/quote-response.dto';
import { TransactionResponseDto } from '../dtos/transaction-response.dto';
import { ApiGetQuote, ApiProcessPayment } from '../apidocs/checkout.apidoc';
import { ApiTagsEnum } from 'src/constants';
import {
  IdempotencyKeyMissingException,
  PaymentLinkNotActiveException,
} from '../exceptions';
import { PaymentLinkStatus } from '../schemas/payment-link.schema';

@ApiTags(ApiTagsEnum.Checkout)
@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly feeCalculatorService: FeeCalculatorService,
    private readonly pspOrchestrator: PspOrchestratorService,
  ) {}

  @Post(':linkId/quote')
  @HttpCode(HttpStatus.OK)
  @ApiGetQuote()
  async getQuote(
    @Param('linkId', ObjectIdValidationPipe) linkId: string,
    @Body() getQuoteDto: GetQuoteDto,
  ): Promise<QuoteResponseDto> {
    const paymentLink = await this.paymentService.getPaymentLinkById(linkId);

    if (paymentLink.status !== PaymentLinkStatus.ACTIVE) {
      throw new PaymentLinkNotActiveException(linkId, paymentLink.status);
    }

    const feeCalculation = await this.feeCalculatorService.calculateFees(
      paymentLink.amountInCents,
      getQuoteDto.customerEmail,
    );

    return {
      linkId: paymentLink.id,
      currency: paymentLink.currency,
      baseAmount: feeCalculation.baseAmount,
      totalAmount: feeCalculation.totalAmount,
      destinationAmountMxn: feeCalculation.destinationAmountMxn,
      fxRate: feeCalculation.fxRate,
      fees: feeCalculation.fees,
    };
  }

  @Post(':linkId/pay')
  @HttpCode(HttpStatus.OK)
  @ApiProcessPayment()
  async processPayment(
    @Param('linkId', ObjectIdValidationPipe) linkId: string,
    @Body() processPaymentDto: ProcessPaymentDto,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ): Promise<TransactionResponseDto> {
    if (!idempotencyKey) {
      throw new IdempotencyKeyMissingException();
    }

    const paymentLink = await this.paymentService.getPaymentLinkById(linkId);

    if (paymentLink.status !== PaymentLinkStatus.ACTIVE) {
      throw new PaymentLinkNotActiveException(linkId, paymentLink.status);
    }

    const feeCalculation = await this.feeCalculatorService.calculateFees(
      paymentLink.amountInCents,
      processPaymentDto.customerEmail,
    );

    const transaction = await this.pspOrchestrator.executeCharge({
      linkId,
      token: processPaymentDto.token,
      customerEmail: processPaymentDto.customerEmail,
      amountInCents: feeCalculation.totalAmount,
      currency: paymentLink.currency,
      description: paymentLink.description,
      feeBreakdown: feeCalculation.fees,
      fxRate: feeCalculation.fxRate,
      destinationAmountMxn: feeCalculation.destinationAmountMxn,
      idempotencyKey,
    });

    return transaction;
  }
}
