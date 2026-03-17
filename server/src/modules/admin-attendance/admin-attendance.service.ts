import {
  getAttendanceLogsByDate,
  getAttendanceLogsByRange,
  getLatestAttendanceLogs,
} from './admin-attendance.repository.js';
import type { AdminAttendanceQuery } from './admin-attendance.schema.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function toUtcIsoString(value: string) {
  return value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
}

type GetAdminAttendanceLogsInput = AdminAttendanceQuery;

export function getAdminAttendanceLogs(input: GetAdminAttendanceLogsInput) {
  const rawLimit = input.limit ?? DEFAULT_LIMIT;
  const safeLimit = Math.min(Math.max(rawLimit, 1), MAX_LIMIT);

  let rows;

  if (input.date) {
    rows = getAttendanceLogsByDate(input.date, safeLimit);
  } else if (input.start_date && input.end_date) {
    rows = getAttendanceLogsByRange(input.start_date, input.end_date, safeLimit);
  } else {
    rows = getLatestAttendanceLogs(safeLimit);
  }

  return rows.map((row) => ({
    id: row.id,
    waktu_hadir: toUtcIsoString(row.waktu_hadir),
    confidence_score: row.confidence_score,
    status: row.status,
    kiosk_id: row.kiosk_id,
    user: {
      id: row.user_id,
      nim_nip: row.nim_nip,
      nama_lengkap: row.nama_lengkap,
    },
    created_at: toUtcIsoString(row.created_at),
  }));
}