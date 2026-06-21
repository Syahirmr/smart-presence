import { z } from 'zod';

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

export const adminAttendanceOverrideSchema = z.object({
  nim_nip: z.string().min(1, 'NIM/NIP wajib diisi'),
  tanggal: dateStringSchema,
  status: z.enum(['HADIR', 'SAKIT', 'IZIN', 'ALPHA'], {
    message: 'Status harus HADIR, SAKIT, IZIN, atau ALPHA',
  }),
  keterangan: z.string().min(1, 'Keterangan wajib diisi').max(500, 'Keterangan maksimal 500 karakter'),
});

export type AdminAttendanceOverrideInput = z.infer<typeof adminAttendanceOverrideSchema>;
