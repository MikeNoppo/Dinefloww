import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsNotEmpty()
  @IsEnum([OrderStatus.IN_PROCESS, OrderStatus.READY])
  status: OrderStatus;
}
