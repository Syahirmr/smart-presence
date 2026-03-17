import { logger } from '../lib/logger.js';
import { db } from './sqlite.js';

export function runMigrations() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, 
        nim_nip TEXT NOT NULL UNIQUE,
        nama_lengkap TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS face_embeddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL, 
        embedding_data TEXT NOT NULL, 
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS attendance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        waktu_hadir TEXT NOT NULL, 
        confidence_score REAL, 
        status TEXT NOT NULL,
        source_device TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_face_embeddings_user_id ON face_embeddings(user_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_id ON attendance_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_logs_waktu_hadir ON attendance_logs(waktu_hadir);
    `);

    logger.info('SQLite migrations completed');
  } catch (error) {
    logger.error({ err: error }, 'Gagal menjalankan migrasi database');
    throw error;
  }
}