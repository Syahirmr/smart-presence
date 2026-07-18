import {
  getAttendanceLogsForExportByDate,
  getAttendanceLogsForExportByRange,
  getAllAttendanceLogsForExport,
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
  let rows;

  if (query.date) {
    rows = getAttendanceLogsForExportByDate(query.date);
  } else if (query.start_date && query.end_date) {
    rows = getAttendanceLogsForExportByRange(query.start_date, query.end_date);
  } else {
    rows = getAllAttendanceLogsForExport();
  }

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
    : query.start_date && query.end_date
      ? `attendance-${query.start_date}-to-${query.end_date}.csv`
      : `attendance-all-${new Date().toISOString().split('T')[0]}.csv`;

  return {
    filename,
    csv,
  };
}