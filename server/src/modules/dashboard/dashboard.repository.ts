import { db } from '../../db/sqlite.js';

export function getTotalMahasiswa(): number {
  const stmt = db.prepare(`SELECT COUNT(*) as total FROM users WHERE is_active = 1`);
  const row = stmt.get() as { total: number };
  return row.total;
}

export function getHadirHariIni(): number {
  // 🔥 FIXED: Konversi waktu UTC ke localtime agar sinkron dengan hari di server lokal
  // dan menggunakan DISTINCT user_id agar mahasiswa yang hadir di 2 sesi berbeda pada hari yang sama tidak dihitung ganda.
  // JOIN ke users u untuk memastikan mahasiswa yang di-soft delete tidak ikut terhitung sebagai HADIR (mencegah Negative Alpha Bug)
  const stmt = db.prepare(`
    SELECT COUNT(DISTINCT a.user_id) as hadir 
    FROM attendance_logs a
    JOIN users u ON a.user_id = u.id
    WHERE a.status = 'HADIR' 
      AND date(a.waktu_hadir, 'localtime') = date('now', 'localtime')
      AND u.is_active = 1
  `);
  const row = stmt.get() as { hadir: number };
  return row.hadir;
}
