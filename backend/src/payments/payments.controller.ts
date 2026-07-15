import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePaymentDto } from './dto/payment.dto';
import type { User } from '@prisma/client';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post(':orderId')
  create(
    @Param('orderId') orderId: string,
    @CurrentUser() user: User,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(orderId, user, dto);
  }

  @Get(':orderId')
  getByOrder(@Param('orderId') orderId: string, @CurrentUser() user: User) {
    return this.paymentsService.getByOrder(orderId, user);
  }
}
