import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WebhookService } from '../services/webhook.service';
import { StripeWebhookDto } from '../dtos/stripe-webhook.dto';
import { AdyenWebhookDto } from '../dtos/adyen-webhook.dto';
import { PSPProvider } from '../schemas/transaction.schema';
import { ApiWebhook } from '../apidocs/webhook.apidoc';
import { ApiTagsEnum } from 'src/constants';

@ApiTags(ApiTagsEnum.Webhooks)
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post(':provider')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiWebhook()
  async receiveWebhook(
    @Param('provider') provider: string,
    @Body() webhookPayload: StripeWebhookDto | AdyenWebhookDto,
  ): Promise<{ accepted: boolean; message: string }> {
    const normalizedProvider = provider.toUpperCase();
    if (
      !Object.values(PSPProvider).includes(normalizedProvider as PSPProvider)
    ) {
      throw new BadRequestException(
        `Invalid provider: ${provider}. Supported providers: ${Object.values(PSPProvider).join(', ')}`,
      );
    }

    const payload = this.transformWebhookPayload(
      normalizedProvider as PSPProvider,
      webhookPayload,
    );

    await this.webhookService.processWebhook(
      normalizedProvider as PSPProvider,
      payload,
    );

    return {
      accepted: true,
      message: `Webhook from ${provider} processed successfully`,
    };
  }

  private transformWebhookPayload(
    provider: PSPProvider,
    webhookPayload: StripeWebhookDto | AdyenWebhookDto,
  ): any {
    let payload: Record<string, any>;

    if (provider === PSPProvider.STRIPE) {
      payload = (webhookPayload as StripeWebhookDto).data;
    } else if (provider === PSPProvider.ADYEN) {
      payload = {
        notificationItems: (webhookPayload as AdyenWebhookDto)
          .notificationItems,
      };
    } else {
      payload = webhookPayload as any;
    }

    return payload;
  }
}
