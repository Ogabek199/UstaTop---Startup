import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProfessionalProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @IsArray()
  @IsString({ each: true })
  serviceCategoryIds: string[];

  @IsInt()
  @Min(0)
  priceMin: number;

  @IsInt()
  @Min(0)
  priceMax: number;

  @IsString()
  @MinLength(2)
  district: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  portfolioImages?: string[];
}

export class UpdateProfessionalProfileDto extends CreateProfessionalProfileDto {}

export class SearchProfessionalsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  ratingMin?: number;

  @IsOptional()
  @IsString()
  sort?: 'rating' | 'price_asc' | 'price_desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class ReviewsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
