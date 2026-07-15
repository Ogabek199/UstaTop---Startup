import { IsEnum } from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class CreatePaymentDto {
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;
}
