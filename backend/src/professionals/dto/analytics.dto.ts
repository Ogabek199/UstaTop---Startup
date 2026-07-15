import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum AnalyticsPeriod {
  '1m' = '1m',
  '3m' = '3m',
  '6m' = '6m',
  '1y' = '1y',
  all = 'all',
}

export class DashboardAnalyticsDto {
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
