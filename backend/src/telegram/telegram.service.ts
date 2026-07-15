import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order, Service, User, OrderStatus } from '@prisma/client';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DECLINE_REASONS } from './decline-reasons';
import {
  ORDER_STATUS_HEADERS,
  TELEGRAM_STATUS_ACTIONS,
} from './order-status-actions';

type InlineKeyboard = {
  inline_keyboard: { text: string; callback_data: string }[][];
};

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token: string | undefined;
  private readonly adminToken: string | undefined;
  private readonly adminChatIds = new Set<string>();
  private readonly adminChatsFile: string;
  private botUsername: string | null = null;
  /** `${chatId}:${telegramMessageId}` → orderId (for Reply without showing UUID) */
  private readonly messageOrderMap = new Map<string, string>();
  /** orderId → Telegram message with action buttons */
  private readonly orderActionMessageMap = new Map<
    string,
    { chatId: string; messageId: number }
  >();

  constructor(private config: ConfigService) {
    this.token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    this.adminToken =
      this.config.get<string>('TELEGRAM_ADMIN_BOT_TOKEN') || this.token;
    this.adminChatsFile = join(process.cwd(), 'data', 'admin-telegram-chats.json');

    const fromEnv = this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID') ?? '';
    for (const id of fromEnv.split(',').map((s) => s.trim()).filter(Boolean)) {
      this.adminChatIds.add(id);
    }
  }

  onModuleInit() {
    this.loadPersistedAdminChats();
    if (this.adminToken && this.adminChatIds.size === 0) {
      this.logger.warn(
        'Admin Telegram chat yo\'q. Botga /start yuboring yoki TELEGRAM_ADMIN_CHAT_ID qo\'ying.',
      );
    } else if (this.adminChatIds.size > 0) {
      this.logger.log(
        `Admin Telegram alertlar: ${this.adminChatIds.size} ta chat`,
      );
    }
  }

  get isEnabled(): boolean {
    return !!this.token;
  }

  get isAdminAlertEnabled(): boolean {
    return !!this.adminToken && this.adminChatIds.size > 0;
  }

  get adminBotToken(): string | undefined {
    return this.adminToken;
  }

  /** Same token as order bot → reuse main poller; separate token → admin poller. */
  get usesSeparateAdminBot(): boolean {
    return !!this.adminToken && this.adminToken !== this.token;
  }

  registerAdminChat(chatId: string): boolean {
    if (this.adminChatIds.has(chatId)) return false;
    this.adminChatIds.add(chatId);
    this.persistAdminChats();
    this.logger.log(`Admin chat qo'shildi: ${chatId}`);
    return true;
  }

  async sendAdminAlert(text: string): Promise<boolean> {
    if (!this.adminToken || this.adminChatIds.size === 0) return false;

    let anySent = false;
    for (const chatId of this.adminChatIds) {
      const messageId = await this.apiCallWithToken<{ message_id: number }>(
        this.adminToken,
        'sendMessage',
        {
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        },
      );
      if (messageId?.message_id != null) anySent = true;
    }
    return anySent;
  }

  async getAdminBotUpdates(
    offset: number,
    timeout = 25,
  ): Promise<TelegramUpdate[] | null> {
    if (!this.adminToken) return null;
    return this.apiCallWithToken<TelegramUpdate[]>(
      this.adminToken,
      'getUpdates',
      {
        offset,
        timeout,
        allowed_updates: ['message'],
      },
    );
  }

  async sendAdminBotMessage(chatId: string, text: string): Promise<void> {
    if (!this.adminToken) return;
    await this.apiCallWithToken(this.adminToken, 'sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
  }

  private loadPersistedAdminChats() {
    try {
      if (!existsSync(this.adminChatsFile)) return;
      const raw = JSON.parse(
        readFileSync(this.adminChatsFile, 'utf8'),
      ) as { chatIds?: string[] };
      for (const id of raw.chatIds ?? []) {
        if (id) this.adminChatIds.add(String(id));
      }
    } catch (err) {
      this.logger.warn(
        `Admin chat faylini o'qib bo'lmadi: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  private persistAdminChats() {
    try {
      const dir = join(process.cwd(), 'data');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(
        this.adminChatsFile,
        JSON.stringify({ chatIds: [...this.adminChatIds] }, null, 2),
      );
    } catch (err) {
      this.logger.warn(
        `Admin chat faylini yozib bo'lmadi: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  async getBotUsername(): Promise<string | null> {
    if (this.botUsername) return this.botUsername;
    const me = await this.apiCall<{ username?: string }>('getMe');
    this.botUsername = me?.username ?? null;
    return this.botUsername;
  }

  async sendMessage(
    chatId: string,
    text: string,
    replyMarkup?: InlineKeyboard,
  ): Promise<number | null> {
    const result = await this.apiCall<{ message_id: number }>('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
    return result?.message_id ?? null;
  }

  /** Send and remember which order the Telegram message belongs to. */
  async sendTrackedMessage(
    chatId: string,
    text: string,
    orderId: string,
    replyMarkup?: InlineKeyboard,
  ): Promise<number | null> {
    const messageId = await this.sendMessage(chatId, text, replyMarkup);
    if (messageId != null) {
      this.rememberMessageOrder(chatId, messageId, orderId);
    }
    return messageId;
  }

  rememberMessageOrder(chatId: string, messageId: number, orderId: string) {
    this.messageOrderMap.set(`${chatId}:${messageId}`, orderId);
    if (this.messageOrderMap.size > 5000) {
      const first = this.messageOrderMap.keys().next().value;
      if (first) this.messageOrderMap.delete(first);
    }
  }

  /** Track Telegram message that still has Accept/Decline (or status) buttons. */
  rememberOrderActionMessage(
    orderId: string,
    chatId: string,
    messageId: number,
  ) {
    this.orderActionMessageMap.set(orderId, { chatId, messageId });
  }

  async clearOrderActionButtons(
    orderId: string,
    text: string,
  ): Promise<void> {
    const ref = this.orderActionMessageMap.get(orderId);
    if (!ref) return;
    try {
      await this.editMessage(ref.chatId, ref.messageId, text, {
        inline_keyboard: [],
      });
    } catch (err) {
      this.logger.warn(
        `Failed to clear Telegram buttons for order ${orderId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    } finally {
      this.orderActionMessageMap.delete(orderId);
    }
  }

  resolveOrderFromMessage(
    chatId: string,
    messageId: number,
  ): string | null {
    return this.messageOrderMap.get(`${chatId}:${messageId}`) ?? null;
  }

  withOrderReplyHint(text: string): string {
    return (
      `${text}\n\n` +
      `👇 Javob berish: <b>Javob yozish</b> tugmasini bosing.`
    );
  }

  /** Fallback for old messages that still contain #o:uuid */
  extractOrderIdFromText(text?: string | null): string | null {
    if (!text) return null;
    const match = text.match(
      /#o:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    );
    return match?.[1] ?? null;
  }

  formatIncomingChatMessage(opts: {
    fromCustomer: boolean;
    name: string;
    phone?: string | null;
    serviceName?: string | null;
    preview: string;
  }): string {
    const title = opts.fromCustomer
      ? '💬 <b>Mijozdan yangi xabar</b>'
      : '💬 <b>Ustadan yangi xabar</b>';

    const lines = [
      title,
      '',
      `👤 <b>Ism:</b> ${escapeTelegramHtml(opts.name)}`,
    ];
    if (opts.phone) {
      lines.push(`📞 <b>Telefon:</b> ${escapeTelegramHtml(opts.phone)}`);
    }
    if (opts.serviceName) {
      lines.push(`📋 <b>Xizmat:</b> ${escapeTelegramHtml(opts.serviceName)}`);
    }
    lines.push('', escapeTelegramHtml(opts.preview));
    lines.push('', '👇 Javob berish uchun tugmani bosing:');
    return lines.join('\n');
  }

  chatReplyKeyboard(orderId: string): InlineKeyboard {
    return {
      inline_keyboard: [
        [{ text: '💬 Javob yozish', callback_data: `ch:${orderId}` }],
      ],
    };
  }

  async editMessage(
    chatId: string,
    messageId: number,
    text: string,
    replyMarkup?: InlineKeyboard | null,
  ): Promise<void> {
    const markup =
      replyMarkup === undefined
        ? { inline_keyboard: [] }
        : replyMarkup === null
          ? undefined
          : replyMarkup;

    await this.apiCall('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: markup,
    });
  }

  async answerCallback(callbackQueryId: string, text: string): Promise<void> {
    await this.apiCall('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text,
      show_alert: text.length > 50,
    });
  }

  async getUpdates(offset: number, timeout = 30): Promise<TelegramUpdate[] | null> {
    return this.apiCall<TelegramUpdate[]>('getUpdates', {
      offset,
      timeout,
      allowed_updates: ['message', 'callback_query'],
    });
  }

  formatOrderMessage(
    order: Order & {
      service: Service;
      client: Pick<User, 'name' | 'phone'>;
    },
    header = '🆕 <b>Yangi buyurtma!</b>',
  ): string {
    const lines = [
      header,
      '',
      `📋 <b>Xizmat:</b> ${order.service.nameUz}`,
      `👤 <b>Mijoz:</b> ${order.client.name ?? '—'}`,
      `📞 <b>Telefon:</b> ${order.client.phone}`,
      `📍 <b>Manzil:</b> ${order.address ?? '—'}`,
      `💰 <b>Narx:</b> ${order.price.toLocaleString('uz-UZ')} so'm`,
    ];

    if (order.description) {
      lines.push(`📝 <b>Tavsif:</b> ${order.description}`);
    }
    if (order.scheduledAt) {
      lines.push(
        `🕐 <b>Vaqt:</b> ${new Date(order.scheduledAt).toLocaleString('uz-UZ')}`,
      );
    }
    if (order.isExpress) {
      lines.push('⚡ <b>Tezkor buyurtma</b>');
    }

    return lines.join('\n');
  }

  formatClientStatusMessage(
    order: {
      id: string;
      address?: string | null;
      cancelReason?: string | null;
      service?: { nameUz: string } | null;
      master?: { name: string | null; phone?: string } | null;
    },
    type: 'accepted' | 'declined' | 'status' | 'cancelled',
    status?: OrderStatus,
  ): string {
    const serviceName = order.service?.nameUz ?? 'Buyurtma';
    const masterName = order.master?.name ?? 'Usta';
    const masterPhone = order.master?.phone;

    const headers: Record<string, string> = {
      accepted: '✅ <b>Buyurtma qabul qilindi!</b>',
      declined: '❌ <b>Buyurtma rad etildi</b>',
      cancelled: '❌ <b>Buyurtma bekor qilindi</b>',
      [OrderStatus.on_the_way]: '🚗 <b>Usta yo\'lda</b>',
      [OrderStatus.in_progress]: '🔧 <b>Ish boshlandi</b>',
      [OrderStatus.completed]: '✅ <b>Ish yakunlandi!</b>',
    };

    let header = headers[type] ?? 'ℹ️ <b>Buyurtma yangilandi</b>';
    if (type === 'status' && status) {
      header = headers[status] ?? header;
    }

    const lines = [
      header,
      '',
      `📋 <b>Xizmat:</b> ${serviceName}`,
      `👷 <b>Usta:</b> ${masterName}`,
    ];

    if (masterPhone) {
      lines.push(`📞 <b>Telefon:</b> ${masterPhone}`);
    }
    if (order.address) {
      lines.push(`📍 <b>Manzil:</b> ${order.address}`);
    }
    if (type === 'declined' && order.cancelReason) {
      lines.push(`📝 <b>Sabab:</b> ${order.cancelReason}`);
    }
    if (type === 'cancelled' && order.cancelReason) {
      lines.push(`📝 <b>Sabab:</b> ${order.cancelReason}`);
    }

    return lines.join('\n');
  }

  orderActionKeyboard(orderId: string): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '✅ Qabul qilish', callback_data: `accept:${orderId}` },
          { text: '❌ Rad etish', callback_data: `decline:${orderId}` },
        ],
        [{ text: '💬 Savol yozish', callback_data: `ch:${orderId}` }],
      ],
    };
  }

  declineReasonsKeyboard(orderId: string): InlineKeyboard {
    const rows: InlineKeyboard['inline_keyboard'] = DECLINE_REASONS.map(
      (reason) => [
        {
          text: reason.label,
          callback_data: `dr:${orderId}:${reason.key}`,
        },
      ],
    );
    rows.push([{ text: '↩️ Orqaga', callback_data: `dc:${orderId}` }]);
    return { inline_keyboard: rows };
  }

  orderStatusKeyboard(
    orderId: string,
    status: OrderStatus,
  ): InlineKeyboard | null {
    const actions = TELEGRAM_STATUS_ACTIONS[status];
    if (!actions?.length) return null;

    return {
      inline_keyboard: [
        ...actions.map((action) => [
          {
            text: action.label,
            callback_data: `st:${orderId}:${action.next}`,
          },
        ]),
        [{ text: '💬 Javob yozish', callback_data: `ch:${orderId}` }],
      ],
    };
  }

  statusHeader(status: OrderStatus): string {
    return ORDER_STATUS_HEADERS[status] ?? `ℹ️ <b>${status}</b>`;
  }

  private async apiCall<T = unknown>(
    method: string,
    body?: Record<string, unknown>,
  ): Promise<T | null> {
    if (!this.token) return null;
    return this.apiCallWithToken<T>(this.token, method, body);
  }

  private async apiCallWithToken<T = unknown>(
    token: string,
    method: string,
    body?: Record<string, unknown>,
  ): Promise<T | null> {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/${method}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        },
      );
      const data = (await res.json()) as {
        ok: boolean;
        result?: T;
        description?: string;
      };
      if (!data.ok) {
        this.logger.warn(
          `Telegram ${method}: ${data.description ?? 'unknown error'}`,
        );
        return null;
      }
      return (data.result as T) ?? null;
    } catch (err) {
      this.logger.error(`Telegram ${method} failed`, err);
      return null;
    }
  }
}

function escapeTelegramHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export type TelegramUpdate = {
  update_id: number;
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
    message?: {
      message_id: number;
      chat: { id: number };
    };
  };
};
