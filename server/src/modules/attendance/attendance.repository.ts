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
  waktuHadir: string;
  confidenceScore: number;
  status: string;
  kioskId: string; // Udah sinkron sama migrate.ts dan FSD
};

let getAllEmbeddingsStmt: Database.Statement | null = null;
let checkRecentAttendanceStmt: Database.Statement | null = null;
let insertAttendanceLogStmt: Database.Statement | null = null;

export function initAttendanceStatements() {
  if (getAllEmbeddingsStmt && checkRecentAttendanceStmt && insertAttendanceLogStmt) {
    return;
  }

  // 1. Ambil semua data user + embedding buat di-looping AI Best-Match
  getAllEmbeddingsStmt = db.prepare(`
    SELECT u.id, u.nim_nip, u.nama_lengkap, f.embedding_data
    FROM users u
    JOIN face_embeddings f ON u.id = f.user_id
  `);

  // 2. Cek Anti-Dobel 60 menit (Pake index composite idx_attendance_logs_cooldown)
  checkRecentAttendanceStmt = db.prepare(`
    SELECT id
    FROM attendance_logs
    WHERE user_id = ? AND status = 'HADIR' AND waktu_hadir >= ?
    ORDER BY waktu_hadir DESC
    LIMIT 1
  `);

  // 3. Insert Log Kehadiran
  insertAttendanceLogStmt = db.prepare(`
    INSERT INTO attendance_logs (user_id, waktu_hadir, confidence_score, status, kiosk_id)
    VALUES (?, ?, ?, ?, ?)
  `);
}

function assertAttendanceStatementsReady() {
  if (!getAllEmbeddingsStmt || !checkRecentAttendanceStmt || !insertAttendanceLogStmt) {
    throw new Error('Attendance statements are not initialized');
  }
}

export function getAllUserEmbeddings(): UserEmbeddingRow[] {
  assertAttendanceStatementsReady();
  return getAllEmbeddingsStmt!.all() as UserEmbeddingRow[];
}

export function hasRecentAttendance(userId: string, thresholdTimeIso: string): boolean {
  assertAttendanceStatementsReady();
  const row = checkRecentAttendanceStmt!.get(userId, thresholdTimeIso);
  return !!row; // Balikin true kalau ada absen di rentang waktu itu
}

export function insertAttendanceLog(input: InsertAttendanceInput) {
  assertAttendanceStatementsReady();
  const result = insertAttendanceLogStmt!.run(
    input.userId,
    input.waktuHadir,
    input.confidenceScore,
    input.status,
    input.kioskId
  );
  return Number(result.lastInsertRowid);
}