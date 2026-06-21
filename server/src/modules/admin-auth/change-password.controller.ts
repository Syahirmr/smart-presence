import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/api-response.js';
import { AppError } from '../../lib/app-error.js';
import { changeAdminPasswordBodySchema } from './change-password.schema.js';
import { changeAdminPassword } from './admin-auth.service.js';

export async function postAdminChangePassword(req: Request, res: Response) {
  const adminId = req.admin?.id;

  if (!adminId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Token admin diperlukan');
  }

  const body = changeAdminPasswordBodySchema.parse(req.body);

  await changeAdminPassword(adminId, body);

  return sendSuccess(res, {
    statusCode: 200,
    code: 'ADMIN_PASSWORD_CHANGED',
    message: 'Password admin berhasil diubah',
  });
}