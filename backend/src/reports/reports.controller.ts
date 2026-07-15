import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/auth.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateReportDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress;

    return this.reports.create(dto, { ip });
  }
}
