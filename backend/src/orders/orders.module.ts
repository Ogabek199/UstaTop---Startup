import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderTimeoutService } from './order-timeout.service';
import { TelegramModule } from '../telegram/telegram.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => TelegramModule), NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderTimeoutService],
  exports: [OrdersService],
})
export class OrdersModule {}
