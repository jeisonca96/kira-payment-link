import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiBadRequestResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { StripeWebhookDto } from '../dtos/stripe-webhook.dto';
import { AdyenWebhookDto } from '../dtos/adyen-webhook.dto';

export function ApiWebhook() {
  return applyDecorators(
    ApiExtraModels(StripeWebhookDto, AdyenWebhookDto),
    ApiOperation({
      summary: 'Receive webhook from PSP to update transaction status',
      description: `
Receives webhook notifications from payment service providers (PSPs) to update transaction status.

**Supported Providers:**
- \`stripe\`: Stripe payment gateway webhooks
- \`adyen\`: Adyen payment gateway webhooks

**Webhook Flow:**
1. PSP sends webhook notification to this endpoint
2. Payload is parsed based on provider format
3. Transaction is looked up by ID or PSP reference
4. Transaction status is updated (PROCESSING → PAID/FAILED)
5. Payment link status is updated if transaction is PAID
6. Response 202 Accepted is returned immediately

**Transaction Status Updates:**
- \`succeeded\`, \`success\`, \`authorisation\`, \`capture\` → **PAID**
- \`failed\`, \`declined\`, \`error\` → **FAILED**
- \`processing\`, \`pending\` → **PROCESSING**
- \`canceled\`, \`cancellation\` → **CANCELLED**

**Stripe Webhook Format:**
\`\`\`json
{
  "data": {
    "object": {
      "id": "ch_stripe_abc123",
      "status": "succeeded",
      "metadata": {
        "transactionId": "674b123456789abcdef12345"
      }
    }
  }
}
\`\`\`

**Adyen Webhook Format:**
\`\`\`json
{
  "notificationItems": [{
    "NotificationRequestItem": {
      "eventCode": "AUTHORISATION",
      "success": "true",
      "merchantReference": "674b123456789abcdef12345",
      "pspReference": "8515131751004933"
    }
  }]
}
\`\`\`

**ACID Guarantees:**
- Uses MongoDB transactions to atomically update Transaction and PaymentLink
- Ensures data consistency even if webhook is received multiple times
      `.trim(),
    }),
    ApiParam({
      name: 'provider',
      description: 'Payment service provider name (stripe or adyen)',
      example: 'stripe',
      enum: ['stripe', 'adyen'],
    }),
    ApiBody({
      description: 'Webhook payload from PSP (format varies by provider)',
      schema: {
        oneOf: [
          { $ref: getSchemaPath(StripeWebhookDto) },
          { $ref: getSchemaPath(AdyenWebhookDto) },
        ],
      },
      examples: {
        stripeSuccess: {
          summary: 'Stripe - Payment Succeeded',
          value: {
            data: {
              object: {
                id: 'ch_stripe_abc123xyz',
                status: 'succeeded',
                amount: 10550,
                currency: 'usd',
                metadata: {
                  transactionId: '674b123456789abcdef12345',
                },
              },
            },
          },
        },
        stripeFailed: {
          summary: 'Stripe - Payment Failed',
          value: {
            data: {
              object: {
                id: 'ch_stripe_declined123',
                status: 'failed',
                failure_message: 'Your card was declined',
                metadata: {
                  transactionId: '674b987654321fedcba98765',
                },
              },
            },
          },
        },
        adyenSuccess: {
          summary: 'Adyen - Payment Authorised',
          value: {
            notificationItems: [
              {
                NotificationRequestItem: {
                  eventCode: 'AUTHORISATION',
                  success: 'true',
                  merchantReference: '674b123456789abcdef12345',
                  pspReference: '8515131751004933',
                  amount: {
                    value: 10550,
                    currency: 'USD',
                  },
                },
              },
            ],
          },
        },
      },
    }),
    ApiResponse({
      status: 202,
      description: 'Webhook accepted and processed successfully',
      schema: {
        type: 'object',
        properties: {
          accepted: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Webhook from stripe processed successfully',
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid provider or malformed webhook payload',
      schema: {
        type: 'object',
        properties: {
          statusCode: {
            type: 'number',
            example: 400,
          },
          message: {
            type: 'string',
            example:
              'Invalid provider: invalid. Supported providers: STRIPE, ADYEN',
          },
          error: {
            type: 'string',
            example: 'Bad Request',
          },
        },
      },
    }),
  );
}
