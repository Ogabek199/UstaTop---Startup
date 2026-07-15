import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePhoneDto } from './dto/change-phone.dto';
import { User } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private telegram: TelegramService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { masterProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.formatUser(user);
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      include: { masterProfile: true },
    });
    return this.formatUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.passwordHash) {
      throw new BadRequestException('Password is not set for this account');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password updated' };
  }

  async changePhone(userId: string, dto: ChangePhoneDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.passwordHash) {
      throw new BadRequestException('Password is not set for this account');
    }

    if (user.phone === dto.newPhone) {
      throw new BadRequestException('Phone number is already set');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const taken = await this.prisma.user.findUnique({
      where: { phone: dto.newPhone },
      select: { id: true },
    });
    if (taken) {
      throw new BadRequestException('Phone number already in use');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { phone: dto.newPhone },
      include: { masterProfile: true },
    });

    return this.formatUser(updated);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        'Faqat JPG, PNG yoki WebP rasmlar qabul qilinadi',
      );
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `${userId}-${randomUUID()}${ext}`;
    const filepath = path.join(uploadsDir, filename);
    await fs.writeFile(filepath, file.buffer);

    if (user.avatarUrl) {
      await this.deleteLocalAvatar(user.avatarUrl);
    }

    const port = this.config.get<string>('PORT') ?? '3001';
    const apiUrl =
      this.config.get<string>('API_URL') ?? `http://localhost:${port}`;
    const avatarUrl = `${apiUrl}/uploads/avatars/${filename}`;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      include: { masterProfile: true },
    });

    return this.formatUser(updated);
  }

  async getTelegramStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true, telegramLinkToken: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const connected = !!user.telegramChatId;
    let link: string | null = null;

    if (!connected && user.telegramLinkToken && this.telegram.isEnabled) {
      const username = await this.telegram.getBotUsername();
      if (username) {
        link = `https://t.me/${username}?start=${user.telegramLinkToken}`;
      }
    }

    return { connected, link };
  }

  async createTelegramLink(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.telegramChatId) {
      return { connected: true, link: null };
    }

    if (!this.telegram.isEnabled) {
      throw new BadRequestException('Telegram bot sozlanmagan');
    }

    const username = await this.telegram.getBotUsername();
    if (!username) {
      throw new BadRequestException("Telegram bot bilan bog'lanib bo'lmadi");
    }

    const token =
      user.telegramLinkToken ?? `c_${randomBytes(12).toString('base64url')}`;

    if (!user.telegramLinkToken) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { telegramLinkToken: token },
      });
    }

    const link = `https://t.me/${username}?start=${token}`;
    return { connected: false, link };
  }

  async disconnectTelegram(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        telegramChatId: null,
        telegramLinkToken: null,
      },
    });
    return { connected: false };
  }

  private async deleteLocalAvatar(avatarUrl: string) {
    try {
      const pathname = new URL(avatarUrl).pathname;
      const match = pathname.match(/\/uploads\/avatars\/([^/]+)$/);
      if (!match) return;

      const filepath = path.join(
        process.cwd(),
        'uploads',
        'avatars',
        match[1],
      );
      await fs.unlink(filepath);
    } catch {
      // Eski rasm yo'q bo'lsa yoki tashqi URL bo'lsa — e'tiborsiz qoldiramiz
    }
  }

  private formatUser(user: User & { masterProfile?: unknown }) {
    const {
      passwordHash: _passwordHash,
      telegramChatId: _telegramChatId,
      telegramLinkToken: _telegramLinkToken,
      masterProfile,
      ...rest
    } = user as User & {
      masterProfile?: unknown;
      passwordHash?: string | null;
    };
    return { ...rest, masterProfile: masterProfile ?? null };
  }
}
