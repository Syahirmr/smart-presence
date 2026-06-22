import type Database from 'better-sqlite3';
import { db } from '../../db/sqlite.js';

export type UserEmbeddingRow = {
  id: string;
  nim_nip: string;
  nama_lengkap: string;
  embedding_data: string; // Ini format JSON string dari DB, nanti di-parse di Service
};

export type InsertAttendanceInput = {
  userId: string;
  sessionId: string;
  waktuHadir: string;
  confidenceScore: number;
  status: string;
  kioskId: string; // Udah sinkron sama migrate.ts dan FSD
};

let getAllEmbeddingsStmt: Database.Statement | null = null;
let checkSessionAttendanceStmt: Database.Statement | null = null;
let insertAttendanceLogStmt: Database.Statement | null = null;
let getActiveSessionStmt: Database.Statement | null = null;

export function initAttendanceStatements() {
  if (getAllEmbeddingsStmt && checkSessionAttendanceStmt && insertAttendanceLogStmt) {
    return;
  }

  // 1. Ambil semua data user + embedding buat di-looping AI Best-Match
  getAllEmbeddingsStmt = db.prepare(`
    SELECT u.id, u.nim_nip, u.nama_lengkap, f.embedding_data
    FROM users u
    JOIN face_embeddings f ON u.id = f.user_id
    WHERE u.is_active = 1
  `);

  // 2. Cek Anti-Dobel dalam Sesi yang Sama
  checkSessionAttendanceStmt = db.prepare(`
    SELECT id
    FROM attendance_logs
    WHERE user_id = ? AND session_id = ? AND status = 'HADIR'
    LIMIT 1
  `);

  // 3. Insert Log Kehadiran
  insertAttendanceLogStmt = db.prepare(`
    INSERT INTO attendance_logs (user_id, session_id, waktu_hadir, confidence_score, status, kiosk_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // 4. Cari Sesi yang Sedang Aktif
  getActiveSessionStmt = db.prepare(`
    SELECT id, nama_matkul FROM sessions WHERE status = 'active' LIMIT 1
  `);
}

function assertAttendanceStatementsReady() {
  if (!getAllEmbeddingsStmt || !checkSessionAttendanceStmt || !insertAttendanceLogStmt) {
    throw new Error('Attendance statements are not initialized');
  }
}

export function getAllUserEmbeddings(): UserEmbeddingRow[] {
  assertAttendanceStatementsReady();
  return getAllEmbeddingsStmt!.all() as UserEmbeddingRow[];
}

export function hasSessionAttendance(userId: string, sessionId: string): boolean {
  assertAttendanceStatementsReady();
  const row = checkSessionAttendanceStmt!.get(userId, sessionId);
  return !!row; // Balikin true kalau user udah pernah absen (status HADIR) di sesi ini
}

export function insertAttendanceLog(input: InsertAttendanceInput) {
  assertAttendanceStatementsReady();
  const result = insertAttendanceLogStmt!.run(
    input.userId,
    input.sessionId,
    input.waktuHadir,
    input.confidenceScore,
    input.status,
    input.kioskId
  );
  return Number(result.lastInsertRowid);
}

export function getActiveSession(): { id: string; nama_matkul: string } | null {
  assertAttendanceStatementsReady();
  const row = getActiveSessionStmt!.get();
  return row ? (row as { id: string; nama_matkul: string }) : null;
}