import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import type { User } from '@prisma/client';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.ordersService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ordersService.findOne(id, user);
  }

  @Put(':id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ordersService.accept(id, user);
  }

  @Put(':id/decline')
  decline(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('reason') reason?: string,
  ) {
    return this.ordersService.decline(id, user, reason);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, user, dto);
  }

  @Put(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('reason') reason?: string,
  ) {
    return this.ordersService.cancel(id, user, reason);
  }
}
