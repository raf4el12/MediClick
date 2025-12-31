import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { LoggingService } from '../logging/logging.service';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    let errors = null;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errors = null;
      } else if (typeof exceptionResponse === 'object') {
        errors = (exceptionResponse as any).errors || null;
      }
    }

    const errorType = exception.constructor.name;

    const isClientError = status >= 400 && status < 500;
    const logLevel = isClientError ? 'warn' : 'error';
    const logMessage = isClientError
      ? `Advertencia [${errorType}]: ${message}`
      : `Error [${errorType}]: ${message}`;

    if (isClientError) {
      this.loggingService.warn(logMessage, {
        method: request.method,
        statusCode: status,
        url: request.url,
        ip: request.ip,
        responseTime: Date.now() - request.startTime,
        userAgent: request.headers['user-agent'],
        context: AllExceptionsFilter.name,
        errors,
      });
    } else {
      this.loggingService.error(logMessage, {
        method: request.method,
        statusCode: status,
        url: request.url,
        ip: request.ip,
        responseTime: Date.now() - request.startTime,
        userAgent: request.headers['user-agent'],
        context: AllExceptionsFilter.name,
        trace: (exception as Error).stack,
        errors,
      });
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      url: request.url,
      message,
      errors,
    });
  }
}
