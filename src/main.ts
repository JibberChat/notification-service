import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

import { AppModule } from './modules/app.module';

import { LoggerInterceptor } from '@infrastructure/logger/logger.interceptor';
import { LoggerService } from '@infrastructure/logger/services/logger.service';
import { GlobalExceptionFilter } from '@helpers/filter/global-exception.filter';

async function bootstrap() {
  const loggerService = new LoggerService();

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

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new GlobalExceptionFilter(httpAdapter, loggerService));
  app.useGlobalInterceptors(new LoggerInterceptor());

  await app.listen();
  console.log('Microservice is listening on queue: notification_queue');
}
bootstrap();
