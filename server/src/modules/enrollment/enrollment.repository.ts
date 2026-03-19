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

export type ExistingFaceEmbeddingRow = {
  user_id: string;
  nim_nip: string;
  nama_lengkap: string;
  embedding_data: string;
};

type CreateUserWithEmbeddingsInput = {
  nimNip: string;
  namaLengkap: string;
  embeddingsJsonArray: string[];
};

let findUserByNimNipStmt: Database.Statement | null = null;
let getAllFaceEmbeddingsStmt: Database.Statement | null = null;
let insertUserStmt: Database.Statement | null = null;
let insertEmbeddingStmt: Database.Statement | null = null;
let createUserWithEmbeddingsTx:
  | ((input: CreateUserWithEmbeddingsInput) => {
      id: string;
      nim_nip: string;
      nama_lengkap: string;
    })
  | null = null;

export function initEnrollmentStatements() {
  if (
    findUserByNimNipStmt &&
    getAllFaceEmbeddingsStmt &&
    insertUserStmt &&
    insertEmbeddingStmt &&
    createUserWithEmbeddingsTx
  ) {
    return;
  }

  findUserByNimNipStmt = db.prepare(`
    SELECT id, nim_nip, nama_lengkap, created_at, updated_at
    FROM users
    WHERE nim_nip = ?
    LIMIT 1
  `);

  getAllFaceEmbeddingsStmt = db.prepare(`
    SELECT
      u.id AS user_id,
      u.nim_nip,
      u.nama_lengkap,
      f.embedding_data
    FROM users u
    JOIN face_embeddings f ON f.user_id = u.id
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

function assertEnrollmentStatementsReady() {
  if (!findUserByNimNipStmt || !getAllFaceEmbeddingsStmt || !createUserWithEmbeddingsTx) {
    throw new Error('Enrollment statements are not initialized');
  }
}

export function findUserByNimNip(nimNip: string): UserRow | undefined {
  assertEnrollmentStatementsReady();
  return findUserByNimNipStmt!.get(nimNip) as UserRow | undefined;
}

export function getAllFaceEmbeddings(): ExistingFaceEmbeddingRow[] {
  assertEnrollmentStatementsReady();
  return getAllFaceEmbeddingsStmt!.all() as ExistingFaceEmbeddingRow[];
}

export function createUserWithEmbeddings(input: CreateUserWithEmbeddingsInput) {
  assertEnrollmentStatementsReady();
  return createUserWithEmbeddingsTx!(input);
}