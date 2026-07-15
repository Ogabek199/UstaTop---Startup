import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePhoneDto } from './dto/change-phone.dto';
import type { User } from '@prisma/client';

const AVATAR_MAX_SIZE = 5 * 1024 * 1024;

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: User) {
    return this.usersService.getMe(user.id);
  }

  @Put('me')
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Put('me/password')
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Put('me/phone')
  changePhone(@CurrentUser() user: User, @Body() dto: ChangePhoneDto) {
    return this.usersService.changePhone(user.id, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: AVATAR_MAX_SIZE }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(user.id, file);
  }

  @Get('me/telegram/status')
  getTelegramStatus(@CurrentUser() user: User) {
    return this.usersService.getTelegramStatus(user.id);
  }

  @Post('me/telegram/link')
  createTelegramLink(@CurrentUser() user: User) {
    return this.usersService.createTelegramLink(user.id);
  }

  @Post('me/telegram/disconnect')
  disconnectTelegram(@CurrentUser() user: User) {
    return this.usersService.disconnectTelegram(user.id);
  }
}
