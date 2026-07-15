import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { TelegramService } from './telegram.service';

/**
 * Separate admin bot poller — only runs when TELEGRAM_ADMIN_BOT_TOKEN
 * differs from TELEGRAM_BOT_TOKEN. Listens for /start to register chat IDs.
 */
@Injectable()
export class AdminAlertBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminAlertBotService.name);
  private polling = false;
  private offset = 0;

  constructor(private telegram: TelegramService) {}

  onModuleInit() {
    if (!this.telegram.usesSeparateAdminBot) return;
    if (!this.telegram.adminBotToken) return;

    this.polling = true;
    void this.pollLoop();
    this.logger.log('Admin alert bot polling boshlandi');
  }

  onModuleDestroy() {
    this.polling = false;
  }

  private async pollLoop() {
    while (this.polling) {
      try {
        const updates = await this.telegram.getAdminBotUpdates(this.offset);
        if (!updates || !Array.isArray(updates)) {
          await this.sleep(3000);
          continue;
        }

        for (const update of updates) {
          this.offset = update.update_id + 1;
          const chatId = update.message?.chat?.id;
          const text = update.message?.text?.trim();
          if (!chatId || !text) continue;

          const id = String(chatId);
          if (text.startsWith('/start') || text === '/admin') {
            const isNew = this.telegram.registerAdminChat(id);
            await this.telegram.sendAdminBotMessage(
              id,
              isNew
                ? '✅ <b>UstaTop admin alert ulandi!</b>\n\nEndi sayt xatolari, API muammolari va foydalanuvchi takliflari shu chatga keladi.'
                : 'ℹ️ Bu chat allaqachon admin alertlarga ulangan.',
            );
          }
        }
      } catch (err) {
        if (this.polling) {
          this.logger.error('Admin bot polling xatosi', err);
          await this.sleep(5000);
        }
      }
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
