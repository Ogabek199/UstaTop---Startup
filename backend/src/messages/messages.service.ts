import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SendMessageDto } from './dto/message.dto';

const CHAT_CLOSED_STATUSES: OrderStatus[] = [
  OrderStatus.awaiting_payment,
  OrderStatus.completed,
  OrderStatus.cancelled,
];

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async getMessages(orderId: string, user: User) {
    await this.assertAccess(orderId, user);
    return this.prisma.message.findMany({
      where: { orderId },
      orderBy: { sentAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });
  }

  async sendMessage(orderId: string, user: User, dto: SendMessageDto) {
    const order = await this.assertAccess(orderId, user);

    if (CHAT_CLOSED_STATUSES.includes(order.status)) {
      throw new BadRequestException('Chat is closed for this order');
    }
    if (!dto.text?.trim() && !dto.imageUrl) {
      throw new BadRequestException('Message cannot be empty');
    }

    const text = dto.text?.trim() || null;

    const message = await this.prisma.message.create({
      data: {
        orderId,
        senderId: user.id,
        text,
        imageUrl: dto.imageUrl,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    const preview = text || (dto.imageUrl ? '📷 Rasm' : 'Xabar');
    const fullOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        service: true,
        client: { select: { id: true, name: true, phone: true } },
        master: { select: { id: true, name: true, phone: true } },
      },
    });

    if (fullOrder) {
      void this.notifications.notifyNewMessage(
        fullOrder,
        { id: user.id, name: user.name, phone: user.phone },
        preview,
      );
    }

    return message;
  }

  async markRead(orderId: string, user: User) {
    await this.assertAccess(orderId, user);
    await this.prisma.message.updateMany({
      where: { orderId, senderId: { not: user.id }, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  private async assertAccess(orderId: string, user: User) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (user.role === UserRole.admin) return order;
    if (order.clientId !== user.id && order.masterId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return order;
  }
}
