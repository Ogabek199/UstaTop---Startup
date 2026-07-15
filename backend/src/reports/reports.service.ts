import { Injectable, Logger } from '@nestjs/common';
import { TelegramService } from '../telegram/telegram.service';
import type { CreateReportDto } from './dto/create-report.dto';

const TYPE_LABELS: Record<CreateReportDto['type'], string> = {
  error: '🐛 Client xato',
  api_error: '🔴 API xato',
  page_error: '📄 Sahifa ishlamayapti',
  suggestion: '💡 Taklif',
  feedback: '📩 Fikr-mulohaza',
};

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly recentKeys = new Map<string, number>();

  constructor(private telegram: TelegramService) {}

  async create(dto: CreateReportDto, opts?: { ip?: string }) {
    const key = [
      opts?.ip ?? 'unknown',
      dto.type,
      dto.message.slice(0, 80),
      dto.pageUrl ?? '',
    ].join('|');

    const now = Date.now();
    const last = this.recentKeys.get(key);
    if (last && now - last < 60_000) {
      return { ok: true, deduped: true };
    }
    this.recentKeys.set(key, now);
    this.pruneKeys(now);

    const sent = await this.telegram.sendAdminAlert(this.formatMessage(dto));

    if (!sent) {
      this.logger.warn(
        `Admin alert yuborilmadi (${dto.type}): chat ID yoki bot token yo'q`,
      );
    }

    return { ok: true, sent };
  }

  private formatMessage(dto: CreateReportDto): string {
    const lines = [
      TYPE_LABELS[dto.type] ?? `ℹ️ ${dto.type}`,
      '',
      `<b>Xabar:</b>`,
      escapeHtml(dto.message),
    ];

    if (dto.pageUrl) {
      lines.push('', `<b>Sahifa:</b> ${escapeHtml(dto.pageUrl)}`);
    }
    if (dto.apiPath) {
      lines.push(`<b>API:</b> ${escapeHtml(dto.apiPath)}`);
    }
    if (dto.statusCode) {
      lines.push(`<b>Status:</b> ${escapeHtml(dto.statusCode)}`);
    }
    if (dto.userName || dto.userPhone || dto.userId) {
      lines.push('');
      if (dto.userName) {
        lines.push(`<b>Foydalanuvchi:</b> ${escapeHtml(dto.userName)}`);
      }
      if (dto.userPhone) {
        lines.push(`<b>Telefon:</b> ${escapeHtml(dto.userPhone)}`);
      }
      if (dto.userRole) {
        lines.push(`<b>Rol:</b> ${escapeHtml(dto.userRole)}`);
      }
      if (dto.userId) {
        lines.push(`<b>ID:</b> <code>${escapeHtml(dto.userId)}</code>`);
      }
    } else if (dto.contact) {
      lines.push('', `<b>Aloqa:</b> ${escapeHtml(dto.contact)}`);
    }
    if (dto.userAgent) {
      lines.push(
        '',
        `<b>Qurilma:</b> ${escapeHtml(dto.userAgent.slice(0, 200))}`,
      );
    }

    lines.push('', `<i>${new Date().toLocaleString('uz-UZ')}</i>`);
    return lines.join('\n');
  }

  private pruneKeys(now: number) {
    if (this.recentKeys.size < 200) return;
    for (const [k, ts] of this.recentKeys) {
      if (now - ts > 5 * 60_000) this.recentKeys.delete(k);
    }
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
