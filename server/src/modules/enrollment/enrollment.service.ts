import { AppError } from '../../lib/app-error.js';
import {
  createUserWithEmbeddings,
  findUserByNimNip,
  getAllFaceEmbeddings,
} from './enrollment.repository.js';
import type { EnrollBody } from './enrollment.schema.js';

const FACE_DUPLICATE_SIMILARITY_THRESHOLD = 0.88;

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return -1;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];

    if (a === undefined || b === undefined) {
      return -1;
    }

    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) {
    return -1;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function findBestDuplicateMatch(newEmbeddings: number[][]) {
  const existingRows = getAllFaceEmbeddings();

  let bestScore = -1;
  let bestMatch: {
    user_id: string;
    nim_nip: string;
    nama_lengkap: string;
  } | null = null;

  for (const row of existingRows) {
    let dbEmbedding: number[];

    try {
      const parsed = JSON.parse(row.embedding_data);

      if (!Array.isArray(parsed) || parsed.length === 0 || Array.isArray(parsed[0])) {
        continue;
      }

      dbEmbedding = parsed as number[];
    } catch {
      continue;
    }

    for (const newEmbedding of newEmbeddings) {
      const score = cosineSimilarity(newEmbedding, dbEmbedding);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          user_id: row.user_id,
          nim_nip: row.nim_nip,
          nama_lengkap: row.nama_lengkap,
        };
      }
    }
  }

  return {
    bestScore,
    bestMatch,
    isDuplicate:
      bestMatch !== null && bestScore >= FACE_DUPLICATE_SIMILARITY_THRESHOLD,
  };
}

export function enrollUser(input: EnrollBody) {
  const nimNip = input.nim_nip.trim();
  const namaLengkap = input.nama_lengkap.trim();
  const newEmbeddings = input.embeddings;

  const existingUser = findUserByNimNip(nimNip);

  if (existingUser) {
    throw new AppError(409, 'DUPLICATE_USER', 'NIM/NIP sudah terdaftar');
  }

  const duplicateCheck = findBestDuplicateMatch(newEmbeddings);

  if (duplicateCheck.isDuplicate && duplicateCheck.bestMatch) {
    throw new AppError(
      409,
      'FACE_ALREADY_REGISTERED',
      'Wajah ini sudah terdaftar atas identitas lain',
      {
        matched_user_id: duplicateCheck.bestMatch.user_id,
        matched_nim_nip: duplicateCheck.bestMatch.nim_nip,
        matched_nama_lengkap: duplicateCheck.bestMatch.nama_lengkap,
        similarity_score: Number(duplicateCheck.bestScore.toFixed(4)),
      },
    );
  }

  const embeddingsJsonArray = newEmbeddings.map((embedding) => JSON.stringify(embedding));

  const createdUser = createUserWithEmbeddings({
    nimNip,
    namaLengkap,
    embeddingsJsonArray,
  });

  return createdUser;
}