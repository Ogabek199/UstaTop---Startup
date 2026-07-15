import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { appendFileSync } from 'fs';

const DEBUG_LOG =
  '/Users/macbookpro/Desktop/UstaTop - Startup/.cursor/debug-07caa7.log';

function agentLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  const payload = {
    sessionId: '07caa7',
    runId: 'pre-fix',
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  // #region agent log
  fetch('http://127.0.0.1:7687/ingest/c719dbad-309d-4887-8faf-135f1a894994', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '07caa7',
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  try {
    appendFileSync(DEBUG_LOG, JSON.stringify(payload) + '\n');
  } catch {
    /* ignore */
  }
  // #endregion
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    const dbUrl = process.env.DATABASE_URL ?? '';
    let dbHost = 'unknown';
    try {
      dbHost = new URL(dbUrl.replace(/^postgresql:/, 'http:')).host;
    } catch {
      dbHost = 'parse-failed';
    }
    agentLog('A', 'prisma.service.ts:onModuleInit', 'Prisma connecting', {
      dbHost,
      usesSupabase: dbHost.includes('supabase'),
      regionHint: dbHost.includes('ap-southeast-2')
        ? 'sydney'
        : dbHost.includes('localhost')
          ? 'local'
          : 'other',
    });

    const connectStart = Date.now();
    await this.$connect();
    agentLog('B', 'prisma.service.ts:onModuleInit', 'Prisma connected', {
      connectMs: Date.now() - connectStart,
    });

    const pingStart = Date.now();
    await this.$queryRaw`SELECT 1`;
    agentLog('A', 'prisma.service.ts:onModuleInit', 'DB ping SELECT 1', {
      pingMs: Date.now() - pingStart,
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
