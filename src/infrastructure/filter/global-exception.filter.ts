import { red } from 'chalk';
import { Observable, throwError } from 'rxjs';
import { inspect } from 'util';

import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';

import { LoggerService } from '@infrastructure/logger/services/logger.service';

import MESSAGES from '@helpers/messages/http-messages';

const LOG_PREFIX = red('Response/Error');

function getHttpExceptionMessage(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'object') {
    if ('message' in response) {
      if (typeof response.message === 'string') return response.message;
      if (
        Array.isArray(response.message) &&
        response.message.every((message) => typeof message === 'string')
      )
        return response.message.join('\n');
    }
  }

  if (typeof response === 'string') return response;
  return exception.message;
}

@Catch()
export class GlobalExceptionFilter extends BaseRpcExceptionFilter {
  private readonly logger: LoggerService;

  constructor(logger: LoggerService) {
    super();
    this.logger = logger;
  }

  returnError(error: Error): Observable<never> {
    this.logger.error(
      LOG_PREFIX + ' ' + error.message,
      this.constructor.name,
      error.stack ?? String(error),
    );
    return throwError(
      () =>
        new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: MESSAGES.CONTACT_ADMIN,
        }),
    );
  }

  catch(exception: unknown): Observable<void> {
    if (exception instanceof Error) {
      if (exception instanceof HttpException) {
        const statusCode = exception.getStatus();
        const message = getHttpExceptionMessage(exception);
        this.logger.error(
          LOG_PREFIX + ' ' + JSON.stringify({ statusCode, message }),
          this.constructor.name,
          exception.message,
        );
        return throwError(() => new RpcException({ statusCode, message }));
      } else {
        return this.returnError(
          new Error(`Unexpected internal error, ${inspect(exception)}`),
        );
      }
    } else if (exception instanceof Object) {
      const { message, error } = exception as {
        message?: string;
        error: { message: string; statusCode: number };
      };
      const errMsg = message ?? MESSAGES.CONTACT_ADMIN;
      const errStatusCode = error.statusCode ?? 500;
      this.logger.error(
        LOG_PREFIX +
          ' ' +
          JSON.stringify({ statusCode: errStatusCode, message: errMsg }),
        this.constructor.name,
      );
      throw new RpcException({ statusCode: errStatusCode, message: errMsg });
    } else {
      // This should never happen: it means that the exception itself is not a JS error; we rethrow it as an unexcepted error type
      return this.returnError(
        new Error(`Unexpected error type, ${inspect(exception)}`),
      );
    }
  }
}
