import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { app } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { db, getDbPath } from './db/sqlite.js';
import { logger } from './lib/logger.js';
import { initEnrollmentStatements } from './modules/enrollment/enrollment.repository.js'; // <-- TAMBAH INI

const HOST = env.HOST;

try {
  runMigrations();
  initEnrollmentStatements(); // <-- PANGGIL DI SINI
  logger.info({ dbPath: getDbPath() }, 'SQLite is ready');
} catch (error) {
  logger.error({ err: error }, 'Failed to initialize database');
  process.exit(1);
}

const server = http.createServer(app);

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error({ host: HOST, port: env.PORT }, 'Port is already in use');
  } else {
    logger.error({ err: error }, 'HTTP server failed to start');
  }

  try {
    db.close();
  } catch {
    // ignore close error during startup failure
  }

  process.exit(1);
});

server.listen(env.PORT, HOST, () => {
  const address = server.address() as AddressInfo | null;

  logger.info(
    {
      host: address?.address ?? HOST,
      port: address?.port ?? env.PORT,
      env: env.NODE_ENV,
    },
    'HTTP server is running',
  );
});

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received');

  server.close((error) => {
    if (error) {
      logger.error({ err: error }, 'Error while shutting down HTTP server');
    } else {
      logger.info('HTTP server closed');
    }

    try {
      db.close();
      logger.info('SQLite database connection closed cleanly');
      process.exit(error ? 1 : 0);
    } catch (dbError) {
      logger.error({ err: dbError }, 'Error while closing SQLite database');
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));