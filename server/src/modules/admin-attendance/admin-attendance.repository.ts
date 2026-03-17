import type Database from 'better-sqlite3';
import { db } from '../../db/sqlite.js';

export type AttendanceLogRow = {
  id: number;
  user_id: string;
  nim_nip: string;
  nama_lengkap: string;
  kiosk_id: string;
  waktu_hadir: string;
  confidence_score: number;
  status: string;
  created_at: string;
};

let getLatestAttendanceLogsStmt: Database.Statement | null = null;

export function initAdminAttendanceStatements() {
  if (getLatestAttendanceLogsStmt) {
    return;
  }

  getLatestAttendanceLogsStmt = db.prepare(`
    SELECT
      a.id,
      a.user_id,
      u.nim_nip,
      u.nama_lengkap,
      a.kiosk_id,
      a.waktu_hadir,
      a.confidence_score,
      a.status,
      a.created_at
    FROM attendance_logs a
    JOIN users u ON u.id = a.user_id
    ORDER BY a.waktu_hadir DESC
    LIMIT ?
  `);
}

function assertAdminAttendanceStatementsReady() {
  if (!getLatestAttendanceLogsStmt) {
    throw new Error('Admin attendance statements are not initialized');
  }
}

export function getLatestAttendanceLogs(limit: number): AttendanceLogRow[] {
  assertAdminAttendanceStatementsReady();
  return getLatestAttendanceLogsStmt!.all(limit) as AttendanceLogRow[];
}