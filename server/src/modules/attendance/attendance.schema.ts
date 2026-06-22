import { z } from 'zod';

const embeddingVectorSchema = z.array(z.number().finite()).min(1).max(1024);

export const attendanceBodySchema = z.object({
  kiosk_id: z.string().trim().min(1).max(100),
  session_id: z.string().trim().min(1), // 🔥 FIXED: Validasi payload Kiosk wajib bawa ID Sesi
  faces: z.array(
    z.object({
      embedding: embeddingVectorSchema,
    }),
  ).min(1).max(2),
});

export type AttendanceBody = z.infer<typeof attendanceBodySchema>;