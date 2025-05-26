import { IsEnum, IsNotEmpty } from 'class-validator';
import { PaymentOption } from '@prisma/client';

export class ProcessPaymentDto {
  @IsNotEmpty()
  @IsEnum(PaymentOption)
  paymentOption: PaymentOption;
}
