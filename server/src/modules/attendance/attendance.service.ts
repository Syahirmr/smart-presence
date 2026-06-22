import { getSocketInstance } from '../../sockets/index.js';
import { AppError } from '../../lib/app-error.js';
import {
  getAllUserEmbeddings,
  hasSessionAttendance,
  insertAttendanceLog,
  getActiveSession,
} from './attendance.repository.js';
import { getAllSettings } from '../settings/setting.repository.js';
import type { AttendanceBody } from './attendance.schema.js';

function euclideanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 999;
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];

    if (a === undefined || b === undefined) {
      continue;
    }

    const diff = a - b;
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function processAttendance(input: AttendanceBody) {
  const kioskId = input.kiosk_id.trim();
  const faces = input.faces;

  const now = new Date();
  const nowIso = now.toISOString();

  const activeSession = getActiveSession();
  if (!activeSession) {
    throw new AppError(400, 'NO_ACTIVE_SESSION', 'Tidak ada sesi kelas yang sedang aktif saat ini. Presensi ditolak.');
  }

  // 🔥 FIXED: Double Check - Pastikan sesi yang dikirim Kiosk beneran sama dengan sesi yang aktif di DB
  if (input.session_id !== activeSession.id) {
    throw new AppError(400, 'SESSION_MISMATCH', 'ID Sesi Kiosk tidak valid atau sudah kadaluarsa');
  }

  // 🔥 FIXED: Tarik threshold dari database secara dinamis
  const threshold = parseFloat(getAllSettings()['ai_threshold'] || '0.85');

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

  const results = [];
  const acceptedUserIdsInRequest = new Set<string>();

  for (const face of faces) {
    let bestScore = 999;
    let bestMatchUser: { id: string; nim_nip: string; nama_lengkap: string } | null = null;

    for (const [userId, userData] of userEmbeddingsMap.entries()) {
      for (const dbEmbedding of userData.embeddings) {
        if (face.embedding.length !== dbEmbedding.length) {
          continue;
        }

        const score = euclideanDistance(face.embedding, dbEmbedding);
        if (score < bestScore) {
          bestScore = score;
          bestMatchUser = {
            id: userId,
            nim_nip: userData.nim_nip,
            nama_lengkap: userData.nama_lengkap,
          };
        }
      }
    }

    if (bestScore > threshold || !bestMatchUser) {
      results.push({
        status: 'UNKNOWN',
        user: null,
        confidence_score: Number(bestScore.toFixed(4)),
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

    const isDuplicateDb = hasSessionAttendance(bestMatchUser.id, activeSession.id);

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
      sessionId: activeSession.id,
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