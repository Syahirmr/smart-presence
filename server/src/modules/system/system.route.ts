import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { requireAdminAuth } from '../../middlewares/require-admin-auth.js';
import { backupDatabase, restoreDatabase, getSystemHealth } from './system.controller.js';

export const systemRouter = Router();

// Konfigurasi multer untuk menyimpan file sementara di folder data
const upload = multer({ 
  dest: path.resolve(process.cwd(), 'data/temp_restore'),
  fileFilter: (_req, file, cb) => {
    // Basic filter untuk memastikan hanya file dengan nama .db yang bisa diupload
    if (file.originalname.endsWith('.db') || file.originalname.endsWith('.sqlite')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file database SQLite (.db atau .sqlite) yang diizinkan'));
    }
  }
});

systemRouter.use(requireAdminAuth);

systemRouter.get('/health', getSystemHealth);
systemRouter.get('/backup', backupDatabase);
systemRouter.post('/restore', upload.single('db_file'), restoreDatabase);
