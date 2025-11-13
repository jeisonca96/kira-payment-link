import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  CustomLoggerService,
  CustomLogger,
} from '../../logger/custom-logger.service';

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private logger: CustomLogger;

  constructor(private readonly customLoggerService: CustomLoggerService) {
    this.logger = this.customLoggerService.createLogger(
      GlobalExceptionFilter.name,
    );
  }

  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const url = request.url;
    const method = request.method;
    const traceId = request['traceId'] || 'no-trace-id';

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      const errorResponse = {
        statusCode: status,
        message: this.getErrorMessage(exception),
        error: this.getErrorName(exception),
      };
      this.logger.error(
        `[${traceId}] Internal Server Error: ${url} ${method} - ${errorResponse.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );

      response.status(status).json(errorResponse);
    } else {
      response.status(status).json(exception.getResponse());
    }
  }

  private getErrorMessage(exception: any): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      return typeof response === 'object' && 'message' in response
        ? Array.isArray(response['message'])
          ? response['message'].join(', ')
          : String(response['message'])
        : exception.message;
    }
    return exception?.message || 'Internal Server Error';
  }

  private getErrorName(exception: any): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      return typeof response === 'object' && 'error' in response
        ? String(response['error'])
        : HttpStatus[exception.getStatus()];
    }
    if (exception?.name) {
      return exception.name;
    }
    return 'Internal Server Error';
  }
}
