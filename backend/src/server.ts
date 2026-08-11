import http from 'http';
import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './lib/prisma';

async function main(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connection established');

  const server = http.createServer(app);

  server.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`Server listening on 0.0.0.0:${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    server.close(async () => {
      try {
        await prisma.$disconnect();
        logger.info('Prisma disconnected. Shutdown complete.');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
