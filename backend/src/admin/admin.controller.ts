import { Controller, Get, Param, Put, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/auth.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin')
@Roles(UserRole.admin)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: UserRole,
    @Query('pending') pending?: string,
  ) {
    return this.adminService.getUsers(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      role,
      pending === 'true' || pending === '1',
    );
  }

  @Put('users/:id/approve')
  approveProfessional(@Param('id') id: string) {
    return this.adminService.approveProfessional(id);
  }

  @Put('users/:id/block')
  blockUser(@Param('id') id: string) {
    return this.adminService.blockUser(id);
  }

  @Put('users/:id/unblock')
  unblockUser(@Param('id') id: string) {
    return this.adminService.unblockUser(id);
  }

  @Get('orders')
  getOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getOrders(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      status,
    );
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }
}
