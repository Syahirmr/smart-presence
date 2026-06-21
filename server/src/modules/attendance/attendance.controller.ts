import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/api-response.js';
import { attendanceBodySchema } from './attendance.schema.js';
import { processAttendance } from './attendance.service.js';

export function postScan(req: Request, res: Response) {
  // Parsing dan validasi request dari Kiosk pake Zod
  const body = attendanceBodySchema.parse(req.body);

  // Lempar ke otak AI (Service)
  const results = processAttendance(body);

  // Balikin response sesuai format kesepakatan
  return sendSuccess(res, {
    statusCode: 200,
    code: 'ATTENDANCE_PROCESSED',
    message: 'Attendance processed',
    data: {
      results,
    },
  });
}