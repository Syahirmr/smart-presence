import { z } from 'zod';

export const adminLoginBodySchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(6).max(100),
});

export type AdminLoginBody = z.infer<typeof adminLoginBodySchema>;