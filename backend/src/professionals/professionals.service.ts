import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { appendFileSync } from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import {
  CreateProfessionalProfileDto,
  SearchProfessionalsDto,
  UpdateProfessionalProfileDto,
} from './dto/professional.dto';
import {
  AnalyticsPeriod,
  DashboardAnalyticsDto,
} from './dto/analytics.dto';

@Injectable()
export class ProfessionalsService {
  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  async createProfile(userId: string, dto: CreateProfessionalProfileDto) {
    const existing = await this.prisma.masterProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new BadRequestException('Professional profile already exists');
    }

    return this.prisma.masterProfile.create({
      data: {
        userId,
        bio: dto.bio,
        experienceYears: dto.experienceYears ?? 0,
        serviceCategoryIds: dto.serviceCategoryIds,
        priceMin: dto.priceMin,
        priceMax: dto.priceMax,
        district: dto.district,
        portfolioImages: dto.portfolioImages ?? [],
      },
      include: { user: { select: { id: true, name: true, phone: true, avatarUrl: true } } },
    });
  }

  async getOwnProfile(userId: string) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { userId },
      include: { user: { select: { id: true, name: true, phone: true, avatarUrl: true } } },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfessionalProfileDto) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    return this.prisma.masterProfile.update({
      where: { userId },
      data: {
        bio: dto.bio,
        experienceYears: dto.experienceYears,
        serviceCategoryIds: dto.serviceCategoryIds,
        priceMin: dto.priceMin,
        priceMax: dto.priceMax,
        district: dto.district,
        portfolioImages: dto.portfolioImages,
      },
      include: { user: { select: { id: true, name: true, phone: true, avatarUrl: true } } },
    });
  }

  async search(query: SearchProfessionalsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.MasterProfileWhereInput = {
      AND: [
        { user: { isVerified: true } },
        {
          ...(query.district && { district: query.district }),
          ...(query.category && {
            serviceCategoryIds: { has: query.category },
          }),
          ...(query.priceMin !== undefined && {
            priceMax: { gte: query.priceMin },
          }),
          ...(query.priceMax !== undefined && {
            priceMin: { lte: query.priceMax },
          }),
          ...(query.ratingMin !== undefined && {
            ratingAvg: { gte: query.ratingMin },
          }),
          ...(query.q && {
            OR: [
              { bio: { contains: query.q, mode: 'insensitive' } },
              { user: { name: { contains: query.q, mode: 'insensitive' } } },
            ],
          }),
        },
      ],
    };

    let orderBy: Prisma.MasterProfileOrderByWithRelationInput = {
      ratingAvg: 'desc',
    };
    if (query.sort === 'price_asc') orderBy = { priceMin: 'asc' };
    if (query.sort === 'price_desc') orderBy = { priceMax: 'desc' };

    const started = Date.now();
    const [items, total] = await Promise.all([
      this.prisma.masterProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
      }),
      this.prisma.masterProfile.count({ where }),
    ]);
    // #region agent log
    const payload = {
      sessionId: '07caa7',
      runId: 'pre-fix',
      hypothesisId: 'C',
      location: 'professionals.service.ts:search',
      message: 'GET /professionals timing',
      data: {
        durationMs: Date.now() - started,
        itemCount: items.length,
        total,
        page,
        limit,
      },
      timestamp: Date.now(),
    };
    fetch('http://127.0.0.1:7687/ingest/c719dbad-309d-4887-8faf-135f1a894994', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '07caa7',
      },
      body: JSON.stringify(payload),
    }).catch(() => {});
    try {
      appendFileSync(
        '/Users/macbookpro/Desktop/UstaTop - Startup/.cursor/debug-07caa7.log',
        JSON.stringify(payload) + '\n',
      );
    } catch {
      /* ignore */
    }
    // #endregion

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const profile = await this.prisma.masterProfile.findFirst({
      where: { OR: [{ id }, { userId: id }] },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('Professional not found');
    return profile;
  }

  async getReviews(
    professionalUserId: string,
    page = 1,
    limit = 5,
  ) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { userId: professionalUserId },
    });
    if (!profile) throw new NotFoundException('Professional not found');

    const skip = (page - 1) * limit;
    const where = {
      order: { masterId: professionalUserId, status: 'completed' as const },
    };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        include: {
          order: {
            select: {
              client: { select: { id: true, name: true, avatarUrl: true } },
              service: { select: { nameUz: true, nameRu: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  private async resolveProfileForDashboard(userId: string) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      },
    });
    if (profile) return profile;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, avatarUrl: true },
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: '',
      userId: user.id,
      bio: null,
      experienceYears: 0,
      serviceCategoryIds: [] as string[],
      priceMin: 0,
      priceMax: 0,
      ratingAvg: 0,
      reviewCount: 0,
      completedOrders: 0,
      district: null,
      isApproved: false,
      isPremium: false,
      portfolioImages: [] as string[],
      createdAt: new Date(),
      updatedAt: new Date(),
      user,
    };
  }

  async getDashboard(userId: string) {
    const profile = await this.resolveProfileForDashboard(userId);
    const [pendingOrders, completedOrders, earnings] = await Promise.all([
      this.prisma.order.count({
        where: { masterId: userId, status: 'pending' },
      }),
      this.prisma.order.count({
        where: { masterId: userId, status: 'completed' },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: 'completed',
          order: { masterId: userId },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      profile,
      stats: {
        pendingOrders,
        completedOrders,
        totalEarnings: earnings._sum.amount ?? 0,
      },
    };
  }

  async getAnalytics(userId: string, query: DashboardAnalyticsDto) {
    const profile = await this.resolveProfileForDashboard(userId);
    const { from, to } = this.resolveAnalyticsRange(query);

    const [completedOrders, pendingCount] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          masterId: userId,
          status: 'completed',
          updatedAt: { gte: from, lte: to },
        },
        include: {
          payment: true,
          service: { select: { nameUz: true, nameRu: true } },
          client: { select: { name: true, phone: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.order.count({
        where: { masterId: userId, status: 'pending' },
      }),
    ]);

    const pendingOrders = await this.prisma.order.findMany({
      where: { masterId: userId, status: 'pending' },
      include: {
        service: { select: { nameUz: true, nameRu: true } },
        client: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let totalEarnings = 0;
    const dailyMap = new Map<string, { amount: number; orders: number }>();
    const monthlyMap = new Map<
      string,
      { count: number; earnings: number; label: string }
    >();
    const locationMap = new Map<string, { count: number; earnings: number }>();

    for (const order of completedOrders) {
      const amount = order.payment?.amount ?? order.price;
      totalEarnings += amount;

      const dayKey = order.updatedAt.toISOString().slice(0, 10);
      const dayEntry = dailyMap.get(dayKey) ?? { amount: 0, orders: 0 };
      dayEntry.amount += amount;
      dayEntry.orders += 1;
      dailyMap.set(dayKey, dayEntry);

      const monthKey = `${order.updatedAt.getFullYear()}-${String(order.updatedAt.getMonth() + 1).padStart(2, '0')}`;
      const monthEntry = monthlyMap.get(monthKey) ?? {
        count: 0,
        earnings: 0,
        label: monthKey,
      };
      monthEntry.count += 1;
      monthEntry.earnings += amount;
      monthlyMap.set(monthKey, monthEntry);

      const location = order.address?.trim() || "Noma'lum manzil";
      const locEntry = locationMap.get(location) ?? { count: 0, earnings: 0 };
      locEntry.count += 1;
      locEntry.earnings += amount;
      locationMap.set(location, locEntry);
    }

    const dailyEarnings = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const monthlyOrders = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const topLocations = Array.from(locationMap.entries())
      .map(([address, data]) => ({ address, ...data }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 8);

    const recentJobs = completedOrders.slice(0, 15).map((order) => ({
      id: order.id,
      date: order.updatedAt.toISOString(),
      address: order.address,
      price: order.payment?.amount ?? order.price,
      service: order.service,
      clientName: order.client?.name,
      clientPhone: order.client?.phone,
    }));

    return {
      profile,
      period: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        totalEarnings,
        completedOrders: completedOrders.length,
        pendingOrders: pendingCount,
        avgPerOrder:
          completedOrders.length > 0
            ? Math.round(totalEarnings / completedOrders.length)
            : 0,
      },
      dailyEarnings,
      monthlyOrders,
      topLocations,
      recentJobs,
      pendingOrdersList: pendingOrders.map((order) => ({
        id: order.id,
        date: order.createdAt.toISOString(),
        address: order.address,
        price: order.price,
        service: order.service,
        clientName: order.client?.name,
        clientPhone: order.client?.phone,
      })),
    };
  }

  private resolveAnalyticsRange(query: DashboardAnalyticsDto) {
    const to = query.to ? new Date(query.to) : new Date();
    to.setHours(23, 59, 59, 999);

    if (query.from) {
      const from = new Date(query.from);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }

    const from = new Date(to);
    from.setHours(0, 0, 0, 0);

    switch (query.period ?? AnalyticsPeriod['1m']) {
      case AnalyticsPeriod['3m']:
        from.setMonth(from.getMonth() - 3);
        break;
      case AnalyticsPeriod['6m']:
        from.setMonth(from.getMonth() - 6);
        break;
      case AnalyticsPeriod['1y']:
        from.setFullYear(from.getFullYear() - 1);
        break;
      case AnalyticsPeriod.all:
        from.setFullYear(2020, 0, 1);
        break;
      default:
        from.setMonth(from.getMonth() - 1);
    }

    return { from, to };
  }

  async getTelegramStatus(userId: string) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { userId },
      select: { telegramChatId: true, telegramLinkToken: true },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const connected = !!profile.telegramChatId;
    let link: string | null = null;

    if (!connected && profile.telegramLinkToken && this.telegram.isEnabled) {
      const username = await this.telegram.getBotUsername();
      if (username) {
        link = `https://t.me/${username}?start=${profile.telegramLinkToken}`;
      }
    }

    return { connected, link };
  }

  async createTelegramLink(userId: string) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    if (profile.telegramChatId) {
      return { connected: true, link: null };
    }

    if (!this.telegram.isEnabled) {
      throw new BadRequestException('Telegram bot sozlanmagan');
    }

    const username = await this.telegram.getBotUsername();
    if (!username) {
      throw new BadRequestException('Telegram bot bilan bog\'lanib bo\'lmadi');
    }

    const token =
      profile.telegramLinkToken ?? randomBytes(12).toString('base64url');

    if (!profile.telegramLinkToken) {
      await this.prisma.masterProfile.update({
        where: { userId },
        data: { telegramLinkToken: token },
      });
    }

    const link = `https://t.me/${username}?start=${token}`;
    return { connected: false, link, token };
  }

  async disconnectTelegram(userId: string) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    await this.prisma.masterProfile.update({
      where: { userId },
      data: {
        telegramChatId: null,
        telegramLinkToken: null,
      },
    });

    return { connected: false };
  }
}
