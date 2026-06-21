import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/api-response.js';
import { AppError } from '../../lib/app-error.js';
import { findUserByNimNip } from '../enrollment/enrollment.repository.js';
import {
  getAttendanceLogByUserAndDate,
  insertManualAttendance,
  updateManualAttendance,
} from './admin-attendance.repository.js';
import { adminAttendanceOverrideSchema } from './admin-attendance-override.schema.js';
import { getSocketInstance } from '../../sockets/index.js';

export function adminAttendanceOverrideController(req: Request, res: Response) {
  const body = adminAttendanceOverrideSchema.parse(req.body);

  // 1. Cari user berdasarkan NIM/NIP
  const user = findUserByNimNip(body.nim_nip);
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', `User dengan NIM/NIP ${body.nim_nip} tidak ditemukan`);
  }

  // 2. Cek apakah log sudah ada untuk user ini pada tanggal tersebut
  const existingLog = getAttendanceLogByUserAndDate(user.id, body.tanggal);

  const now = new Date();
  // Format waktu_hadir: tanggal yang dipilih admin + jam saat ini
  const timeSuffix = now.toISOString().split('T')[1]; // HH:mm:ss.sssZ
  const waktuHadir = `${body.tanggal}T${timeSuffix}`;

  if (existingLog) {
    // Skenario Update
    updateManualAttendance(existingLog.id, waktuHadir, body.status, body.keterangan);
  } else {
    // Skenario Insert
    insertManualAttendance(user.id, waktuHadir, body.status, body.keterangan);
  }

  // 3. Emit real-time WebSocket event agar dashboard ter-update
  const io = getSocketInstance();
  if (io) {
    io.emit('new_attendance', {
      kiosk_id: 'MANUAL',
      waktu_hadir: waktuHadir,
      confidence_score: 1.0,
      status: body.status,
      keterangan: body.keterangan,
      user: {
        id: user.id,
        nim_nip: user.nim_nip,
        nama_lengkap: user.nama_lengkap,
      },
    });
  }

  return sendSuccess(res, {
    statusCode: 200,
    code: 'ADMIN_ATTENDANCE_OVERRIDDEN',
    message: `Status presensi ${user.nama_lengkap} berhasil diubah menjadi ${body.status}`,
    data: {
      user_id: user.id,
      nama_lengkap: user.nama_lengkap,
      status: body.status,
      keterangan: body.keterangan,
      waktu_hadir: waktuHadir,
    },
  });
}
