import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPg({
      // Neon pooled endpoint (PgBouncer). Migrations use DIRECT_URL instead.
      connectionString: process.env.DATABASE_URL,
      // Neon suspends idle databases; the first query after a pause can take
      // several seconds, so don't fail fast.
      connectionTimeoutMillis: 20_000,
      idleTimeoutMillis: 30_000,
      max: 10,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
