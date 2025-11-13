import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentLinkDto } from '../dtos/create-payment-link.dto';
import { PaymentLinkResponseDto } from '../dtos/payment-link-response.dto';
import { ObjectIdValidationPipe } from '../../core-services/pipes/object-id-validation.pipe';
import {
  ApiCreatePaymentLink,
  ApiGetPaymentLink,
} from '../apidocs/merchant.apidoc';
import { ApiTagsEnum } from 'src/constants';
import { ApiTags } from '@nestjs/swagger';

@ApiTags(ApiTagsEnum.Merchant)
@Controller(ApiTagsEnum.Merchant)
export class MerchantController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('links')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatePaymentLink()
  async createPaymentLink(
    @Body() createPaymentLinkDto: CreatePaymentLinkDto,
  ): Promise<PaymentLinkResponseDto> {
    return this.paymentService.createPaymentLink(createPaymentLinkDto);
  }

  @Get('links/:id')
  @HttpCode(HttpStatus.OK)
  @ApiGetPaymentLink()
  async getPaymentLink(
    @Param('id', ObjectIdValidationPipe) id: string,
  ): Promise<PaymentLinkResponseDto> {
    return this.paymentService.getPaymentLinkById(id);
  }
}
