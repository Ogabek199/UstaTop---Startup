import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateProfessionalProfileDto,
  ReviewsQueryDto,
  SearchProfessionalsDto,
  UpdateProfessionalProfileDto,
} from './dto/professional.dto';
import { DashboardAnalyticsDto } from './dto/analytics.dto';
import { Public } from '../common/decorators/auth.decorator';
import type { User } from '@prisma/client';
import { UserRole } from '@prisma/client';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private professionalsService: ProfessionalsService) {}

  @Post('profile')
  createProfile(
    @CurrentUser() user: User,
    @Body() dto: CreateProfessionalProfileDto,
  ) {
    return this.professionalsService.createProfile(user.id, dto);
  }

  @Get('profile')
  getOwnProfile(@CurrentUser() user: User) {
    return this.professionalsService.getOwnProfile(user.id);
  }

  @Put('profile')
  updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfessionalProfileDto,
  ) {
    return this.professionalsService.updateProfile(user.id, dto);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: User) {
    return this.professionalsService.getDashboard(user.id);
  }

  @Get('analytics')
  getAnalytics(
    @CurrentUser() user: User,
    @Query() query: DashboardAnalyticsDto,
  ) {
    return this.professionalsService.getAnalytics(user.id, query);
  }

  @Get('reviews')
  getMyReviews(@CurrentUser() user: User, @Query() query: ReviewsQueryDto) {
    if (user.role !== UserRole.professional) {
      throw new ForbiddenException('Only professionals can view their reviews');
    }
    return this.professionalsService.getReviews(
      user.id,
      query.page,
      query.limit,
    );
  }

  @Get('telegram/status')
  getTelegramStatus(@CurrentUser() user: User) {
    return this.professionalsService.getTelegramStatus(user.id);
  }

  @Post('telegram/link')
  createTelegramLink(@CurrentUser() user: User) {
    return this.professionalsService.createTelegramLink(user.id);
  }

  @Post('telegram/disconnect')
  disconnectTelegram(@CurrentUser() user: User) {
    return this.professionalsService.disconnectTelegram(user.id);
  }

  @Public()
  @Get()
  search(@Query() query: SearchProfessionalsDto) {
    return this.professionalsService.search(query);
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.professionalsService.getById(id);
  }

  @Public()
  @Get(':id/reviews')
  getReviews(@Param('id') id: string, @Query() query: ReviewsQueryDto) {
    return this.professionalsService.getReviews(
      id,
      query.page,
      query.limit,
    );
  }
}
