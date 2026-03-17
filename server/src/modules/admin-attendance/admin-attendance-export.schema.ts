import { z } from 'zod';

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

export const adminAttendanceExportQuerySchema = z
  .object({
    date: dateStringSchema.optional(),
    start_date: dateStringSchema.optional(),
    end_date: dateStringSchema.optional(),
  })
  .refine(
    (data) => Boolean(data.date) || Boolean(data.start_date) || Boolean(data.end_date),
    {
      message: 'Filter export wajib diisi',
      path: ['date'],
    },
  )
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

export type AdminAttendanceExportQuery = z.infer<typeof adminAttendanceExportQuerySchema>;