import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  getUsers(
    page = 1,
    limit = 20,
    role?: UserRole,
    pendingOnly?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {};

    if (role) where.role = role;
    if (pendingOnly) {
      where.role = UserRole.professional;
      where.masterProfile = { isApproved: false };
    }

    return Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: { masterProfile: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]).then(([items, total]) => ({
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }));
  }

  async approveProfessional(userId: string) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }
    return this.prisma.masterProfile.update({
      where: { userId },
      data: { isApproved: true },
    });
  }

  blockUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: false },
    });
  }

  unblockUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });
  }

  getOrders(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = status
      ? { status: status as OrderStatus }
      : {};

    return Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: { select: { id: true, name: true, phone: true } },
          master: { select: { id: true, name: true, phone: true } },
          service: true,
          payment: { select: { status: true, amount: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]).then(([items, total]) => ({
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }));
  }

  async getStats() {
    const started = Date.now();
    const [
      totalUsers,
      totalProfessionals,
      activeProfessionals,
      totalOrders,
      completedOrders,
      revenue,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.professional } }),
      this.prisma.masterProfile.count({ where: { isApproved: true } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'completed' } }),
      this.prisma.payment.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true, commission: true },
      }),
    ]);

    // #region agent log
    fetch('http://127.0.0.1:7687/ingest/c719dbad-309d-4887-8faf-135f1a894994',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07caa7'},body:JSON.stringify({sessionId:'07caa7',runId:'pre-fix',hypothesisId:'D',location:'admin.service.ts:getStats',message:'GET /admin/stats timing',data:{durationMs:Date.now()-started,totalUsers,totalOrders},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return {
      totalUsers,
      totalProfessionals,
      activeProfessionals,
      totalOrders,
      completedOrders,
      totalRevenue: revenue._sum.amount ?? 0,
      totalCommission: revenue._sum.commission ?? 0,
    };
  }
}
