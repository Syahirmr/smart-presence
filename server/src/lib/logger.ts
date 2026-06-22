import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { env } from '../config/env.js';

const logsDir = path.resolve(process.cwd(), 'data/logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export const logger = pino(
  {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: {
      paths: [
        'req.body.embeddings',
        'req.body.embedding',
        'req.body.faces',
      ],
      censor: '[BIOMETRIC_DATA_REDACTED]',
    },
  },
  pino.multistream([
    { stream: process.stdout },
    { stream: fs.createWriteStream(path.join(logsDir, 'app.log'), { flags: 'a' }) },
  ])
);

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  if (req.originalUrl === '/api/health') {
    return next();
  }

  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;

    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
      },
      'HTTP request completed',
    );
  });

  next();
}