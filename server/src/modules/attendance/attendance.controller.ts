import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/api-response.js';
import { AppError } from '../../lib/app-error.js';
import { getActiveSession } from './attendance.repository.js';
import { getAllSettings } from '../settings/setting.repository.js';
import { attendanceBodySchema } from './attendance.schema.js';
import { processAttendance } from './attendance.service.js';

export function getActiveSessionPublic(req: Request, res: Response) {
  const session = getActiveSession();
  
  if (!session) {
    throw new AppError(404, 'NO_ACTIVE_SESSION', 'Tidak ada sesi aktif saat ini');
  }

  // 🔥 FIXED: Berikan nilai threshold dan image filter ke Kiosk lewat API agar tersinkronisasi
  const settings = getAllSettings();
  const threshold = parseFloat(settings['ai_threshold'] || '0.85');
  const brightness = parseFloat(settings['ai_brightness'] || '1.0');
  const contrast = parseFloat(settings['ai_contrast'] || '1.0');

  return sendSuccess(res, {
    statusCode: 200,
    code: 'ACTIVE_SESSION_FOUND',
    message: 'Sesi aktif berhasil diambil',
    data: {
      ...session,
      ai_threshold: threshold,
      ai_brightness: brightness,
      ai_contrast: contrast
    },
  });
}

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