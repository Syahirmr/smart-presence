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
  keterangan: string | null;
  created_at: string;
};

let getLatestAttendanceLogsStmt: Database.Statement | null = null;
let getAttendanceLogsByDateStmt: Database.Statement | null = null;
let getAttendanceLogsByRangeStmt: Database.Statement | null = null;
let getAttendanceLogsForExportByDateStmt: Database.Statement | null = null;
let getAttendanceLogsForExportByRangeStmt: Database.Statement | null = null;
let getAttendanceLogByUserAndDateStmt: Database.Statement | null = null;
let insertManualAttendanceStmt: Database.Statement | null = null;
let updateManualAttendanceStmt: Database.Statement | null = null;

export function initAdminAttendanceStatements() {
  if (
    getLatestAttendanceLogsStmt &&
    getAttendanceLogsByDateStmt &&
    getAttendanceLogsByRangeStmt &&
    getAttendanceLogsForExportByDateStmt &&
    getAttendanceLogsForExportByRangeStmt &&
    getAttendanceLogByUserAndDateStmt &&
    insertManualAttendanceStmt &&
    updateManualAttendanceStmt
  ) {
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
      a.keterangan,
      a.created_at
    FROM attendance_logs a
    JOIN users u ON u.id = a.user_id
    ORDER BY a.waktu_hadir DESC
    LIMIT ?
  `);

  getAttendanceLogsByDateStmt = db.prepare(`
    SELECT
      a.id,
      a.user_id,
      u.nim_nip,
      u.nama_lengkap,
      a.kiosk_id,
      a.waktu_hadir,
      a.confidence_score,
      a.status,
      a.keterangan,
      a.created_at
    FROM attendance_logs a
    JOIN users u ON u.id = a.user_id
    WHERE date(a.waktu_hadir) = ?
    ORDER BY a.waktu_hadir DESC
    LIMIT ?
  `);

  getAttendanceLogsByRangeStmt = db.prepare(`
    SELECT
      a.id,
      a.user_id,
      u.nim_nip,
      u.nama_lengkap,
      a.kiosk_id,
      a.waktu_hadir,
      a.confidence_score,
      a.status,
      a.keterangan,
      a.created_at
    FROM attendance_logs a
    JOIN users u ON u.id = a.user_id
    WHERE date(a.waktu_hadir) BETWEEN ? AND ?
    ORDER BY a.waktu_hadir DESC
    LIMIT ?
  `);

  getAttendanceLogsForExportByDateStmt = db.prepare(`
    SELECT
      a.id,
      a.user_id,
      u.nim_nip,
      u.nama_lengkap,
      a.kiosk_id,
      a.waktu_hadir,
      a.confidence_score,
      a.status,
      a.keterangan,
      a.created_at
    FROM attendance_logs a
    JOIN users u ON u.id = a.user_id
    WHERE date(a.waktu_hadir) = ?
    ORDER BY a.waktu_hadir DESC
  `);

  getAttendanceLogsForExportByRangeStmt = db.prepare(`
    SELECT
      a.id,
      a.user_id,
      u.nim_nip,
      u.nama_lengkap,
      a.kiosk_id,
      a.waktu_hadir,
      a.confidence_score,
      a.status,
      a.keterangan,
      a.created_at
    FROM attendance_logs a
    JOIN users u ON u.id = a.user_id
    WHERE date(a.waktu_hadir) BETWEEN ? AND ?
    ORDER BY a.waktu_hadir DESC
  `);

  getAttendanceLogByUserAndDateStmt = db.prepare(`
    SELECT id FROM attendance_logs
    WHERE user_id = ? AND date(waktu_hadir) = ?
    LIMIT 1
  `);

  insertManualAttendanceStmt = db.prepare(`
    INSERT INTO attendance_logs (user_id, waktu_hadir, confidence_score, status, kiosk_id, keterangan)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  updateManualAttendanceStmt = db.prepare(`
    UPDATE attendance_logs
    SET status = ?, keterangan = ?, waktu_hadir = ?, confidence_score = ?, kiosk_id = ?
    WHERE id = ?
  `);
}

function assertAdminAttendanceStatementsReady() {
  if (
    !getLatestAttendanceLogsStmt ||
    !getAttendanceLogsByDateStmt ||
    !getAttendanceLogsByRangeStmt ||
    !getAttendanceLogsForExportByDateStmt ||
    !getAttendanceLogsForExportByRangeStmt ||
    !getAttendanceLogByUserAndDateStmt ||
    !insertManualAttendanceStmt ||
    !updateManualAttendanceStmt
  ) {
    throw new Error('Admin attendance statements are not initialized');
  }
}

export function getLatestAttendanceLogs(limit: number): AttendanceLogRow[] {
  assertAdminAttendanceStatementsReady();
  return getLatestAttendanceLogsStmt!.all(limit) as AttendanceLogRow[];
}

export function getAttendanceLogsByDate(date: string, limit: number): AttendanceLogRow[] {
  assertAdminAttendanceStatementsReady();
  return getAttendanceLogsByDateStmt!.all(date, limit) as AttendanceLogRow[];
}

export function getAttendanceLogsByRange(
  startDate: string,
  endDate: string,
  limit: number,
): AttendanceLogRow[] {
  assertAdminAttendanceStatementsReady();
  return getAttendanceLogsByRangeStmt!.all(startDate, endDate, limit) as AttendanceLogRow[];
}

export function getAttendanceLogsForExportByDate(date: string): AttendanceLogRow[] {
  assertAdminAttendanceStatementsReady();
  return getAttendanceLogsForExportByDateStmt!.all(date) as AttendanceLogRow[];
}

export function getAttendanceLogsForExportByRange(
  startDate: string,
  endDate: string,
): AttendanceLogRow[] {
  assertAdminAttendanceStatementsReady();
  return getAttendanceLogsForExportByRangeStmt!.all(startDate, endDate) as AttendanceLogRow[];
}

export function getAttendanceLogByUserAndDate(userId: string, dateStr: string): { id: number } | undefined {
  assertAdminAttendanceStatementsReady();
  return getAttendanceLogByUserAndDateStmt!.get(userId, dateStr) as { id: number } | undefined;
}

export function insertManualAttendance(
  userId: string,
  waktuHadir: string,
  status: string,
  keterangan: string,
): void {
  assertAdminAttendanceStatementsReady();
  insertManualAttendanceStmt!.run(userId, waktuHadir, 1.0, status, 'MANUAL', keterangan);
}

export function updateManualAttendance(
  logId: number,
  waktuHadir: string,
  status: string,
  keterangan: string,
): void {
  assertAdminAttendanceStatementsReady();
  updateManualAttendanceStmt!.run(status, keterangan, waktuHadir, 1.0, 'MANUAL', logId);
}