import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { Notification, OrderStatus, Prisma } from '@prisma/client';
import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CLIENT_STATUS_MESSAGES } from '../telegram/order-status-actions';
import { PushService } from './push.service';

type OrderNotificationContext = {
  id: string;
  clientId: string;
  masterId?: string | null;
  address?: string | null;
  price?: number;
  cancelReason?: string | null;
  master?: { name: string | null; phone?: string | null } | null;
  client?: { name: string | null; phone?: string | null } | null;
  service?: { nameUz: string } | null;
};

/** Rich Telegram order card already sent separately — skip plain mirror. */
const TELEGRAM_MIRROR_SKIP_TYPES = new Set(['order_new']);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly listeners = new Map<
    string,
    Set<(notification: Notification) => void>
  >();

  constructor(
    private prisma: PrismaService,
    private push: PushService,
    @Inject(forwardRef(() => TelegramService))
    private telegram: TelegramService,
  ) {}

  async findAll(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) return null;

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async subscribePush(
    userId: string,
    data: { endpoint: string; p256dh: string; auth: string },
  ) {
    return this.prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: { userId, endpoint: data.endpoint },
      },
      create: {
        userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
      },
      update: {
        p256dh: data.p256dh,
        auth: data.auth,
      },
    });
  }

  async unsubscribePush(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    return { success: true };
  }

  subscribe(userId: string): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const safeNext = (payload: MessageEvent['data']) => {
        if (subscriber.closed) return;
        try {
          subscriber.next({ data: payload } as MessageEvent);
        } catch {
          // Client already gone (refresh / restart) — ignore
        }
      };

      const listener = (notification: Notification) => {
        safeNext(notification);
      };

      if (!this.listeners.has(userId)) {
        this.listeners.set(userId, new Set());
      }
      this.listeners.get(userId)!.add(listener);

      // Confirm the stream immediately so proxies don't buffer an empty response
      safeNext({ type: 'ping' });

      const heartbeat = setInterval(() => {
        if (subscriber.closed) {
          clearInterval(heartbeat);
          return;
        }
        safeNext({ type: 'ping' });
      }, 25000);

      return () => {
        clearInterval(heartbeat);
        this.listeners.get(userId)?.delete(listener);
        if (this.listeners.get(userId)?.size === 0) {
          this.listeners.delete(userId);
        }
      };
    });
  }

  async notifyNewOrderForMaster(order: OrderNotificationContext) {
    if (!order.masterId) return null;

    const clientName = order.client?.name ?? 'Mijoz';
    const serviceName = order.service?.nameUz ?? 'Buyurtma';
    const addressText = order.address ? ` Manzil: ${order.address}` : '';

    return this.create(order.masterId, {
      type: 'order_new',
      title: 'Yangi buyurtma!',
      body: `${clientName} "${serviceName}" xizmati uchun buyurtma berdi.${addressText}`,
      data: { orderId: order.id, status: 'pending' },
    });
  }

  async notifyOrderAccepted(order: OrderNotificationContext) {
    const masterName = order.master?.name ?? 'Usta';
    const serviceName = order.service?.nameUz ?? 'Buyurtma';

    return this.create(order.clientId, {
      type: 'order_accepted',
      title: 'Buyurtma qabul qilindi',
      body: `${masterName} "${serviceName}" buyurtmangizni qabul qildi.`,
      data: { orderId: order.id, status: 'accepted' },
    });
  }

  async notifyOrderDeclined(order: OrderNotificationContext) {
    const masterName = order.master?.name ?? 'Usta';
    const serviceName = order.service?.nameUz ?? 'Buyurtma';

    return this.create(order.clientId, {
      type: 'order_declined',
      title: 'Buyurtma rad etildi',
      body: `${masterName} "${serviceName}" buyurtmangizni rad etdi.${order.cancelReason ? ` Sabab: ${order.cancelReason}` : ''}`,
      data: { orderId: order.id, status: 'cancelled' },
    });
  }

  async notifyOrderStatusUpdate(
    order: OrderNotificationContext,
    status: OrderStatus,
  ) {
    const action = CLIENT_STATUS_MESSAGES[status];
    if (!action) return null;

    const masterName = order.master?.name ?? 'Usta';
    const serviceName = order.service?.nameUz ?? 'Buyurtma';

    const titles: Partial<Record<OrderStatus, string>> = {
      [OrderStatus.on_the_way]: "Usta yo'lda",
      [OrderStatus.in_progress]: 'Ish boshlandi',
      [OrderStatus.completed]: 'Ish yakunlandi',
    };

    return this.create(order.clientId, {
      type: `order_status_${status}`,
      title: titles[status] ?? 'Buyurtma yangilandi',
      body: `${masterName} "${serviceName}" buyurtmasi bo'yicha ${action}.`,
      data: { orderId: order.id, status },
    });
  }

  async notifyOrderCancelled(
    order: OrderNotificationContext,
    cancelledByUserId: string,
    reason?: string,
  ) {
    const serviceName = order.service?.nameUz ?? 'Buyurtma';
    const reasonText = reason ? ` Sabab: ${reason}` : '';

    if (cancelledByUserId === order.clientId && order.masterId) {
      return this.create(order.masterId, {
        type: 'order_cancelled_by_client',
        title: 'Buyurtma bekor qilindi',
        body: `Mijoz "${serviceName}" buyurtmasini bekor qildi.${reasonText}`,
        data: { orderId: order.id, status: 'cancelled' },
      });
    }

    if (cancelledByUserId === order.masterId) {
      return this.create(order.clientId, {
        type: 'order_cancelled_by_pro',
        title: 'Buyurtma bekor qilindi',
        body: `Usta "${serviceName}" buyurtmasini bekor qildi.${reasonText}`,
        data: { orderId: order.id, status: 'cancelled' },
      });
    }

    return null;
  }

  async notifyOrderTimeout(order: OrderNotificationContext) {
    const serviceName = order.service?.nameUz ?? 'Buyurtma';

    await this.create(order.clientId, {
      type: 'order_timeout',
      title: 'Buyurtma bekor qilindi',
      body: `Usta "${serviceName}" buyurtmasiga vaqtida javob bermadi.`,
      data: { orderId: order.id, status: 'cancelled' },
    });

    if (order.masterId) {
      await this.create(order.masterId, {
        type: 'order_timeout',
        title: 'Buyurtma avtomatik yopildi',
        body: `Siz "${serviceName}" buyurtmasiga vaqtida javob bermadingiz.`,
        data: { orderId: order.id, status: 'cancelled' },
      });
    }
  }

  async notifyNewMessage(
    order: OrderNotificationContext,
    sender: { id: string; name: string | null; phone?: string | null },
    preview: string,
  ) {
    const recipientId =
      sender.id === order.clientId ? order.masterId : order.clientId;
    if (!recipientId) return null;

    const fromCustomer = sender.id === order.clientId;
    const senderName = sender.name ?? (fromCustomer ? 'Mijoz' : 'Usta');
    const senderPhone =
      sender.phone ??
      (fromCustomer ? order.client?.phone : order.master?.phone) ??
      null;
    const serviceName = order.service?.nameUz ?? null;
    const truncated =
      preview.length > 120 ? `${preview.slice(0, 117)}...` : preview;

    const title = fromCustomer ? 'Mijozdan yangi xabar' : 'Ustadan yangi xabar';
    const phonePart = senderPhone ? ` · ${senderPhone}` : '';
    const body = `${senderName}${phonePart}: ${truncated}`;

    return this.create(recipientId, {
      type: 'order_message',
      title,
      body,
      data: {
        orderId: order.id,
        type: 'message',
        fromCustomer,
        senderName,
        senderPhone,
        serviceName,
        preview: truncated,
      },
    });
  }

  private async create(
    userId: string,
    payload: {
      type: string;
      title: string;
      body: string;
      data?: Prisma.InputJsonValue;
    },
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? undefined,
      },
    });

    this.emitToUser(userId, notification);
    void this.push.sendToUser(userId, notification);
    void this.mirrorToTelegram(userId, notification);
    return notification;
  }

  private async mirrorToTelegram(
    userId: string,
    notification: Notification,
  ) {
    if (!this.telegram.isEnabled) return;
    if (TELEGRAM_MIRROR_SKIP_TYPES.has(notification.type)) return;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          telegramChatId: true,
          masterProfile: { select: { telegramChatId: true } },
        },
      });

      const chatId =
        user?.telegramChatId ?? user?.masterProfile?.telegramChatId ?? null;
      if (!chatId) return;

      const data =
        notification.data && typeof notification.data === 'object'
          ? (notification.data as Record<string, unknown>)
          : null;
      const orderId =
        data && typeof data.orderId === 'string' ? data.orderId : null;

      if (notification.type === 'order_message' && orderId) {
        const text = this.telegram.formatIncomingChatMessage({
          fromCustomer: data?.fromCustomer === true,
          name:
            typeof data?.senderName === 'string'
              ? data.senderName
              : 'Foydalanuvchi',
          phone:
            typeof data?.senderPhone === 'string' ? data.senderPhone : null,
          serviceName:
            typeof data?.serviceName === 'string' ? data.serviceName : null,
          preview:
            typeof data?.preview === 'string'
              ? data.preview
              : notification.body,
        });

        await this.telegram.sendTrackedMessage(
          chatId,
          text,
          orderId,
          this.telegram.chatReplyKeyboard(orderId),
        );
        return;
      }

      let text = [
        `<b>${escapeHtml(notification.title)}</b>`,
        escapeHtml(notification.body),
      ].join('\n');

      if (orderId) {
        text = this.telegram.withOrderReplyHint(text);
        await this.telegram.sendTrackedMessage(
          chatId,
          text,
          orderId,
          this.telegram.chatReplyKeyboard(orderId),
        );
        return;
      }

      await this.telegram.sendMessage(chatId, text);
    } catch (err) {
      this.logger.warn(
        `Telegram mirror failed for user ${userId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private emitToUser(userId: string, notification: Notification) {
    const listeners = this.listeners.get(userId);
    if (!listeners) return;
    listeners.forEach((listener) => listener(notification));
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
