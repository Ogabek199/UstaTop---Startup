import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(orderId: string, user: User, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { review: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.clientId !== user.id) {
      throw new ForbiddenException('Only the client can leave a review');
    }
    if (order.status !== OrderStatus.completed) {
      throw new BadRequestException('Order must be completed');
    }
    if (order.review) {
      throw new BadRequestException('Review already exists');
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: { orderId, rating: dto.rating, comment: dto.comment },
      });

      if (order.masterId) {
        const profile = await tx.masterProfile.findUnique({
          where: { userId: order.masterId },
        });
        if (profile) {
          const newCount = profile.reviewCount + 1;
          const newAvg =
            (Number(profile.ratingAvg) * profile.reviewCount + dto.rating) /
            newCount;
          await tx.masterProfile.update({
            where: { userId: order.masterId },
            data: {
              reviewCount: newCount,
              ratingAvg: Number(newAvg.toFixed(2)),
            },
          });
        }
      }

      return created;
    });

    return review;
  }

  async getByOrder(orderId: string) {
    return this.prisma.review.findUnique({ where: { orderId } });
  }
}
