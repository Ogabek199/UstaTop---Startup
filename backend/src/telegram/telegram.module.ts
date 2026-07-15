import { Module, forwardRef } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramBotService } from './telegram-bot.service';
import { AdminAlertBotService } from './admin-alert-bot.service';
import { OrdersModule } from '../orders/orders.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    forwardRef(() => OrdersModule),
    forwardRef(() => MessagesModule),
  ],
  providers: [TelegramService, TelegramBotService, AdminAlertBotService],
  exports: [TelegramService],
})
export class TelegramModule {}
