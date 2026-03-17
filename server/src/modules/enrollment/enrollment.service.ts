import { AppError } from '../../lib/app-error.js';
import { createUserWithEmbeddings, findUserByNimNip } from './enrollment.repository.js';
import type { EnrollBody } from './enrollment.schema.js';

export function enrollUser(input: EnrollBody) {
  const nimNip = input.nim_nip.trim();
  const namaLengkap = input.nama_lengkap.trim();

  const existingUser = findUserByNimNip(nimNip);

  if (existingUser) {
    throw new AppError(409, 'DUPLICATE_USER', 'NIM/NIP sudah terdaftar');
  }

  const embeddingsJsonArray = input.embeddings.map((embedding) =>
    JSON.stringify(embedding),
  );

  const createdUser = createUserWithEmbeddings({
    nimNip,
    namaLengkap,
    embeddingsJsonArray,
  });

  return createdUser;
}