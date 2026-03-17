import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../lib/app-error.js';

type AdminJwtPayload = {
  sub: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
};

export function requireAdminAuth(req: Request, _res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Token admin diperlukan'));
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Format token tidak valid'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AdminJwtPayload;

    if (decoded.role !== 'admin') {
      return next(new AppError(401, 'UNAUTHORIZED', 'Akses admin ditolak'));
    }

    req.admin = {
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role,
    };

    return next();
  } catch {
    return next(new AppError(401, 'UNAUTHORIZED', 'Token admin tidak valid'));
  }
}