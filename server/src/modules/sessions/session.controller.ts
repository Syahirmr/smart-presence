import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/api-response.js';
import { AppError } from '../../lib/app-error.js';
import { createSession, getAllSessions, updateSessionStatus } from './session.repository.js';
import { createSessionSchema, updateSessionStatusSchema } from './session.schema.js';

export function postCreateSession(req: Request, res: Response) {
  // req.admin otomatis di-set oleh middleware requireAdminAuth
  const adminId = Number(req.admin?.id);
  
  if (!adminId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Akses ditolak');
  }

  const body = createSessionSchema.parse(req.body);

  const sessionId = createSession({
    ...body,
    admin_id: adminId,
  });

  return sendSuccess(res, {
    statusCode: 201,
    code: 'SESSION_CREATED',
    message: 'Sesi berhasil dibuat',
    data: { id: sessionId },
  });
}

export function getSessions(_req: Request, res: Response) {
  const sessions = getAllSessions();

  return sendSuccess(res, {
    statusCode: 200,
    code: 'SESSIONS_FETCHED',
    message: 'Berhasil mengambil data sesi',
    data: { sessions },
  });
}

export function patchSessionStatus(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = updateSessionStatusSchema.parse(req.body);

  if (!id) {
    throw new AppError(400, 'BAD_REQUEST', 'ID sesi diperlukan');
  }

  const updated = updateSessionStatus(id, body.status);

  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'Sesi tidak ditemukan');
  }

  return sendSuccess(res, {
    statusCode: 200,
    code: 'SESSION_UPDATED',
    message: 'Status sesi berhasil diperbarui',
    data: { id, status: body.status },
  });
}
