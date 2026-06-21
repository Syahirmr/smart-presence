import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/api-response.js';
import { adminAttendanceQuerySchema } from './admin-attendance.schema.js';
import { getAdminAttendanceLogs } from './admin-attendance.service.js';

export function getAdminAttendanceLogsController(req: Request, res: Response) {
  const query = adminAttendanceQuerySchema.parse(req.query);

  const logs = getAdminAttendanceLogs(query);

  return sendSuccess(res, {
    statusCode: 200,
    code: 'ADMIN_ATTENDANCE_LOGS_FETCHED',
    message: 'Data attendance admin berhasil diambil',
    data: {
      logs,
    },
  });
}