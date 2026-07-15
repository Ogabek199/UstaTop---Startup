import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Notification } from '@prisma/client';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>(
      'VAPID_SUBJECT',
      'mailto:admin@ustatop.uz',
    );

    if (!publicKey || !privateKey) {
      this.logger.warn('VAPID keys not set — browser push disabled');
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.enabled = true;
  }

  getPublicKey(): string | null {
    return this.config.get<string>('VAPID_PUBLIC_KEY') ?? null;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async sendToUser(userId: string, notification: Notification) {
    if (!this.enabled) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      type: notification.type,
      data: notification.data,
      notificationId: notification.id,
    });

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
        } catch (error: unknown) {
          const statusCode =
            error && typeof error === 'object' && 'statusCode' in error
              ? (error as { statusCode?: number }).statusCode
              : undefined;

          if (statusCode === 404 || statusCode === 410) {
            await this.prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
          } else {
            this.logger.warn(`Push failed for subscription ${sub.id}`);
          }
        }
      }),
    );
  }
}
