import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiServiceUnavailableResponse,
  ApiHeader,
  ApiExtraModels,
} from '@nestjs/swagger';
import { QuoteResponseDto } from '../dtos/quote-response.dto';
import { GetQuoteDto } from '../dtos/get-quote.dto';
import { ProcessPaymentDto } from '../dtos/process-payment.dto';
import { TransactionResponseDto } from '../dtos/transaction-response.dto';
import { ApiErrorResponseDto } from '../../core-services/exceptions/dtos/api-error-response.dto';
import {
  IdempotencyKeyMissingException,
  PaymentLinkNotFoundException,
  PaymentLinkNotActiveException,
  CardDeclinedException,
  PspGatewayException,
  PspNetworkException,
  PaymentProcessingFailedException,
} from '../exceptions';

export function ApiGetQuote() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get payment quote with fee breakdown',
      description: `
Calculates the total amount the payer will be charged, including all fees and FX markup.
This endpoint should be called before payment to show the user a preview of charges.

**Fee Calculation Chain:**
1. Fixed Fee: $0.30 processing fee
2. Percentage Fee: 2.9% of base amount (card network fee)
3. FX Markup: 1.5% spread on currency conversion

**FX Rate Caching:**
- Exchange rates are cached in Redis for 5 minutes
- Simulates real FX provider with ±2% variation
- Base rate: 1 USD = 20 MXN

**Future Enhancements:**
- Support for "First 3 Free" incentives based on customer email
- Dynamic fee profiles per merchant
      `.trim(),
    }),
    ApiParam({
      name: 'linkId',
      description: 'Payment link unique identifier (MongoDB ObjectId)',
      example: '655a1b2c3d4e5f6a7b8c9d0e',
      type: String,
    }),
    ApiBody({
      type: GetQuoteDto,
      description: 'Optional customer information for incentive validation',
    }),
    ApiResponse({
      status: 200,
      description: 'Fee quote calculated successfully',
      type: QuoteResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Invalid payment link ID format or payment link not active',
      type: ApiErrorResponseDto,
      examples: {
        paymentLinkNotActive: {
          summary: 'Payment link is not in ACTIVE status',
          value: new PaymentLinkNotActiveException(
            '655a1b2c3d4e5f6a7b8c9d0e',
            'PAID',
          ).getResponse(),
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Payment link not found',
      type: ApiErrorResponseDto,
      examples: {
        paymentLinkNotFound: {
          summary: 'Payment link does not exist',
          value: new PaymentLinkNotFoundException(
            '655a1b2c3d4e5f6a7b8c9d0e',
          ).getResponse(),
        },
      },
    }),
  );
}

export function ApiProcessPayment() {
  return applyDecorators(
    ApiExtraModels(ApiErrorResponseDto),
    ApiOperation({
      summary: 'Process payment with PSP orchestration and ACID ledger',
      description: `
Executes the payment using the PSP Orchestrator with automatic failover:

**PSP Orchestration (Strategy Pattern):**
1. **Primary Gateway:** Stripe Mock
   - Simulates network latency (100-500ms)
   - 10% random failure rate for resilience testing
   - Supports different tokens for testing scenarios
2. **Automatic Failover:** Adyen Mock
   - Activated when Stripe fails or throws error
   - 5% random failure rate (better reliability)
   - Provides redundancy for high availability

**Payment Flow (Webhook-Driven):**
1. Payment request is submitted to PSP
2. Transaction is created with status **PROCESSING**
3. Response 200 OK is returned immediately
4. PSP processes payment asynchronously
5. PSP sends webhook to update transaction status
6. Webhook updates transaction to **PAID** or **FAILED**
7. Payment link status is updated accordingly

**ACID Transaction Guarantees:**
- Uses MongoDB multi-document transactions
- Atomically creates Transaction record AND updates PaymentLink status
- Automatic rollback on any error
- Ensures financial data integrity

**Token Scenarios (for testing):**
- \`tok_visa_success\`: Successful payment
- \`tok_card_declined\`: Card declined by issuer
- \`tok_network_error\`: Triggers network timeout
- Any other token: 90% success / 10% random failure (Stripe)

**Idempotency:**
- Idempotency-Key header is **required** to prevent duplicate charges
- Should be a unique UUID per payment attempt

**Error Codes:**
- \`IDEMPOTENCY_KEY_MISSING\`: Missing required Idempotency-Key header
- \`PAYMENT_LINK_NOT_FOUND\`: Payment link does not exist or invalid ID
- \`PAYMENT_LINK_NOT_ACTIVE\`: Payment link is not in ACTIVE status (PROCESSING, PAID, EXPIRED, or CANCELLED)
- \`CARD_DECLINED\`: Card was declined by the issuing bank
- \`PSP_GATEWAY_ERROR\`: Payment gateway returned an error
- \`PSP_NETWORK_ERROR\`: Network error communicating with PSP
- \`PAYMENT_PROCESSING_FAILED\`: All payment providers failed
      `.trim(),
    }),
    ApiParam({
      name: 'linkId',
      description: 'Payment link unique identifier (MongoDB ObjectId)',
      example: '655a1b2c3d4e5f6a7b8c9d0e',
      type: String,
    }),
    ApiHeader({
      name: 'Idempotency-Key',
      description:
        'Unique identifier to ensure idempotent payment processing (UUID)',
      required: true,
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiBody({
      type: ProcessPaymentDto,
      description: 'Payment details including PSP token and customer email',
    }),
    ApiResponse({
      status: 200,
      description:
        'Payment submitted successfully (status: PROCESSING, awaiting webhook confirmation)',
      type: TransactionResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Bad Request - Invalid input, missing idempotency key, payment link not active, payment already processing, card declined, gateway error, or payment processing failed',
      type: ApiErrorResponseDto,
      examples: {
        idempotencyKeyMissing: {
          summary: 'Missing required Idempotency-Key header',
          value: new IdempotencyKeyMissingException().getResponse(),
        },
        paymentLinkNotActive: {
          summary: 'Payment link is not in ACTIVE status',
          value: new PaymentLinkNotActiveException(
            '655a1b2c3d4e5f6a7b8c9d0e',
            'PAID',
          ).getResponse(),
        },
        cardDeclined: {
          summary: 'Card was declined by issuing bank',
          value: new CardDeclinedException().getResponse(),
        },
        pspGatewayError: {
          summary: 'Payment gateway returned an error',
          value: new PspGatewayException(
            'STRIPE',
            'DECLINED',
            'Your card was declined',
          ).getResponse(),
        },
        paymentProcessingFailed: {
          summary: 'All payment providers failed',
          value: new PaymentProcessingFailedException(
            'STRIPE network timeout',
            'ADYEN network timeout',
          ).getResponse(),
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Payment link not found',
      type: ApiErrorResponseDto,
      examples: {
        paymentLinkNotFound: {
          summary: 'Payment link does not exist',
          value: new PaymentLinkNotFoundException(
            '655a1b2c3d4e5f6a7b8c9d0e',
          ).getResponse(),
        },
      },
    }),
    ApiServiceUnavailableResponse({
      description:
        'Payment service provider temporarily unavailable (triggers automatic failover to secondary gateway)',
      type: ApiErrorResponseDto,
      examples: {
        pspNetworkError: {
          summary: 'PSP network error or service unavailable',
          value: new PspNetworkException(
            'STRIPE',
            'Connection timeout',
          ).getResponse(),
        },
      },
    }),
  );
}
