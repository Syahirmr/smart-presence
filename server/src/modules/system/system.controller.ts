import type { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { db, getDbPath } from '../../db/sqlite.js';
import { sendSuccess } from '../../lib/api-response.js';
import { AppError } from '../../lib/app-error.js';
import { logger } from '../../lib/logger.js';

export async function backupDatabase(_req: Request, res: Response) {
  try {
    const tempBackupPath = path.resolve(process.cwd(), `data/backup-${Date.now()}.db`);
    
    // Gunakan fungsi bawaan better-sqlite3 yang aman untuk backup (menghindari database is locked)
    await db.backup(tempBackupPath);

    res.download(tempBackupPath, 'smart-presence-backup.db', (err) => {
      if (err) {
        logger.error({ err }, 'Gagal mengirim file backup database');
      }
      // Bersihkan file temp setelah berhasil dikirim atau terjadi error
      if (fs.existsSync(tempBackupPath)) {
        fs.unlinkSync(tempBackupPath);
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Gagal melakukan backup database');
    throw new AppError(500, 'BACKUP_FAILED', 'Gagal melakukan backup database');
  }
}

export function restoreDatabase(req: Request, res: Response) {
  if (!req.file) {
    throw new AppError(400, 'BAD_REQUEST', 'File database (.db) diperlukan');
  }

  const uploadedFilePath = req.file.path;
  const originalDbPath = getDbPath();

  // a. Kirim respons sukses terlebih dahulu
  res.status(200).json({
    success: true,
    code: 'RESTORE_SUCCESS',
    message: 'Restore sukses, server akan restart',
  });

  // b. Gunakan setTimeout agar respons terkirim sebelum koneksi putus
  setTimeout(() => {
    try {
      logger.info('Memulai proses restore database...');
      
      // c. Putus koneksi SQLite saat ini
      db.close();

      // 🔥 FIXED: Hapus sisa file WAL dan SHM lama agar tidak meng-corrupt DB yang baru
      const walPath = `${originalDbPath}-wal`;
      const shmPath = `${originalDbPath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

      // d. Timpa file database asli dengan file upload
      fs.renameSync(uploadedFilePath, originalDbPath);

      logger.info('Database berhasil di-restore, merestart server...');
      
      // e. Matikan Node.js agar nodemon/tsx merestart server
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Gagal me-restore database, proses dihentikan secara paksa');
      process.exit(1);
    }
  }, 1000);
}
