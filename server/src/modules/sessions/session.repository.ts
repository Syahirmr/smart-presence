import { randomUUID } from 'node:crypto';
import { db } from '../../db/sqlite.js';

export type SessionRow = {
  id: string;
  nama_matkul: string;
  waktu_mulai: string;
  waktu_selesai: string;
  status: string;
  admin_id: number;
  created_at: string;
  updated_at: string;
};

export function createSession(data: {
  nama_matkul: string;
  waktu_mulai: string;
  waktu_selesai: string;
  admin_id: number;
}) {
  const id = randomUUID();
  const stmt = db.prepare(`
    INSERT INTO sessions (id, nama_matkul, waktu_mulai, waktu_selesai, status, admin_id)
    VALUES (?, ?, ?, ?, 'scheduled', ?)
  `);
  
  stmt.run(id, data.nama_matkul, data.waktu_mulai, data.waktu_selesai, data.admin_id);
  
  return id;
}

export function getAllSessions(): SessionRow[] {
  const stmt = db.prepare(`
    SELECT * FROM sessions ORDER BY created_at DESC
  `);
  return stmt.all() as SessionRow[];
}

export function updateSessionStatus(id: string, status: string) {
  // Gunakan transaction agar operasi update saling berhubungan dan aman
  const transaction = db.transaction(() => {
    // Jika sesi diaktifkan, pastikan sesi aktif lainnya dimatikan
    if (status === 'active') {
      const deactivateStmt = db.prepare(`
        UPDATE sessions 
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'active' AND id != ?
      `);
      deactivateStmt.run(id);
    }

    const updateStmt = db.prepare(`
      UPDATE sessions 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const info = updateStmt.run(status, id);
    return info.changes > 0;
  });

  return transaction();
}
