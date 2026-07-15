import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TelegramService } from '../telegram/telegram.service';

const DEFAULT_TIMEOUT_MINUTES = 30;
const DEFAULT_EXPRESS_TIMEOUT_MINUTES = 15;
const TIMEOUT_REASON = 'Usta vaqtida javob bermadi';

@Injectable()
export class OrderTimeoutService {
  private readonly logger = new Logger(OrderTimeoutService.name);
  private running = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private notifications: NotificationsService,
    private telegram: TelegramService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handlePendingTimeouts() {
    if (this.running) return;
    this.running = true;
    try {
      await this.expireOverdueOrders();
    } catch (err) {
      this.logger.error(
        `Order timeout job failed: ${err instanceof Error ? err.message : err}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async expireOverdueOrders() {
    const normalMinutes = Number(
      this.config.get('ORDER_ACCEPT_TIMEOUT_MINUTES') ??
        DEFAULT_TIMEOUT_MINUTES,
    );
    const expressMinutes = Number(
      this.config.get('ORDER_EXPRESS_ACCEPT_TIMEOUT_MINUTES') ??
        DEFAULT_EXPRESS_TIMEOUT_MINUTES,
    );

    const now = Date.now();

    // Unpaid orders: auto-cancel after payment window
    const unpaidMinutes = Number(
      this.config.get('ORDER_PAYMENT_TIMEOUT_MINUTES') ?? 20,
    );
    const unpaidCutoff = new Date(now - unpaidMinutes * 60_000);
    const unpaid = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.awaiting_payment,
        createdAt: { lt: unpaidCutoff },
      },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });
    for (const order of unpaid) {
      const updated = await this.prisma.order.updateMany({
        where: { id: order.id, status: OrderStatus.awaiting_payment },
        data: {
          status: OrderStatus.cancelled,
          cancelReason: "To'lov amalga oshirilmadi",
        },
      });
      if (updated.count > 0) {
        this.logger.log(`Auto-cancelled unpaid order ${order.id}`);
      }
    }

    const pending = await this.prisma.order.findMany({
      where: { status: OrderStatus.pending },
      include: {
        service: true,
        client: { select: { id: true, name: true } },
        master: { select: { id: true, name: true } },
      },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });

    for (const order of pending) {
      const limitMs =
        (order.isExpress ? expressMinutes : normalMinutes) * 60_000;
      if (now - order.createdAt.getTime() < limitMs) continue;

      const updated = await this.prisma.order.updateMany({
        where: { id: order.id, status: OrderStatus.pending },
        data: {
          status: OrderStatus.cancelled,
          cancelReason: TIMEOUT_REASON,
        },
      });

      if (updated.count === 0) continue;

      this.logger.log(`Auto-cancelled order ${order.id} (no accept in time)`);
      await this.notifications.notifyOrderTimeout({
        ...order,
        cancelReason: TIMEOUT_REASON,
      });
      void this.telegram.clearOrderActionButtons(
        order.id,
        `❌ <b>Buyurtma avtomatik yopildi</b>\n\n📝 <b>Sabab:</b> ${TIMEOUT_REASON}`,
      );
    }
  }
}
