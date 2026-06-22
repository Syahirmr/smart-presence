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

      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        nama_matkul TEXT NOT NULL,
        waktu_mulai TEXT NOT NULL,
        waktu_selesai TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        admin_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES admins(id)
      );

      CREATE TABLE IF NOT EXISTS attendance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        waktu_hadir TEXT NOT NULL, 
        confidence_score REAL NOT NULL,
        status TEXT NOT NULL,
        kiosk_id TEXT NOT NULL, -- 🔥 FIXED: Udah sinkron sama payload Kiosk
        keterangan TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      -- Indexing standar
      CREATE INDEX IF NOT EXISTS idx_face_embeddings_user_id ON face_embeddings(user_id);

      -- 🔥 FIXED: Tabel Config/Settings
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // 🔥 FIXED: Nilai default settings
    db.exec(`
      INSERT OR IGNORE INTO settings (key, value) 
      VALUES ('kampus_name', 'Universitas Brawijaya'), 
             ('kiosk_password', 'admin123'),
             ('ai_threshold', '0.85'),
             ('ai_brightness', '1.0'),
             ('ai_contrast', '1.0');
    `);

    // Safe dynamic migration: add 'keterangan' and 'session_id' columns if they do not exist
    const columns = db.pragma('table_info(attendance_logs)') as { name: string }[];
    const hasKeterangan = columns.some((col) => col.name === 'keterangan');
    const hasSessionId = columns.some((col) => col.name === 'session_id');

    // Safe dynamic migration: add 'is_active' column to users if it does not exist
    const usersColumns = db.pragma('table_info(users)') as { name: string }[];
    const hasIsActive = usersColumns.some((col) => col.name === 'is_active');

    if (!hasIsActive) {
      // 🔥 FIXED: Soft delete column
      db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;');
    }

    if (!hasKeterangan) {
      db.exec('ALTER TABLE attendance_logs ADD COLUMN keterangan TEXT;');
    }
    
    if (!hasSessionId) {
      // 🔥 FIXED: Tambahkan kolom session_id jika belum ada tanpa menghancurkan data lama
      db.exec("ALTER TABLE attendance_logs ADD COLUMN session_id TEXT NOT NULL DEFAULT 'default-session';");
    }

    // Buat composite index SETELAH memastikan kolom session_id benar-benar ada
    db.exec(`
      -- 🔥 FIXED: Composite index maut buat optimasi query Anti-Dobel dalam Sesi
      CREATE INDEX IF NOT EXISTS idx_attendance_logs_session_user ON attendance_logs(session_id, user_id);
    `);



    logger.info('SQLite migrations completed');
  } catch (error) {
    logger.error({ err: error }, 'Gagal menjalankan migrasi database');
    throw error;
  }
}