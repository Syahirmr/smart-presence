import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { app } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { db, getDbPath } from './db/sqlite.js';
import { logger } from './lib/logger.js';
import { initAdminAttendanceStatements } from './modules/admin-attendance/admin-attendance.repository.js';
import { initAdminAuthStatements } from './modules/admin-auth/admin-auth.repository.js';
import { seedDefaultAdmin } from './modules/admin-auth/admin-auth.service.js';
import { initAttendanceStatements } from './modules/attendance/attendance.repository.js';
import { initEnrollmentStatements } from './modules/enrollment/enrollment.repository.js';
import { initSocket } from './sockets/index.js';

const HOST = env.HOST;

async function bootstrap() {
  try {
    runMigrations();
    initEnrollmentStatements();
    initAttendanceStatements();
    initAdminAuthStatements();
    initAdminAttendanceStatements();

    const seededAdmin = await seedDefaultAdmin({
      username: 'admin',
      password: 'admin123456',
    });

    logger.info({ dbPath: getDbPath() }, 'SQLite is ready');
    logger.info(
      { created: seededAdmin.created, username: seededAdmin.username },
      seededAdmin.created ? 'Default admin seeded' : 'Default admin already exists',
    );
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize database');
    process.exit(1);
  }
}

const server = http.createServer(app);

initSocket(server);

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

await bootstrap();

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