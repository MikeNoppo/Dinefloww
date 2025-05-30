import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsPositive } from 'class-validator';

export class CreateMenuItemDto {

  @IsString()
  @IsNotEmpty()
  name: string;


  @IsString()
  @IsNotEmpty()
  category: string;

  
  @IsString()
  @IsNotEmpty()
  price: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string; // Added imageUrl

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true) // Transform string 'true' to boolean true
  @IsNotEmpty()
  availableForOrdering: boolean; 


}
