import { z } from 'zod';

export const updateStudentSchema = z.object({
  nama_lengkap: z.string().min(3).max(100).optional(),
  nim_nip: z.string().min(5).max(20).optional(),
});
