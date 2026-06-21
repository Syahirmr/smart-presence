import { z } from 'zod';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 100;

export const changeAdminPasswordBodySchema = z
  .object({
    current_password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
    new_password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
    confirm_new_password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
  })
  .superRefine((data, ctx) => {
    if (data.new_password === data.current_password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['new_password'],
        message: 'Password baru tidak boleh sama dengan password saat ini',
      });
    }

    if (data.confirm_new_password !== data.new_password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirm_new_password'],
        message: 'Konfirmasi password baru tidak sama',
      });
    }
  });

export type ChangeAdminPasswordBody = z.infer<typeof changeAdminPasswordBodySchema>;