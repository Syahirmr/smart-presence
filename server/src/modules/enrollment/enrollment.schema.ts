import { z } from 'zod';

const embeddingVectorSchema = z.array(z.number().finite()).min(1).max(1024);

export const enrollBodySchema = z.object({
  nim_nip: z.string().trim().min(1).max(50),
  nama_lengkap: z.string().trim().min(3).max(120),
  embeddings: z.array(embeddingVectorSchema).length(3),
});

export type EnrollBody = z.infer<typeof enrollBodySchema>;