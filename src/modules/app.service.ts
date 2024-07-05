import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

import { Injectable } from '@nestjs/common';

import { LoggerService } from '@infrastructure/logger/services/logger.service';

import { isEmpty } from '@helpers/checks/isEmpty';

type SendNotifications = {
  pushTokens: string[];
  title?: string;
  body: string;
  data?: {
    url?: string;
    metadata?: Record<string, unknown>;
  };
};

@Injectable()
export class AppService {
  private readonly expo = new Expo();

  constructor(private readonly logger: LoggerService) {}

  async sendNotifications({
    pushTokens,
    title: notificationTitle,
    body,
    data = {},
  }: SendNotifications) {
    const title = notificationTitle ?? 'Leets';
    const messages: ExpoPushMessage[] = [];
    for (const pushToken of pushTokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        this.logger.error(
          `Push token ${pushToken} is not a valid Expo push token`,
          '',
          this.constructor.name,
        );
        continue;
      }

      messages.push({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        badge: 1,
        categoryId: 'leets',
      });
    }

    const chunks = this.expo.chunkPushNotifications(messages);

    const tickets: ExpoPushTicket[] = [];
    await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          this.logger.error(
            'Error sending notifications',
            String(error),
            'sendNotifications - sendPushNotificationsAsync',
          );
        }
      }),
    );

    const receiptIds = [];
    for (const ticket of tickets)
      if (ticket.status === 'ok') receiptIds.push(ticket.id);
    const receiptIdChunks =
      this.expo.chunkPushNotificationReceiptIds(receiptIds);

    await Promise.all(
      receiptIdChunks.map(async (chunk) => {
        try {
          const receipts =
            await this.expo.getPushNotificationReceiptsAsync(chunk);

          if (isEmpty(receipts)) throw new Error('No receipts');

          for (const receiptId in receipts) {
            const receipt = receipts[receiptId];
            if (receipt.status === 'error') {
              if (receipt.details && receipt.details.error) {
                throw new Error(
                  JSON.stringify(receipt.details) +
                    ' - ' +
                    JSON.stringify(receipt.message ?? 'Unknown error'),
                );
              } else {
                throw new Error('Unknown error');
              }
            }
          }
        } catch (error) {
          this.logger.error(
            'Error sending notifications',
            String(error),
            'sendNotifications - getPushNotificationReceiptsAsync',
          );
        }
      }),
    );

    return { message: 'Notifications sent' };
  }
}
