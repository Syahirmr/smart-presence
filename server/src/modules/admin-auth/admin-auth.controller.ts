import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/api-response.js';
import { adminLoginBodySchema } from './admin-auth.schema.js';
import { loginAdmin } from './admin-auth.service.js';

export async function postAdminLogin(req: Request, res: Response) {
  const body = adminLoginBodySchema.parse(req.body);

  const result = await loginAdmin(body);

  return sendSuccess(res, {
    statusCode: 200,
    code: 'ADMIN_LOGIN_SUCCESS',
    message: 'Login admin berhasil',
    data: result,
  });
}