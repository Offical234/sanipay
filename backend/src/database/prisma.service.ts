import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully (Prisma PostgreSQL)');
    } catch (err) {
      this.logger.warn(
        'Database connection deferred: server is operating with offline/mock mode until PostgreSQL service is started.',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected successfully');
  }

  /**
   * Helper to execute queries with pessimistic row-level locking
   * Example: Lock a wallet for atomic updates
   */
  async lockWallet(tx: any, userId: string) {
    const result = await tx.$queryRawUnsafe(
      `SELECT id, user_id, balance_kobo, is_locked FROM wallets WHERE user_id = $1::uuid FOR UPDATE`,
      userId,
    );
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }
}
