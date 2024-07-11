import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

import { AppModule } from './modules/app.module';

import { LoggerInterceptor } from '@infrastructure/logger/logger.interceptor';
import { LoggerService } from '@infrastructure/logger/services/logger.service';
import { GlobalExceptionFilter } from '@infrastructure/filter/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://localhost:5672'],
        queue: 'notification_queue',
        queueOptions: {
          durable: false,
        },
      },
    },
  );
  const loggerService = app.get(LoggerService);

  app.useGlobalFilters(new GlobalExceptionFilter(loggerService));
  app.useGlobalInterceptors(new LoggerInterceptor());

  await app.listen();
  loggerService.info(
    'Microservice is listening on queue: notification_queue',
    'Bootstrap',
  );
}
bootstrap();
