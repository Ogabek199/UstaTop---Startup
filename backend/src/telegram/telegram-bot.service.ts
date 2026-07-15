import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { OrderStatus, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { MessagesService } from '../messages/messages.service';
import { TelegramService } from './telegram.service';
import { getDeclineReasonText } from './decline-reasons';

type PendingDecline = {
  orderId: string;
  orderMessageId?: number;
};

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private polling = false;
  private offset = 0;
  private abortController: AbortController | null = null;
  private readonly pendingDeclineReasons = new Map<string, PendingDecline>();
  /** chatId → orderId — "Javob yozish" bosilgandan keyin keyingi matn chatga ketadi */
  private readonly pendingChatReplies = new Map<string, string>();

  constructor(
    private telegram: TelegramService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => OrdersService))
    private orders: OrdersService,
    @Inject(forwardRef(() => MessagesService))
    private messages: MessagesService,
  ) {}

  onModuleInit() {
    if (!this.telegram.isEnabled) {
      this.logger.warn('TELEGRAM_BOT_TOKEN yo\'q — bot o\'chirilgan');
      return;
    }
    this.polling = true;
    this.abortController = new AbortController();
    void this.pollLoop();
    this.logger.log('Telegram bot polling boshlandi');
  }

  onModuleDestroy() {
    this.polling = false;
    this.abortController?.abort();
    this.pendingDeclineReasons.clear();
    this.pendingChatReplies.clear();
  }

  private async pollLoop() {
    while (this.polling) {
      try {
        const updates = await this.telegram.getUpdates(this.offset);
        if (!updates || !Array.isArray(updates)) {
          await this.sleep(3000);
          continue;
        }

        for (const update of updates) {
          this.offset = update.update_id + 1;
          await this.handleUpdate(update);
        }
      } catch (err) {
        if (this.polling) {
          this.logger.error('Polling xatosi', err);
          await this.sleep(5000);
        }
      }
    }
  }

  private async handleUpdate(update: {
    message?: {
      message_id: number;
      chat: { id: number };
      text?: string;
      reply_to_message?: {
        message_id: number;
        text?: string;
        caption?: string;
      };
    };
    callback_query?: {
      id: string;
      data?: string;
      message?: { message_id: number; chat: { id: number } };
    };
  }) {
    const chatId = update.message
      ? String(update.message.chat.id)
      : update.callback_query?.message
        ? String(update.callback_query.message.chat.id)
        : null;

    if (update.message?.text?.startsWith('/admin') && chatId) {
      const isNew = this.telegram.registerAdminChat(chatId);
      await this.telegram.sendMessage(
        chatId,
        isNew
          ? '✅ <b>Admin alert ulandi!</b>\n\nSayt xatolari va foydalanuvchi takliflari shu chatga keladi.'
          : 'ℹ️ Bu chat allaqachon admin alertlarga ulangan.',
      );
      return;
    }

    if (update.message?.text?.startsWith('/start') && chatId) {
      this.pendingDeclineReasons.delete(chatId);
      this.pendingChatReplies.delete(chatId);
      await this.handleStart(chatId, update.message.text);
      return;
    }

    if (update.message?.text && chatId && !update.message.text.startsWith('/')) {
      const reply = update.message.reply_to_message;
      const replySource = reply?.text ?? reply?.caption ?? null;
      const replyMessageId = reply?.message_id;
      await this.handleTextMessage(
        chatId,
        update.message.text,
        replySource,
        replyMessageId,
      );
      return;
    }

    if (update.callback_query) {
      await this.handleCallback(update.callback_query);
    }
  }

  private parseStartToken(text: string): string | null {
    const trimmed = text.trim();
    const match = trimmed.match(/^\/start(?:@[\w_]+)?(?:\s+(.+))?$/i);
    return match?.[1]?.trim() ?? null;
  }

  private async handleStart(chatId: string, text: string) {
    const token = this.parseStartToken(text);

    if (!token) {
      const username = await this.telegram.getBotUsername();
      await this.telegram.sendMessage(
        chatId,
        '👋 <b>UstaTop botiga xush kelibsiz!</b>\n\n' +
          'Telegramni ulash uchun UstaTop ilovasidan ' +
          '<b>«Telegram\'ga ulash»</b> tugmasini bosing.\n\n' +
          '• <b>Usta:</b> Kabinet sahifasidan\n' +
          '• <b>Mijoz:</b> Profil sahifasidan\n\n' +
          'Ochilgan havoladagi <b>Start</b> tugmasini bosing — ' +
          'qo\'lda /start yozmang.\n\n' +
          (username ? `Bot: @${username}` : ''),
      );
      return;
    }

    if (token.startsWith('c_')) {
      await this.linkCustomer(chatId, token);
      return;
    }

    await this.linkMaster(chatId, token);
  }

  private async linkCustomer(chatId: string, token: string) {
    const alreadyLinked = await this.prisma.user.findFirst({
      where: { telegramChatId: chatId },
      select: { name: true, role: true },
    });
    if (alreadyLinked) {
      await this.telegram.sendMessage(
        chatId,
        `✅ <b>Allaqachon ulangan!</b>\n\n` +
          `Salom, ${alreadyLinked.name ?? 'Mijoz'}! Buyurtma yangilanishlari shu chatga keladi.`,
      );
      return;
    }

    const user = await this.prisma.user.findFirst({
      where: { telegramLinkToken: token },
      select: { id: true, name: true },
    });

    if (!user) {
      this.logger.warn(`Customer Telegram link token topilmadi`);
      await this.telegram.sendMessage(
        chatId,
        '❌ Ulanish havolasi noto\'g\'ri yoki muddati tugagan.\n\n' +
          'UstaTop → Profil → <b>Telegram\'ga ulash</b> tugmasini qayta bosing.',
      );
      return;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        telegramChatId: chatId,
        telegramLinkToken: null,
      },
    });

    await this.telegram.sendMessage(
      chatId,
      `✅ <b>Muvaffaqiyatli ulandi!</b>\n\n` +
        `Salom, ${user.name ?? 'Mijoz'}! Endi usta buyurtmani ` +
        `qabul qilganda, yo'lga chiqqanda va yakunlaganda ` +
        `xabar shu Telegram chatiga keladi.\n\n` +
        `💬 Ustaga yozish: xabardagi <b>Javob yozish</b> tugmasini bosing.`,
    );
  }

  private async linkMaster(chatId: string, token: string) {
    const alreadyLinked = await this.prisma.masterProfile.findFirst({
      where: { telegramChatId: chatId },
      include: { user: { select: { name: true } } },
    });
    if (alreadyLinked) {
      await this.telegram.sendMessage(
        chatId,
        `✅ <b>Allaqachon ulangan!</b>\n\n` +
          `Salom, ${alreadyLinked.user.name ?? 'Usta'}! Buyurtmalar shu chatga keladi.`,
      );
      return;
    }

    const profile = await this.prisma.masterProfile.findFirst({
      where: { telegramLinkToken: token },
      include: { user: { select: { name: true } } },
    });

    if (!profile) {
      this.logger.warn(`Telegram link token topilmadi (uzunlik: ${token.length})`);
      await this.telegram.sendMessage(
        chatId,
        '❌ Ulanish havolasi noto\'g\'ri yoki muddati tugagan.\n\n' +
          'UstaTop dashboard → <b>Telegram\'ga ulash</b> tugmasini qayta bosing ' +
          'va ochilgan havoladagi <b>Start</b> ni bosing.',
      );
      return;
    }

    await this.prisma.masterProfile.update({
      where: { id: profile.id },
      data: {
        telegramChatId: chatId,
        telegramLinkToken: null,
      },
    });

    await this.telegram.sendMessage(
      chatId,
      `✅ <b>Muvaffaqiyatli ulandi!</b>\n\n` +
        `Salom, ${profile.user.name ?? 'Usta'}! Endi yangi buyurtmalar ` +
        `shu Telegram chatiga yuboriladi.\n\n` +
        `📲 <b>Telegram orqali:</b>\n` +
        `• Buyurtmani qabul qilish / rad etish\n` +
        `• Yo'lga chiqish, ishni boshlash\n` +
        `• Ishni yakunlash\n` +
        `• Mijozga yozish: <b>Javob yozish</b> tugmasi`,
    );
  }

  private async handleTextMessage(
    chatId: string,
    text: string,
    replyToText?: string | null,
    replyMessageId?: number,
  ) {
    const pendingDecline = this.pendingDeclineReasons.get(chatId);
    if (pendingDecline) {
      await this.handleDeclineReasonText(chatId, text, pendingDecline);
      return;
    }

    const pendingChatOrderId = this.pendingChatReplies.get(chatId);
    if (pendingChatOrderId) {
      this.pendingChatReplies.delete(chatId);
      await this.handleOrderChatReply(chatId, pendingChatOrderId, text);
      return;
    }

    const orderId =
      (replyMessageId != null
        ? this.telegram.resolveOrderFromMessage(chatId, replyMessageId)
        : null) ?? this.telegram.extractOrderIdFromText(replyToText);

    if (!orderId) {
      await this.telegram.sendMessage(
        chatId,
        '💬 Buyurtma chatiga yozish oson:\n\n' +
          '1) Bot yuborgan xabardagi <b>💬 Javob yozish</b> tugmasini bosing\n' +
          '2) Keyin oddiy matn yozing — xabar chatga tushadi\n\n' +
          'Yoki buyurtmani UstaTop webdan ochib yozing.',
      );
      return;
    }

    await this.handleOrderChatReply(chatId, orderId, text);
  }

  private async handleDeclineReasonText(
    chatId: string,
    text: string,
    pending: PendingDecline,
  ) {
    const reason = text.trim();
    if (reason.length < 3) {
      await this.telegram.sendMessage(
        chatId,
        '⚠️ Sabab kamida 3 ta belgidan iborat bo\'lishi kerak. Qayta yozing yoki /start bilan bekor qiling.',
      );
      return;
    }
    if (reason.length > 500) {
      await this.telegram.sendMessage(
        chatId,
        '⚠️ Sabab juda uzun (maks. 500 belgi). Qisqartiring.',
      );
      return;
    }

    const order = await this.loadOrderForMaster(pending.orderId, chatId);
    if (!order?.masterId || order.status !== OrderStatus.pending) {
      this.pendingDeclineReasons.delete(chatId);
      await this.telegram.sendMessage(chatId, '❌ Buyurtma endi rad etib bo\'lmaydi.');
      return;
    }

    try {
      await this.orders.declineFromTelegram(pending.orderId, order.masterId, reason);
      this.pendingDeclineReasons.delete(chatId);

      if (pending.orderMessageId) {
        await this.telegram.editMessage(
          chatId,
          pending.orderMessageId,
          this.telegram.formatOrderMessage(
            order,
            '❌ <b>Buyurtma rad etildi</b>',
          ) + `\n\n<b>Sabab:</b> ${this.escapeHtml(reason)}`,
        );
      } else {
        await this.telegram.sendMessage(
          chatId,
          `❌ <b>Buyurtma rad etildi</b>\n\n<b>Sabab:</b> ${this.escapeHtml(reason)}`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Xatolik';
      await this.telegram.sendMessage(chatId, `❌ ${message}`);
    }
  }

  private async handleOrderChatReply(
    chatId: string,
    orderId: string,
    text: string,
  ) {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) {
      await this.telegram.sendMessage(
        chatId,
        '⚠️ Xabar juda uzun (maks. 2000 belgi).',
      );
      return;
    }

    const user = await this.resolveTelegramUser(chatId);
    if (!user) {
      await this.telegram.sendMessage(
        chatId,
        '❌ Avval Telegramni UstaTop profilidan ulang.',
      );
      return;
    }

    try {
      await this.messages.sendMessage(orderId, user, { text: trimmed });
      await this.telegram.sendTrackedMessage(
        chatId,
        '✅ <b>Xabar yuborildi.</b>\n\nYana yozish uchun tugmani bosing.',
        orderId,
        this.telegram.chatReplyKeyboard(orderId),
      );
    } catch (err) {
      const raw = this.exceptionMessage(err);
      const friendly =
        raw === 'Chat is closed for this order'
          ? 'Bu buyurtma chati yopilgan.'
          : raw === 'Access denied'
            ? 'Bu buyurtmaga ruxsat yo\'q.'
            : raw === 'Order not found'
              ? 'Buyurtma topilmadi.'
              : raw;
      await this.telegram.sendMessage(chatId, `❌ ${friendly}`);
    }
  }

  private exceptionMessage(err: unknown): string {
    if (
      err instanceof BadRequestException ||
      err instanceof ForbiddenException ||
      err instanceof NotFoundException
    ) {
      const res = err.getResponse();
      if (typeof res === 'string') return res;
      if (res && typeof res === 'object' && 'message' in res) {
        const msg = (res as { message: string | string[] }).message;
        return Array.isArray(msg) ? (msg[0] ?? err.message) : msg;
      }
    }
    return err instanceof Error ? err.message : 'Xatolik';
  }

  private async resolveTelegramUser(chatId: string): Promise<User | null> {
    const byUser = await this.prisma.user.findFirst({
      where: { telegramChatId: chatId },
    });
    if (byUser) return byUser;

    const profile = await this.prisma.masterProfile.findFirst({
      where: { telegramChatId: chatId },
      include: { user: true },
    });
    return profile?.user ?? null;
  }

  private async handleCallback(callback: {
    id: string;
    data?: string;
    message?: { message_id: number; chat: { id: number } };
  }) {
    const chatId = String(callback.message?.chat.id ?? '');
    const messageId = callback.message?.message_id;
    const data = callback.data ?? '';
    const parts = data.split(':');
    const action = parts[0];
    const orderId = parts[1];
    const extra = parts.slice(2).join(':');

    if (!orderId) {
      await this.telegram.answerCallback(callback.id, 'Noto\'g\'ri so\'rov');
      return;
    }

    if (action === 'ch') {
      await this.handleChatReplyStart(callback.id, chatId, orderId);
      return;
    }

    if (action === 'dc') {
      await this.handleDeclineCancel(callback.id, chatId, messageId, orderId);
      return;
    }

    if (action === 'dr') {
      await this.handleDeclineReasonSelect(
        callback.id,
        chatId,
        messageId,
        orderId,
        extra,
      );
      return;
    }

    if (action === 'st') {
      await this.handleStatusUpdate(
        callback.id,
        chatId,
        messageId,
        orderId,
        extra as OrderStatus,
      );
      return;
    }

    if (!['accept', 'decline'].includes(action)) {
      await this.telegram.answerCallback(callback.id, 'Noto\'g\'ri so\'rov');
      return;
    }

    const order = await this.loadOrderForMaster(orderId, chatId);
    if (!order?.masterId) {
      await this.telegram.answerCallback(callback.id, 'Buyurtma topilmadi');
      return;
    }

    if (order.status !== OrderStatus.pending) {
      await this.telegram.answerCallback(
        callback.id,
        `Buyurtma allaqachon: ${order.status}`,
      );
      if (messageId) {
        await this.telegram.editMessage(
          chatId,
          messageId,
          this.telegram.formatOrderMessage(
            order,
            'ℹ️ <b>Buyurtma holati yangilandi</b>',
          ) + `\n\n<b>Holat:</b> ${order.status}`,
        );
      }
      return;
    }

    try {
      if (action === 'accept') {
        this.pendingDeclineReasons.delete(chatId);
        await this.orders.acceptFromTelegram(orderId, order.masterId);
        await this.telegram.answerCallback(callback.id, '✅ Buyurtma qabul qilindi!');
        const freshOrder = await this.loadOrderForMaster(orderId, chatId);
        if (messageId && freshOrder) {
          await this.telegram.editMessage(
            chatId,
            messageId,
            this.telegram.formatOrderMessage(
              freshOrder,
              this.telegram.statusHeader(OrderStatus.accepted),
            ),
            this.telegram.orderStatusKeyboard(orderId, OrderStatus.accepted),
          );
        }
      } else {
        await this.telegram.answerCallback(callback.id, 'Rad etish sababini tanlang');
        if (messageId) {
          await this.telegram.editMessage(
            chatId,
            messageId,
            this.telegram.formatOrderMessage(order, '❌ <b>Rad etish sababi</b>') +
              '\n\nQuyidagilardan birini tanlang:',
            this.telegram.declineReasonsKeyboard(orderId),
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Xatolik';
      await this.telegram.answerCallback(callback.id, message);
    }
  }

  private async handleStatusUpdate(
    callbackId: string,
    chatId: string,
    messageId: number | undefined,
    orderId: string,
    nextStatus: OrderStatus,
  ) {
    const order = await this.loadOrderForMaster(orderId, chatId);
    if (!order?.masterId) {
      await this.telegram.answerCallback(callbackId, 'Buyurtma topilmadi');
      return;
    }

    if (
      order.status === OrderStatus.completed ||
      order.status === OrderStatus.cancelled
    ) {
      await this.telegram.answerCallback(callbackId, 'Buyurtma allaqachon yakunlangan');
      return;
    }

    try {
      const updated = await this.orders.updateStatusFromTelegram(
        orderId,
        order.masterId,
        nextStatus,
      );
      const freshOrder = await this.loadOrderForMaster(orderId, chatId);
      const statusLabel =
        nextStatus === OrderStatus.on_the_way
          ? "🚗 Yo'lga chiqdingiz"
          : nextStatus === OrderStatus.in_progress
            ? '🔧 Ish boshlandi'
            : '✅ Ish yakunlandi';

      await this.telegram.answerCallback(callbackId, statusLabel);

      if (messageId && freshOrder) {
        const keyboard = this.telegram.orderStatusKeyboard(orderId, updated.status);
        await this.telegram.editMessage(
          chatId,
          messageId,
          this.telegram.formatOrderMessage(
            freshOrder,
            this.telegram.statusHeader(updated.status),
          ),
          keyboard ?? undefined,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Xatolik';
      await this.telegram.answerCallback(callbackId, message);
    }
  }

  private async handleChatReplyStart(
    callbackId: string,
    chatId: string,
    orderId: string,
  ) {
    this.pendingDeclineReasons.delete(chatId);
    this.pendingChatReplies.set(chatId, orderId);

    await this.telegram.answerCallback(callbackId, 'Javobingizni yozing');
    await this.telegram.sendTrackedMessage(
      chatId,
      '✍️ <b>Javobingizni yozing</b>\n\n' +
        'Keyingi xabaringiz buyurtma chatiga yuboriladi.\n' +
        'Bekor qilish: /start',
      orderId,
    );
  }

  private async handleDeclineCancel(
    callbackId: string,
    chatId: string,
    messageId: number | undefined,
    orderId: string,
  ) {
    this.pendingDeclineReasons.delete(chatId);
    const order = await this.loadOrderForMaster(orderId, chatId);
    if (!order) {
      await this.telegram.answerCallback(callbackId, 'Buyurtma topilmadi');
      return;
    }

    await this.telegram.answerCallback(callbackId, 'Bekor qilindi');
    if (messageId) {
      await this.telegram.editMessage(
        chatId,
        messageId,
        this.telegram.formatOrderMessage(order),
        this.telegram.orderActionKeyboard(orderId),
      );
    }
  }

  private async handleDeclineReasonSelect(
    callbackId: string,
    chatId: string,
    messageId: number | undefined,
    orderId: string,
    reasonKey: string,
  ) {
    const order = await this.loadOrderForMaster(orderId, chatId);
    if (!order?.masterId) {
      await this.telegram.answerCallback(callbackId, 'Buyurtma topilmadi');
      return;
    }

    if (order.status !== OrderStatus.pending) {
      await this.telegram.answerCallback(callbackId, 'Buyurtma allaqachon yangilangan');
      return;
    }

    if (reasonKey === 'other') {
      this.pendingDeclineReasons.set(chatId, {
        orderId,
        orderMessageId: messageId,
      });
      await this.telegram.answerCallback(callbackId, 'Sababni yozing');
      if (messageId) {
        await this.telegram.editMessage(
          chatId,
          messageId,
          this.telegram.formatOrderMessage(order, '✏️ <b>Boshqa sabab</b>') +
            '\n\nRad etish sababini matn ko\'rinishida yozing.\n' +
            '<i>(Kamida 3 ta belgi)</i>',
        );
      }
      await this.telegram.sendMessage(
        chatId,
        '📝 Iltimos, rad etish sababingizni shu xabarga javob sifatida yozing.',
      );
      return;
    }

    const reasonText = getDeclineReasonText(reasonKey);
    if (!reasonText) {
      await this.telegram.answerCallback(callbackId, 'Noto\'g\'ri sabab');
      return;
    }

    try {
      await this.orders.declineFromTelegram(orderId, order.masterId, reasonText);
      this.pendingDeclineReasons.delete(chatId);
      await this.telegram.answerCallback(callbackId, '❌ Buyurtma rad etildi');
      if (messageId) {
        await this.telegram.editMessage(
          chatId,
          messageId,
          this.telegram.formatOrderMessage(
            order,
            '❌ <b>Buyurtma rad etildi</b>',
          ) + `\n\n<b>Sabab:</b> ${reasonText}`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Xatolik';
      await this.telegram.answerCallback(callbackId, message);
    }
  }

  private async loadOrderForMaster(orderId: string, chatId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        master: {
          include: { masterProfile: { select: { telegramChatId: true } } },
        },
        service: true,
        client: { select: { name: true, phone: true } },
      },
    });

    if (!order?.masterId) return null;

    const masterChatId = order.master?.masterProfile?.telegramChatId;
    if (masterChatId !== chatId) return null;

    return order;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
