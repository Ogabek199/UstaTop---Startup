import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { OrderStatus, User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';

const EXPRESS_FEE = 15000;

const CLIENT_CANCELABLE: OrderStatus[] = [
  OrderStatus.awaiting_payment,
  OrderStatus.pending,
  OrderStatus.accepted,
];

const PRO_CANCELABLE: OrderStatus[] = [
  OrderStatus.pending,
  OrderStatus.accepted,
  OrderStatus.on_the_way,
];

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => TelegramService))
    private telegram: TelegramService,
    private notifications: NotificationsService,
  ) {}

  async create(clientId: string, dto: CreateOrderDto) {
    const master = await this.prisma.masterProfile.findFirst({
      where: { OR: [{ userId: dto.masterId }, { id: dto.masterId }] },
      include: { user: { select: { isVerified: true } } },
    });
    if (!master || !master.user.isVerified) {
      throw new BadRequestException('Professional not available');
    }

    const masterUserId = master.userId;

    if (dto.price < master.priceMin) {
      throw new BadRequestException(
        `Price must be at least ${master.priceMin}`,
      );
    }

    const expressFee = dto.isExpress ? EXPRESS_FEE : 0;

    // Payment first: do not notify master until paid
    const order = await this.prisma.order.create({
      data: {
        clientId,
        masterId: masterUserId,
        serviceId: dto.serviceId,
        description: dto.description,
        address: dto.address,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        price: dto.price + expressFee,
        isExpress: dto.isExpress ?? false,
        expressFee,
        images: dto.images ?? [],
        status: OrderStatus.awaiting_payment,
      },
      include: this.orderIncludes(),
    });

    return order;
  }

  /** Called after successful payment — exposes order to master. */
  async activateAfterPayment(orderId: string) {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.orderIncludes(),
    });
    if (!existing) throw new NotFoundException('Order not found');

    if (existing.status !== OrderStatus.awaiting_payment) {
      return existing;
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.pending },
      include: this.orderIncludes(),
    });

    void this.notifyMasterViaTelegram(order.id);
    await this.notifications.notifyNewOrderForMaster(order);
    return order;
  }

  async findAll(user: User) {
    if (user.role === UserRole.professional) {
      return this.prisma.order.findMany({
        where: {
          masterId: user.id,
          status: { not: OrderStatus.awaiting_payment },
        },
        include: this.orderIncludes(),
        orderBy: { createdAt: 'desc' },
      });
    }

    const where =
      user.role === UserRole.admin ? {} : { clientId: user.id };

    return this.prisma.order.findMany({
      where,
      include: this.orderIncludes(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: User) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderIncludes(),
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertOrderAccess(order, user);

    // Master must not see unpaid orders
    if (
      user.role === UserRole.professional &&
      order.status === OrderStatus.awaiting_payment
    ) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  async accept(id: string, user: User) {
    const order = await this.getOrderForMaster(id, user.id);
    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException('Order cannot be accepted');
    }
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.accepted },
      include: this.orderIncludes(),
    });
    await this.notifications.notifyOrderAccepted(updated);
    return updated;
  }

  async acceptFromTelegram(id: string, masterId: string) {
    const order = await this.getOrderForMaster(id, masterId);
    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException('Order cannot be accepted');
    }
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.accepted },
      include: this.orderIncludes(),
    });
    await this.notifications.notifyOrderAccepted(updated);
    return updated;
  }

  async decline(id: string, user: User, reason?: string) {
    const order = await this.getOrderForMaster(id, user.id);
    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException('Order cannot be declined');
    }
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.cancelled,
        cancelReason: reason ?? 'Declined by professional',
      },
      include: this.orderIncludes(),
    });
    await this.notifications.notifyOrderDeclined(updated);
    const tgOrder = await this.loadOrderForTelegramFormat(id);
    if (tgOrder) {
      void this.telegram.clearOrderActionButtons(
        id,
        this.telegram.formatOrderMessage(
          tgOrder,
          '❌ <b>Buyurtma rad etildi</b>',
        ) + (reason ? `\n\n📝 <b>Sabab:</b> ${reason}` : ''),
      );
    }
    return updated;
  }

  async declineFromTelegram(id: string, masterId: string, reason?: string) {
    const order = await this.getOrderForMaster(id, masterId);
    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException('Order cannot be declined');
    }
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.cancelled,
        cancelReason: reason ?? 'Declined by professional',
      },
      include: this.orderIncludes(),
    });
    await this.notifications.notifyOrderDeclined(updated);
    return updated;
  }

  async updateStatusFromTelegram(
    id: string,
    masterId: string,
    status: OrderStatus,
  ) {
    const order = await this.getOrderForMaster(id, masterId);
    this.validateStatusTransition(order.status, status, UserRole.professional);

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: this.orderIncludes(),
    });

    if (status === OrderStatus.completed) {
      await this.prisma.masterProfile.update({
        where: { userId: masterId },
        data: { completedOrders: { increment: 1 } },
      });
    }

    await this.notifications.notifyOrderStatusUpdate(updated, status);
    return updated;
  }

  async updateStatus(id: string, user: User, dto: UpdateOrderStatusDto) {
    const order = await this.findOne(id, user);

    if (user.role !== UserRole.professional && user.role !== UserRole.admin) {
      throw new ForbiddenException('Only professional can update order status');
    }
    if (
      user.role === UserRole.professional &&
      order.masterId !== user.id
    ) {
      throw new ForbiddenException('Not your order');
    }

    this.validateStatusTransition(order.status, dto.status, user.role);

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        cancelReason: dto.cancelReason,
      },
      include: this.orderIncludes(),
    });

    if (dto.status === OrderStatus.completed && order.masterId) {
      await this.prisma.masterProfile.update({
        where: { userId: order.masterId },
        data: { completedOrders: { increment: 1 } },
      });
    }

    if (dto.status === OrderStatus.cancelled) {
      await this.notifications.notifyOrderCancelled(
        updated,
        user.id,
        dto.cancelReason,
      );
      void this.clearTelegramActionsOnCancel(updated.id, dto.cancelReason);
    } else {
      await this.notifications.notifyOrderStatusUpdate(updated, dto.status);
    }

    return updated;
  }

  async cancel(id: string, user: User, reason?: string) {
    const order = await this.findOne(id, user);

    if (user.role === UserRole.customer) {
      if (!CLIENT_CANCELABLE.includes(order.status)) {
        throw new BadRequestException(
          'Order can only be cancelled while pending or accepted',
        );
      }
      if (order.clientId !== user.id) {
        throw new ForbiddenException('Access denied');
      }
    } else if (user.role === UserRole.professional) {
      if (!PRO_CANCELABLE.includes(order.status)) {
        throw new BadRequestException('Order cannot be cancelled at this stage');
      }
      if (order.masterId !== user.id) {
        throw new ForbiddenException('Access denied');
      }
    } else if (user.role !== UserRole.admin) {
      throw new ForbiddenException('Access denied');
    }

    if (
      order.status === OrderStatus.completed ||
      order.status === OrderStatus.cancelled
    ) {
      throw new BadRequestException('Order cannot be cancelled');
    }

    const wasVisibleToMaster = order.status !== OrderStatus.awaiting_payment;

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.cancelled,
        cancelReason: reason ?? 'Cancelled by user',
      },
      include: this.orderIncludes(),
    });

    // Only notify master if they already knew about the order (paid)
    if (wasVisibleToMaster) {
      await this.notifications.notifyOrderCancelled(updated, user.id, reason);
      void this.clearTelegramActionsOnCancel(updated.id, reason);
    }

    return updated;
  }

  private async clearTelegramActionsOnCancel(
    orderId: string,
    reason?: string | null,
  ) {
    const order = await this.loadOrderForTelegramFormat(orderId);
    if (!order) {
      await this.telegram.clearOrderActionButtons(
        orderId,
        '❌ <b>Buyurtma bekor qilindi</b>',
      );
      return;
    }
    const text =
      this.telegram.formatOrderMessage(
        order,
        '❌ <b>Buyurtma bekor qilindi</b>',
      ) + (reason ? `\n\n📝 <b>Sabab:</b> ${reason}` : '');
    await this.telegram.clearOrderActionButtons(orderId, text);
  }

  private async loadOrderForTelegramFormat(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        service: true,
        client: { select: { name: true, phone: true } },
      },
    });
  }

  private async getOrderForMaster(id: string, masterId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.masterId !== masterId) {
      throw new ForbiddenException('Not your order');
    }
    if (order.status === OrderStatus.awaiting_payment) {
      throw new ForbiddenException('Order is not paid yet');
    }
    return order;
  }

  private assertOrderAccess(
    order: { clientId: string; masterId: string | null },
    user: User,
  ) {
    if (user.role === UserRole.admin) return;
    if (order.clientId !== user.id && order.masterId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
  }

  private validateStatusTransition(
    current: OrderStatus,
    next: OrderStatus,
    role: UserRole,
  ) {
    const professionalFlow: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.accepted]: [
        OrderStatus.on_the_way,
        OrderStatus.completed,
        OrderStatus.cancelled,
      ],
      [OrderStatus.on_the_way]: [
        OrderStatus.in_progress,
        OrderStatus.completed,
        OrderStatus.cancelled,
      ],
      [OrderStatus.in_progress]: [OrderStatus.completed],
    };

    if (role === UserRole.professional) {
      const allowed = professionalFlow[current] ?? [];
      if (!allowed.includes(next)) {
        throw new BadRequestException('Invalid status transition');
      }
    }
  }

  private orderIncludes() {
    return {
      client: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      master: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      service: true,
      payment: true,
      review: true,
    };
  }

  private async notifyMasterViaTelegram(orderId: string) {
    if (!this.telegram.isEnabled) return;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        service: true,
        client: { select: { name: true, phone: true } },
        master: {
          include: {
            masterProfile: { select: { telegramChatId: true } },
          },
        },
      },
    });

    const chatId = order?.master?.masterProfile?.telegramChatId;
    if (!order || !chatId) return;

    const messageId = await this.telegram.sendTrackedMessage(
      chatId,
      this.telegram.formatOrderMessage(order),
      order.id,
      this.telegram.orderActionKeyboard(order.id),
    );
    if (messageId != null) {
      this.telegram.rememberOrderActionMessage(order.id, chatId, messageId);
    }
  }
}
