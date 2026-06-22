import { z } from 'zod';

export const createSessionSchema = z.object({
  nama_matkul: z.string().min(1, 'Nama matkul wajib diisi'),
  waktu_mulai: z.string().min(1, 'Waktu mulai wajib diisi'),
  waktu_selesai: z.string().min(1, 'Waktu selesai wajib diisi'),
});

export const updateSessionStatusSchema = z.object({
  status: z.enum(['scheduled', 'active', 'completed']),
});
