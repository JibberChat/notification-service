import { Controller } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern({ cmd: 'sendNotifications' })
  async sendNotifications(data: {
    pushTokens: string[];
    title?: string;
    body: string;
    data?: {
      url?: string;
      metadata?: Record<string, unknown>;
    };
  }): Promise<{ message: string }> {
    console.log(data);
    return await this.appService.sendNotifications({ ...data });
  }
}
