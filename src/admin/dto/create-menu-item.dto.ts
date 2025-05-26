import { MenuStatus } from '@prisma/client';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';

export class CreateMenuItemDto {

  @IsString()
  @IsNotEmpty()
  name: string;


  @IsString()
  @IsNotEmpty()
  category: string;


  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  description?: string;
  
  @IsEnum(MenuStatus)
  @IsNotEmpty()
  MenuStatus : MenuStatus;


}
