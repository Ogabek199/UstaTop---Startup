import { IsString, Matches, MinLength } from 'class-validator';

const PHONE_PATTERN = /^\+998\d{9}$/;

export class ChangePhoneDto {
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: 'Phone must be in format +998XXXXXXXXX',
  })
  newPhone: string;

  @IsString()
  @MinLength(1)
  currentPassword: string;
}
