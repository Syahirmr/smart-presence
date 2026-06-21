import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/app-error.js';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

type LoginAttemptEntry = {
  count: number;
  windowStart: number;
};

const loginAttempts = new Map<string, LoginAttemptEntry>();

const cleanupTimer = setInterval(() => {
  const now = Date.now();

  for (const [ipAddress, entry] of loginAttempts.entries()) {
    if (now - entry.windowStart >= WINDOW_MS) {
      loginAttempts.delete(ipAddress);
    }
  }
}, WINDOW_MS);

cleanupTimer.unref();

function getClientIp(req: Request) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
    return forwardedFor.split(',')[0]!.trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0]!.split(',')[0]!.trim();
  }

  return req.ip || 'unknown';
}

export function adminLoginRateLimit(req: Request, res: Response, next: NextFunction) {
  const ipAddress = getClientIp(req);
  const now = Date.now();
  const currentEntry = loginAttempts.get(ipAddress);

  if (!currentEntry || now - currentEntry.windowStart >= WINDOW_MS) {
    loginAttempts.set(ipAddress, {
      count: 1,
      windowStart: now,
    });

    return next();
  }

  if (currentEntry.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil(
      (WINDOW_MS - (now - currentEntry.windowStart)) / 1000,
    );

    res.setHeader('Retry-After', String(retryAfterSeconds));

    return next(
      new AppError(
        429,
        'TOO_MANY_REQUESTS',
        'Terlalu banyak percobaan login admin. Coba lagi beberapa saat lagi',
        {
          retry_after_seconds: retryAfterSeconds,
        },
      ),
    );
  }

  currentEntry.count += 1;
  loginAttempts.set(ipAddress, currentEntry);

  return next();
}