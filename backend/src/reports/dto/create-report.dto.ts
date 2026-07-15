import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const REPORT_TYPES = [
  'error',
  'api_error',
  'page_error',
  'suggestion',
  'feedback',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export class CreateReportDto {
  @IsIn(REPORT_TYPES)
  type: ReportType;

  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  userAgent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  statusCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  apiPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  userName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  userPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  userRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  userId?: string;
}
