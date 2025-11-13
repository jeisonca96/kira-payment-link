import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentLinkResponseDto } from '../dtos/payment-link-response.dto';

export function ApiCreatePaymentLink() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create Payment Link',
      description:
        'Merchant creates a new payment link for a specific amount in USD. ' +
        'Returns a unique URL that can be shared with payers.',
    }),
    ApiResponse({
      status: 201,
      description: 'Payment link successfully created',
      type: PaymentLinkResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input data',
      schema: {
        example: {
          statusCode: 400,
          message: ['amountInCents must be at least 1 cent'],
          error: 'Bad Request',
        },
      },
    }),
  );
}

export function ApiGetPaymentLink() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get Payment Link Details',
      description:
        'Retrieve details of a payment link by ID. ' +
        'Used by the frontend to load checkout page information.',
    }),
    ApiResponse({
      status: 200,
      description: 'Payment link details retrieved successfully',
      type: PaymentLinkResponseDto,
    }),
    ApiResponse({
      status: 422,
      description: 'Invalid MongoDB ObjectId format',
      schema: {
        example: {
          message: 'Invalid ID format',
          code: 'INVALID_ID_FORMAT',
          statusCode: 422,
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: 'Payment link not found',
      schema: {
        example: {
          statusCode: 404,
          error: 'Not Found',
          message: "Payment link with ID '655a1b2c3d4e5f6a7b8c9d0e' not found",
          errorCode: 'PAYMENT_LINK_NOT_FOUND',
        },
      },
    }),
  );
}
