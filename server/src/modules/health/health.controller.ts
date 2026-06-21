import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/api-response.js';

export function getHealth(_req: Request, res: Response) {
  return sendSuccess(res, {
    message: 'API is healthy',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
}