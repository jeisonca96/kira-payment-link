import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { QuoteResponseDto } from '../dtos/quote-response.dto';
import { GetQuoteDto } from '../dtos/get-quote.dto';
import { ApiErrorResponseDto } from '../../core-services/exceptions/dtos/api-error-response.dto';

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
      description: 'Invalid payment link ID format',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Payment link not found',
      type: ApiErrorResponseDto,
    }),
  );
}
