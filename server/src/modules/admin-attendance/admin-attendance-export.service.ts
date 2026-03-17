import {
  getAttendanceLogsForExportByDate,
  getAttendanceLogsForExportByRange,
} from './admin-attendance.repository.js';
import type { AdminAttendanceExportQuery } from './admin-attendance-export.schema.js';

function toUtcIsoString(value: string) {
  return value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
}

function escapeCsvValue(value: string | number) {
  const stringValue = String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportAdminAttendanceCsv(query: AdminAttendanceExportQuery) {
  const rows = query.date
    ? getAttendanceLogsForExportByDate(query.date)
    : getAttendanceLogsForExportByRange(query.start_date!, query.end_date!);

  const header = [
    'id',
    'user_id',
    'nim_nip',
    'nama_lengkap',
    'kiosk_id',
    'waktu_hadir',
    'confidence_score',
    'status',
    'created_at',
  ];

  const lines = rows.map((row) =>
    [
      row.id,
      row.user_id,
      row.nim_nip,
      row.nama_lengkap,
      row.kiosk_id,
      toUtcIsoString(row.waktu_hadir),
      row.confidence_score,
      row.status,
      toUtcIsoString(row.created_at),
    ]
      .map(escapeCsvValue)
      .join(','),
  );

  const csv = [header.join(','), ...lines].join('\n');

  const filename = query.date
    ? `attendance-${query.date}.csv`
    : `attendance-${query.start_date}-to-${query.end_date}.csv`;

  return {
    filename,
    csv,
  };
}