import { Controller, Get, Injectable, Module, Param } from '@nestjs/common';
import { appendFileSync } from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/auth.decorator';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const started = Date.now();
    const rows = await this.prisma.service.findMany({
      where: { isActive: true },
      orderBy: { nameUz: 'asc' },
    });
    // #region agent log
    const payload = {
      sessionId: '07caa7',
      runId: 'pre-fix',
      hypothesisId: 'C',
      location: 'services.module.ts:findAll',
      message: 'GET /services timing',
      data: { durationMs: Date.now() - started, rowCount: rows.length },
      timestamp: Date.now(),
    };
    fetch('http://127.0.0.1:7687/ingest/c719dbad-309d-4887-8faf-135f1a894994', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '07caa7',
      },
      body: JSON.stringify(payload),
    }).catch(() => {});
    try {
      appendFileSync(
        '/Users/macbookpro/Desktop/UstaTop - Startup/.cursor/debug-07caa7.log',
        JSON.stringify(payload) + '\n',
      );
    } catch {
      /* ignore */
    }
    // #endregion
    return rows;
  }

  findOne(id: string) {
    return this.prisma.service.findFirst({
      where: { id, isActive: true },
    });
  }
}

@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Public()
  @Get()
  findAll() {
    return this.servicesService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }
}

@Module({
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
