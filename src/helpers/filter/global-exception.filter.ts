/* eslint-disable no-console */
import { red } from 'chalk';
import { Response } from 'express';
import { inspect } from 'util';

import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpServer,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

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
export class GlobalExceptionFilter extends BaseExceptionFilter {
  private readonly logger: LoggerService;

  constructor(httpAdapter: HttpServer, logger: LoggerService) {
    super(httpAdapter);
    this.logger = logger;
  }

  returnError(error: Error, response: Response) {
    this.logger.error(inspect(error), error.stack ?? String(error), 'LogError');

    console.log(LOG_PREFIX, {
      statusCode: HttpStatus.BAD_REQUEST,
      message: MESSAGES.CONTACT_ADMIN,
    });
    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: MESSAGES.CONTACT_ADMIN,
    });
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof Error) {
      if (exception instanceof HttpException) {
        const statusCode = exception.getStatus();
        const message = getHttpExceptionMessage(exception);
        console.log(LOG_PREFIX, { statusCode, message });
        response.status(statusCode).json({ statusCode, message });
      } else {
        // Unexpected internal error, send it to sentry
        this.returnError(
          new Error(`Unexpected internal error, ${inspect(exception)}`),
          response,
        );
      }
    } else {
      // This should never happen: it means that the exception itself is not a JS error; we rethrow it as an unexcepted error type
      this.returnError(
        new Error(`Unexpected error type, ${inspect(exception)}`),
        response,
      );
    }
  }
}
