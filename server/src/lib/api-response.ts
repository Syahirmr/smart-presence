import type { Response } from 'express';

type SuccessOptions<T> = {
  statusCode?: number;
  code?: string;
  message?: string;
  data?: T;
};

export function sendSuccess<T>(
  res: Response,
  { statusCode = 200, code = 'OK', message = 'Success', data }: SuccessOptions<T>,
) {
  return res.status(statusCode).json({
    success: true,
    code,
    message,
    data: data ?? null,
  });
}