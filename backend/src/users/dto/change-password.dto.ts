import { IsString, Matches, MinLength } from 'class-validator';

const STRONG_PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(STRONG_PASSWORD_PATTERN, {
    message: 'Password must contain at least one letter and one number',
  })
  newPassword: string;
}
