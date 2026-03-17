import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/api-response.js';
import { enrollBodySchema } from './enrollment.schema.js';
import { enrollUser } from './enrollment.service.js';

export function postEnroll(req: Request, res: Response) {
  const body = enrollBodySchema.parse(req.body);

  const result = enrollUser(body);

  return sendSuccess(res, {
    statusCode: 201,
    code: 'USER_ENROLLED',
    message: 'Enrollment berhasil',
    data: {
      user: result,
    },
  });
}