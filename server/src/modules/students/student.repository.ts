import type Database from 'better-sqlite3';
import { db } from '../../db/sqlite.js';

export type StudentRow = {
  id: string;
  nim_nip: string;
  nama_lengkap: string;
  created_at: string;
  updated_at: string;
};

export function getAllActiveStudents(): StudentRow[] {
  const stmt = db.prepare(`
    SELECT id, nim_nip, nama_lengkap, created_at, updated_at
    FROM users
    WHERE is_active = 1
    ORDER BY nama_lengkap ASC
  `);
  return stmt.all() as StudentRow[];
}

export function updateStudent(id: string, nama_lengkap?: string, nim_nip?: string): boolean {
  if (!nama_lengkap && !nim_nip) return false;

  const sets: string[] = [];
  const params: any[] = [];

  if (nama_lengkap) {
    sets.push('nama_lengkap = ?');
    params.push(nama_lengkap);
  }
  
  if (nim_nip) {
    sets.push('nim_nip = ?');
    params.push(nim_nip);
  }

  sets.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);

  const query = `UPDATE users SET ${sets.join(', ')} WHERE id = ? AND is_active = 1`;
  const stmt = db.prepare(query);
  const info = stmt.run(...params);

  return info.changes > 0;
}

export function softDeleteStudent(id: string): boolean {
  // 🔥 FIXED: Gunakan transaction agar Soft Delete User dan Hard Delete Vektor bersifat Atomic
  const transaction = db.transaction((studentId: string) => {
    // 1. Hapus memori vektor wajah agar AI tidak menumpuk 'wajah hantu'
    db.prepare('DELETE FROM face_embeddings WHERE user_id = ?').run(studentId);
    
    // 2. Soft delete data mahasiswanya
    const stmt = db.prepare(`
      UPDATE users 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND is_active = 1
    `);
    const info = stmt.run(studentId);
    
    return info.changes > 0;
  });

  return transaction(id);
}

// 🔥 FIXED: Fitur Reset Wajah (Hard Delete vektor tanpa soft delete mahasiswanya)
export function deleteFaceVector(id: string): void {
  const stmt = db.prepare('DELETE FROM face_embeddings WHERE user_id = ?');
  stmt.run(id);
}
