import { getLatestAttendanceLogs } from './admin-attendance.repository.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type GetAdminAttendanceLogsInput = {
  limit?: number;
};

export function getAdminAttendanceLogs(input: GetAdminAttendanceLogsInput) {
  const rawLimit = input.limit ?? DEFAULT_LIMIT;
  const safeLimit = Math.min(Math.max(rawLimit, 1), MAX_LIMIT);

  const rows = getLatestAttendanceLogs(safeLimit);

  return rows.map((row) => ({
    id: row.id,
    waktu_hadir: row.waktu_hadir,
    confidence_score: row.confidence_score,
    status: row.status,
    kiosk_id: row.kiosk_id,
    user: {
      id: row.user_id,
      nim_nip: row.nim_nip,
      nama_lengkap: row.nama_lengkap,
    },
    created_at: row.created_at,
  }));
}