import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

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
  imageUrl?: string;  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    // Handle string values from form data
    if (typeof value === 'string') {
      return value === 'true';
    }
    // Handle boolean values from JSON
    return Boolean(value);
  })
  availableForOrdering: boolean;
}
