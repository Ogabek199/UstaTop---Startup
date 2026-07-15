import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  CheckPhoneDto,
  LoginDto,
  RegisterDto,
  SendOtpDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { UserRole, Prisma } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async checkPhone(dto: CheckPhoneDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      select: { role: true, passwordHash: true },
    });

    return {
      exists: !!user,
      hasPassword: !!user?.passwordHash,
      role: user?.role ?? null,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid phone or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid phone or password');
    }

    if (
      dto.role &&
      user.role !== UserRole.admin &&
      dto.role !== user.role
    ) {
      throw new BadRequestException(
        user.role === UserRole.customer
          ? 'CUSTOMER_ACCOUNT'
          : 'PROFESSIONAL_ACCOUNT',
      );
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async register(dto: RegisterDto) {
    return this.createAccount(dto);
  }

  async sendOtp(dto: SendOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      select: { passwordHash: true },
    });

    if (user?.passwordHash) {
      throw new BadRequestException(
        'Account already exists. Please login with your password.',
      );
    }

    const code = this.generateOtp();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.otpCode.deleteMany({ where: { phone: dto.phone } });
    await this.prisma.otpCode.create({
      data: { phone: dto.phone, codeHash, expiresAt },
    });

    const mockSms = this.config.get('MOCK_SMS') !== 'false';
    if (mockSms) {
      this.logger.log(`[MOCK SMS] OTP for ${dto.phone}: ${code}`);
      return {
        message: 'OTP sent',
        mock: true,
        code: process.env.NODE_ENV === 'development' ? code : undefined,
      };
    }

    return { message: 'OTP sent' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone: dto.phone },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new BadRequestException('OTP not found. Request a new code.');
    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('OTP expired');
    }
    if (otp.attempts >= 3) {
      throw new BadRequestException('Too many attempts');
    }

    const valid = await bcrypt.compare(dto.code, otp.codeHash);
    if (!valid) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.otpCode.delete({ where: { id: otp.id } });

    const { code: _code, ...registerDto } = dto;
    return this.createAccount(registerDto);
  }

  private async createAccount(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existingUser?.passwordHash) {
      throw new BadRequestException(
        'Account already exists. Please login with your password.',
      );
    }

    if (
      existingUser &&
      dto.role &&
      existingUser.role !== UserRole.admin &&
      dto.role !== existingUser.role
    ) {
      throw new BadRequestException(
        existingUser.role === UserRole.customer
          ? 'CUSTOMER_ACCOUNT'
          : 'PROFESSIONAL_ACCOUNT',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      let account = existingUser;

      if (!account) {
        if (!dto.role) {
          throw new BadRequestException('Role is required for new users');
        }
        account = await tx.user.create({
          data: {
            phone: dto.phone,
            name: dto.name,
            role: dto.role,
            passwordHash,
            isVerified: true,
          },
        });
      } else {
        account = await tx.user.update({
          where: { id: account.id },
          data: {
            name: dto.name ?? account.name,
            passwordHash,
            isVerified: true,
          },
        });
      }

      if (account.role === UserRole.professional) {
        const priceMin = dto.priceMin ?? 0;
        const priceMax = dto.priceMax ?? priceMin;
        const serviceCategoryIds = await this.resolveServiceIds(
          tx,
          dto.serviceCategoryIds ?? [],
          dto.customServiceNames ?? [],
        );

        if (serviceCategoryIds.length === 0) {
          throw new BadRequestException('At least one service is required');
        }

        await tx.masterProfile.upsert({
          where: { userId: account.id },
          create: {
            userId: account.id,
            district: dto.district,
            serviceCategoryIds,
            priceMin,
            priceMax,
            bio: dto.bio,
            experienceYears: dto.experienceYears ?? 0,
            isApproved: true,
            portfolioImages: [],
          },
          update: {
            district: dto.district ?? undefined,
            serviceCategoryIds,
            priceMin: dto.priceMin ?? undefined,
            priceMax: dto.priceMax ?? undefined,
            bio: dto.bio ?? undefined,
            experienceYears: dto.experienceYears ?? undefined,
            isApproved: true,
          },
        });
      }

      return account;
    });

    const userWithProfile = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { masterProfile: true },
    });

    const tokens = await this.generateTokens(user.id, user.phone, user.role);
    return {
      user: this.sanitizeUser(userWithProfile ?? user),
      masterProfile: userWithProfile?.masterProfile ?? null,
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) throw new UnauthorizedException();
      return this.generateTokens(user.id, user.phone, user.role);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(
    userId: string,
    phone: string,
    role: UserRole,
  ) {
    const payload = { sub: userId, phone, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async resolveServiceIds(
    tx: Prisma.TransactionClient,
    selectedIds: string[],
    customNames: string[],
  ): Promise<string[]> {
    const ids = [...new Set(selectedIds.filter(Boolean))];

    for (const rawName of customNames) {
      const name = rawName.trim();
      if (!name) continue;

      const existing = await tx.service.findFirst({
        where: {
          OR: [
            { id: name },
            { nameUz: { equals: name, mode: 'insensitive' } },
            { nameRu: { equals: name, mode: 'insensitive' } },
          ],
        },
      });

      if (existing) {
        if (!ids.includes(existing.id)) ids.push(existing.id);
        continue;
      }

      await tx.service.create({
        data: {
          id: name,
          nameUz: name,
          nameRu: name,
          category: 'custom',
          isActive: true,
        },
      });
      ids.push(name);
    }

    return ids;
  }

  private sanitizeUser(user: {
    id: string;
    phone: string;
    name: string | null;
    role: UserRole;
    isVerified: boolean;
    avatarUrl: string | null;
    language: string;
    createdAt: Date;
    passwordHash?: string | null;
    masterProfile?: unknown;
  }) {
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      avatarUrl: user.avatarUrl,
      language: user.language,
      createdAt: user.createdAt,
    };
  }
}
