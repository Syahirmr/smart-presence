import {
  getAllUserEmbeddings,
  hasRecentAttendance,
  insertAttendanceLog,
} from './attendance.repository.js';
import type { AttendanceBody } from './attendance.schema.js';

const SIMILARITY_THRESHOLD = 0.85;
const COOLDOWN_MINUTES = 60;

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const len = Math.min(vecA.length, vecB.length);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    const a = vecA[i];
    const b = vecB[i];

    // TS Guard: Mastiin elemennya ga undefined gara-gara noUncheckedIndexedAccess
    if (a === undefined || b === undefined) {
      continue;
    }

    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function processAttendance(input: AttendanceBody) {
  // 3. Fix: kiosk_id di-trim biar aman
  const kioskId = input.kiosk_id.trim();
  const faces = input.faces;

  const now = new Date();
  const nowIso = now.toISOString();

  const allEmbeddings = getAllUserEmbeddings();

  const userEmbeddingsMap = new Map<
    string,
    { nim_nip: string; nama_lengkap: string; embeddings: number[][] }
  >();

  for (const row of allEmbeddings) {
    if (!userEmbeddingsMap.has(row.id)) {
      userEmbeddingsMap.set(row.id, {
        nim_nip: row.nim_nip,
        nama_lengkap: row.nama_lengkap,
        embeddings: [],
      });
    }
    
    // 4. Fix: Guard buat JSON.parse biar ga jebol kalau ada 1 row rusak
    try {
      const parsedEmbedding = JSON.parse(row.embedding_data) as number[];
      if (Array.isArray(parsedEmbedding)) {
        userEmbeddingsMap.get(row.id)!.embeddings.push(parsedEmbedding);
      }
    } catch {
      continue;
    }
  }

  const cooldownThreshold = new Date(now.getTime() - COOLDOWN_MINUTES * 60 * 1000);
  const thresholdTimeIso = cooldownThreshold.toISOString();

  const results = [];
  
  // 2. Fix: Track duplicate user dalam 1 request yang sama (biar ga double insert)
  const acceptedUserIdsInRequest = new Set<string>();

  for (const face of faces) {
    let bestScore = -1;
    let bestMatchUser: { id: string; nim_nip: string; nama_lengkap: string } | null = null;

    for (const [userId, userData] of userEmbeddingsMap.entries()) {
      for (const dbEmbedding of userData.embeddings) {
        
        // 1. Fix: Handle dimension mismatch (cegah error beda panjang array)
        if (face.embedding.length !== dbEmbedding.length) {
          continue;
        }

        const score = cosineSimilarity(face.embedding, dbEmbedding);
        if (score > bestScore) {
          bestScore = score;
          bestMatchUser = {
            id: userId,
            nim_nip: userData.nim_nip,
            nama_lengkap: userData.nama_lengkap,
          };
        }
      }
    }

    if (bestScore < SIMILARITY_THRESHOLD || !bestMatchUser) {
      results.push({
        status: 'UNKNOWN',
        user: null,
        confidence_score: bestScore > 0 ? Number(bestScore.toFixed(4)) : 0,
      });
      continue;
    }

    // Cek Duplicate Level 1: Apakah user ini udah lolos di wajah sebelumnya dalam request ini?
    if (acceptedUserIdsInRequest.has(bestMatchUser.id)) {
      results.push({
        status: 'DUPLICATE',
        user: bestMatchUser,
        confidence_score: Number(bestScore.toFixed(4)),
      });
      continue;
    }

    // Cek Duplicate Level 2: Cek ke Database (Cooldown 60 menit)
    const isDuplicateDb = hasRecentAttendance(bestMatchUser.id, thresholdTimeIso);

    if (isDuplicateDb) {
      results.push({
        status: 'DUPLICATE',
        user: bestMatchUser,
        confidence_score: Number(bestScore.toFixed(4)),
      });
      continue;
    }

    insertAttendanceLog({
      userId: bestMatchUser.id,
      waktuHadir: nowIso,
      confidenceScore: Number(bestScore.toFixed(4)),
      status: 'HADIR',
      kioskId: kioskId, 
    });

    // Tandain user ini udah berhasil absen di request ini
    acceptedUserIdsInRequest.add(bestMatchUser.id);

    results.push({
      status: 'HADIR',
      user: bestMatchUser,
      confidence_score: Number(bestScore.toFixed(4)),
    });
  }

  return results;
}