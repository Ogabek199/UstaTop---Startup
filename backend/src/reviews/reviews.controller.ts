import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateReviewDto } from './dto/review.dto';
import type { User } from '@prisma/client';

@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post(':orderId')
  create(
    @Param('orderId') orderId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(orderId, user, dto);
  }

  @Get(':orderId')
  getByOrder(@Param('orderId') orderId: string) {
    return this.reviewsService.getByOrder(orderId);
  }
}
