import { getSocketInstance } from '../../sockets/index.js';
import {
  getAllUserEmbeddings,
  hasRecentAttendance,
  insertAttendanceLog,
} from './attendance.repository.js';
import type { AttendanceBody } from './attendance.schema.js';

// Threshold diturunkan jadi 0.70 biar AI lebih toleran
const SIMILARITY_THRESHOLD = 0.80;
const COOLDOWN_MINUTES = 60;

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const len = Math.min(vecA.length, vecB.length);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    const a = vecA[i];
    const b = vecB[i];

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

    // 👇 INI BAGIAN YANG DIPERBAIKI: Ngebaca 3 sampel wajah dengan benar 👇
    try {
      const parsedEmbedding = JSON.parse(row.embedding_data);
      if (Array.isArray(parsedEmbedding)) {
        // Cek apakah datanya Array di dalam Array (karena kita ngirim 3 sampel pas Register)
        if (parsedEmbedding.length > 0 && Array.isArray(parsedEmbedding[0])) {
          userEmbeddingsMap.get(row.id)!.embeddings.push(...parsedEmbedding);
        } else {
          userEmbeddingsMap.get(row.id)!.embeddings.push(parsedEmbedding as number[]);
        }
      }
    } catch {
      continue;
    }
  }

  const cooldownThreshold = new Date(now.getTime() - COOLDOWN_MINUTES * 60 * 1000);
  const thresholdTimeIso = cooldownThreshold.toISOString();

  const results = [];
  const acceptedUserIdsInRequest = new Set<string>();

  for (const face of faces) {
    let bestScore = -1;
    let bestMatchUser: { id: string; nim_nip: string; nama_lengkap: string } | null = null;

    for (const [userId, userData] of userEmbeddingsMap.entries()) {
      for (const dbEmbedding of userData.embeddings) {
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

    if (acceptedUserIdsInRequest.has(bestMatchUser.id)) {
      results.push({
        status: 'DUPLICATE',
        user: bestMatchUser,
        confidence_score: Number(bestScore.toFixed(4)),
      });
      continue;
    }

    const isDuplicateDb = hasRecentAttendance(bestMatchUser.id, thresholdTimeIso);

    if (isDuplicateDb) {
      results.push({
        status: 'DUPLICATE',
        user: bestMatchUser,
        confidence_score: Number(bestScore.toFixed(4)),
      });
      continue;
    }

    const confidenceScore = Number(bestScore.toFixed(4));

    insertAttendanceLog({
      userId: bestMatchUser.id,
      waktuHadir: nowIso,
      confidenceScore,
      status: 'HADIR',
      kioskId,
    });

    acceptedUserIdsInRequest.add(bestMatchUser.id);

    const io = getSocketInstance();
    if (io) {
      io.emit('new_attendance', {
        kiosk_id: kioskId,
        waktu_hadir: nowIso,
        confidence_score: confidenceScore,
        user: bestMatchUser,
      });
    }

    results.push({
      status: 'HADIR',
      user: bestMatchUser,
      confidence_score: confidenceScore,
    });
  }

  return results;
}