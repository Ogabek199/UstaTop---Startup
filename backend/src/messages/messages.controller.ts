import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SendMessageDto } from './dto/message.dto';
import type { User } from '@prisma/client';

@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get(':orderId')
  getMessages(@Param('orderId') orderId: string, @CurrentUser() user: User) {
    return this.messagesService.getMessages(orderId, user);
  }

  @Post(':orderId')
  sendMessage(
    @Param('orderId') orderId: string,
    @CurrentUser() user: User,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(orderId, user, dto);
  }

  @Put(':orderId/read')
  markRead(@Param('orderId') orderId: string, @CurrentUser() user: User) {
    return this.messagesService.markRead(orderId, user);
  }
}
