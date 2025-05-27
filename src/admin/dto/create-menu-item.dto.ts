import { MenuStatus } from '@prisma/client';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min, IsPositive } from 'class-validator';

export class CreateMenuItemDto {

  @IsString()
  @IsNotEmpty()
  name: string;


  @IsString()
  @IsNotEmpty()
  category: string;


  @IsNumber()
  @IsPositive()
  price: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string; // Added imageUrl

  @IsEnum(MenuStatus)
  @IsNotEmpty()
  MenuStatus : MenuStatus;


}
