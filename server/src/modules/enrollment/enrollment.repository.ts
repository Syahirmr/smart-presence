import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { db } from '../../db/sqlite.js';

export type UserRow = {
  id: string;
  nim_nip: string;
  nama_lengkap: string;
  created_at: string;
  updated_at: string;
};

type CreateUserWithEmbeddingsInput = {
  nimNip: string;
  namaLengkap: string;
  embeddingsJsonArray: string[];
};

// Deklarasi statement & transaction di luar
let findUserByNimNipStmt: Database.Statement | null = null;
let insertUserStmt: Database.Statement | null = null;
let insertEmbeddingStmt: Database.Statement | null = null;
let createUserWithEmbeddingsTx:
  | ((input: CreateUserWithEmbeddingsInput) => {
      id: string;
      nim_nip: string;
      nama_lengkap: string;
    })
  | null = null;

// Fungsi ini yang bakal dipanggil di server.ts
export function initEnrollmentStatements() {
  if (findUserByNimNipStmt && insertUserStmt && insertEmbeddingStmt && createUserWithEmbeddingsTx) {
    return;
  }

  findUserByNimNipStmt = db.prepare(`
    SELECT id, nim_nip, nama_lengkap, created_at, updated_at
    FROM users
    WHERE nim_nip = ?
    LIMIT 1
  `);

  insertUserStmt = db.prepare(`
    INSERT INTO users (id, nim_nip, nama_lengkap)
    VALUES (?, ?, ?)
  `);

  insertEmbeddingStmt = db.prepare(`
    INSERT INTO face_embeddings (user_id, embedding_data)
    VALUES (?, ?)
  `);

  createUserWithEmbeddingsTx = db.transaction((payload: CreateUserWithEmbeddingsInput) => {
    if (!insertUserStmt || !insertEmbeddingStmt) {
      throw new Error('Enrollment statements are not initialized');
    }

    const userId = `usr-${randomUUID()}`;

    insertUserStmt.run(userId, payload.nimNip, payload.namaLengkap);

    for (const embeddingJson of payload.embeddingsJsonArray) {
      insertEmbeddingStmt.run(userId, embeddingJson);
    }

    return {
      id: userId,
      nim_nip: payload.nimNip,
      nama_lengkap: payload.namaLengkap,
    };
  });
}

// Guard buat mastiin init udah dipanggil
function assertEnrollmentStatementsReady() {
  if (!findUserByNimNipStmt || !createUserWithEmbeddingsTx) {
    throw new Error('Enrollment statements are not initialized');
  }
}

export function findUserByNimNip(nimNip: string): UserRow | undefined {
  assertEnrollmentStatementsReady();
  return findUserByNimNipStmt!.get(nimNip) as UserRow | undefined;
}

export function createUserWithEmbeddings(input: CreateUserWithEmbeddingsInput) {
  assertEnrollmentStatementsReady();
  return createUserWithEmbeddingsTx!(input);
}