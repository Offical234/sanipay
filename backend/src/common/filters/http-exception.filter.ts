import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ERROR_CODES } from '../constants';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected internal server error occurred';
    let errorCode: string = ERROR_CODES.INTERNAL_SERVER_ERROR;
    let errors: Array<{ field: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, any>;
        message = obj.message || obj.error || message;

        if (Array.isArray(obj.message)) {
          errorCode = ERROR_CODES.VALIDATION_ERROR;
          message = 'Validation failed';
          errors = obj.message.map((msg: string) => {
            const parts = msg.split(' ');
            return {
              field: parts[0] || 'field',
              message: msg,
            };
          });
        }
      }

      switch (status) {
        case HttpStatus.BAD_REQUEST:
          errorCode =
            errorCode === ERROR_CODES.VALIDATION_ERROR
              ? errorCode
              : ERROR_CODES.VALIDATION_ERROR;
          break;
        case HttpStatus.UNAUTHORIZED:
          errorCode = ERROR_CODES.UNAUTHORIZED;
          break;
        case HttpStatus.FORBIDDEN:
          errorCode = ERROR_CODES.FORBIDDEN;
          break;
        case HttpStatus.NOT_FOUND:
          errorCode = ERROR_CODES.NOT_FOUND;
          break;
        case HttpStatus.CONFLICT:
          errorCode = ERROR_CODES.CONFLICT;
          break;
      }
    } else {
      this.logger.error('Unhandled exception:', exception);
    }

    response.status(status).json({
      success: false,
      message,
      errorCode,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
