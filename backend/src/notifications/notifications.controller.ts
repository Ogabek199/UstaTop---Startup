import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/auth.decorator';
import type { User } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PushSubscribeDto } from './dto/notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.notificationsService.findAll(user.id);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: User) {
    return this.notificationsService
      .getUnreadCount(user.id)
      .then((count) => ({ count }));
  }

  @Put('read-all')
  markAllRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Put(':id/read')
  markRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Public()
  @Sse('stream')
  stream(@Query('token') token: string): Observable<MessageEvent> {
    const userId = this.verifyToken(token);
    return this.notificationsService.subscribe(userId);
  }

  @Public()
  @Get('push/vapid-key')
  getVapidKey() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    return { publicKey, enabled: Boolean(publicKey) };
  }

  @Post('push/subscribe')
  subscribePush(@CurrentUser() user: User, @Body() dto: PushSubscribeDto) {
    return this.notificationsService.subscribePush(user.id, dto);
  }

  @Delete('push/unsubscribe')
  unsubscribePush(
    @CurrentUser() user: User,
    @Body() body: { endpoint: string },
  ) {
    return this.notificationsService.unsubscribePush(user.id, body.endpoint);
  }

  private verifyToken(token?: string): string {
    if (!token) {
      throw new UnauthorizedException('Token required');
    }

    try {
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
