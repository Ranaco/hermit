/**
 * Prisma Service
 * Singleton Prisma Client instance
 */

import { PrismaClient } from '@prisma/client';
import { log } from '@hermes/logger';

let prisma: PrismaClient | null = null;

/**
 * Get Prisma Client instance
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });

    // Log queries in development
    if (process.env.NODE_ENV !== 'production') {
      prisma.$on('query' as never, (e: { query: string; duration: number }) => {
        log.debug(`Query: ${e.query} (${e.duration}ms)`);
      });
    }

    prisma.$on('error' as never, (e: { message: string }) => {
      log.error('Prisma error:', { error: e.message });
    });

    prisma.$on('warn' as never, (e: { message: string }) => {
      log.warn('Prisma warning:', { warning: e.message });
    });
  }

  return prisma;
}

/**
 * Disconnect Prisma Client
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    log.info('Prisma disconnected');
  }
}

/**
 * Check database connection
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    log.info('Database connection successful');
    return true;
  } catch (error) {
    log.error('Database connection failed', { error });
    return false;
  }
}

export { prisma };
export default getPrismaClient;
