import { z } from 'zod';

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

export const adminAttendanceQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    date: dateStringSchema.optional(),
    start_date: dateStringSchema.optional(),
    end_date: dateStringSchema.optional(),
  })
  .refine(
    (data) => !(data.date && (data.start_date || data.end_date)),
    {
      message: 'Parameter date tidak boleh digabung dengan start_date atau end_date',
      path: ['date'],
    },
  )
  .refine(
    (data) =>
      (!data.start_date && !data.end_date) ||
      (Boolean(data.start_date) && Boolean(data.end_date)),
    {
      message: 'start_date dan end_date harus dikirim berpasangan',
      path: ['start_date'],
    },
  );

export type AdminAttendanceQuery = z.infer<typeof adminAttendanceQuerySchema>;