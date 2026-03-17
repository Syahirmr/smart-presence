import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/app-error.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
}