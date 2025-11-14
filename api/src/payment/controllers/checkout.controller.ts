import {
  Controller,
  Post,
  Param,
  Body,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { FeeCalculatorService } from '../services/fee-calculator.service';
import { ObjectIdValidationPipe } from '../../core-services/pipes/object-id-validation.pipe';
import { GetQuoteDto } from '../dtos/get-quote.dto';
import { QuoteResponseDto } from '../dtos/quote-response.dto';
import { ApiGetQuote } from '../apidocs/checkout.apidoc';
import { ApiTagsEnum } from 'src/constants';

@ApiTags(ApiTagsEnum.Checkout)
@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly feeCalculatorService: FeeCalculatorService,
  ) {}

  @Post(':linkId/quote')
  @HttpCode(HttpStatus.OK)
  @ApiGetQuote()
  async getQuote(
    @Param('linkId', ObjectIdValidationPipe) linkId: string,
    @Body() getQuoteDto: GetQuoteDto,
  ): Promise<QuoteResponseDto> {
    const paymentLink = await this.paymentService.getPaymentLinkById(linkId);

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
}
