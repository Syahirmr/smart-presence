import type { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'req.body.embeddings',
      'req.body.embedding',
      'req.body.faces',
    ],
    censor: '[BIOMETRIC_DATA_REDACTED]',
  },
});

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