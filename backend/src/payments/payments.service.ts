import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentStatus, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CreatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @Inject(forwardRef(() => OrdersService))
    private orders: OrdersService,
  ) {}

  async create(orderId: string, user: User, dto: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.clientId !== user.id) {
      throw new ForbiddenException('Only client can pay');
    }
    if (
      order.status === OrderStatus.cancelled ||
      order.status === OrderStatus.completed
    ) {
      throw new BadRequestException('Order cannot be paid in current status');
    }
    if (
      order.status !== OrderStatus.awaiting_payment &&
      order.status !== OrderStatus.pending
    ) {
      throw new BadRequestException('Order cannot be paid in current status');
    }
    if (order.payment?.status === PaymentStatus.completed) {
      throw new BadRequestException('Already paid');
    }

    const rate = Number(this.config.get('COMMISSION_RATE', 13));
    const commission = Math.round((order.price * rate) / 100);

    const mockPayments = this.config.get('MOCK_PAYMENTS') !== 'false';

    if (mockPayments) {
      const payment = await this.prisma.payment.upsert({
        where: { orderId },
        create: {
          orderId,
          amount: order.price,
          commission,
          provider: dto.provider,
          status: PaymentStatus.completed,
          transactionId: `mock_${Date.now()}`,
        },
        update: {
          amount: order.price,
          commission,
          provider: dto.provider,
          status: PaymentStatus.completed,
          transactionId: `mock_${Date.now()}`,
        },
      });

      const activated = await this.orders.activateAfterPayment(orderId);

      return {
        payment,
        order: activated,
        mock: true,
        message: 'Payment completed (mock)',
      };
    }

    // TODO: Payme / Click — activate after webhook success
    return this.prisma.payment.create({
      data: {
        orderId,
        amount: order.price,
        commission,
        provider: dto.provider,
        status: PaymentStatus.pending,
      },
    });
  }

  async getByOrder(orderId: string, user: User) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (
      order.clientId !== user.id &&
      order.masterId !== user.id &&
      user.role !== 'admin'
    ) {
      throw new ForbiddenException('Access denied');
    }
    return order.payment;
  }
}
