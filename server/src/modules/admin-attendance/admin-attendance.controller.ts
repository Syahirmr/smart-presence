import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/api-response.js';
import { getAdminAttendanceLogs } from './admin-attendance.service.js';

export function getAdminAttendanceLogsController(req: Request, res: Response) {
  const limitParam = req.query.limit;
  const limit =
    typeof limitParam === 'string' && limitParam.trim() !== ''
      ? Number(limitParam)
      : undefined;

  const logs = getAdminAttendanceLogs({ limit });

  return sendSuccess(res, {
    statusCode: 200,
    code: 'ADMIN_ATTENDANCE_LOGS_FETCHED',
    message: 'Data attendance admin berhasil diambil',
    data: {
      logs,
    },
  });
}