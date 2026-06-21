import type Database from 'better-sqlite3';
import { db } from '../../db/sqlite.js';

export type AdminRow = {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
};

type EnsureDefaultAdminInput = {
  username: string;
  passwordHash: string;
};

let findAdminByUsernameStmt: Database.Statement | null = null;
let findAdminByIdStmt: Database.Statement | null = null;
let countAdminsStmt: Database.Statement | null = null;
let insertAdminStmt: Database.Statement | null = null;
let updateAdminPasswordHashStmt: Database.Statement | null = null;
let ensureDefaultAdminTx:
  | ((input: EnsureDefaultAdminInput) => { created: boolean; username: string })
  | null = null;

export function initAdminAuthStatements() {
  if (
    findAdminByUsernameStmt &&
    findAdminByIdStmt &&
    countAdminsStmt &&
    insertAdminStmt &&
    updateAdminPasswordHashStmt &&
    ensureDefaultAdminTx
  ) {
    return;
  }

  findAdminByUsernameStmt = db.prepare(`
    SELECT id, username, password_hash, created_at
    FROM admins
    WHERE username = ?
    LIMIT 1
  `);

  findAdminByIdStmt = db.prepare(`
    SELECT id, username, password_hash, created_at
    FROM admins
    WHERE id = ?
    LIMIT 1
  `);

  countAdminsStmt = db.prepare(`
    SELECT COUNT(*) AS total
    FROM admins
  `);

  insertAdminStmt = db.prepare(`
    INSERT INTO admins (username, password_hash)
    VALUES (?, ?)
  `);

  updateAdminPasswordHashStmt = db.prepare(`
    UPDATE admins
    SET password_hash = ?
    WHERE id = ?
  `);

  ensureDefaultAdminTx = db.transaction((input: EnsureDefaultAdminInput) => {
    if (!countAdminsStmt || !insertAdminStmt) {
      throw new Error('Admin auth statements are not initialized');
    }

    const row = countAdminsStmt.get() as { total: number };

    if (row.total > 0) {
      return {
        created: false,
        username: input.username,
      };
    }

    insertAdminStmt.run(input.username, input.passwordHash);

    return {
      created: true,
      username: input.username,
    };
  });
}

function assertAdminAuthStatementsReady() {
  if (
    !findAdminByUsernameStmt ||
    !findAdminByIdStmt ||
    !updateAdminPasswordHashStmt ||
    !ensureDefaultAdminTx
  ) {
    throw new Error('Admin auth statements are not initialized');
  }
}

export function findAdminByUsername(username: string): AdminRow | undefined {
  assertAdminAuthStatementsReady();
  return findAdminByUsernameStmt!.get(username) as AdminRow | undefined;
}

export function findAdminById(adminId: number): AdminRow | undefined {
  assertAdminAuthStatementsReady();
  return findAdminByIdStmt!.get(adminId) as AdminRow | undefined;
}

export function updateAdminPasswordHash(adminId: number, newPasswordHash: string) {
  assertAdminAuthStatementsReady();

  const result = updateAdminPasswordHashStmt!.run(newPasswordHash, adminId);

  return {
    updated: result.changes > 0,
  };
}

export function ensureDefaultAdmin(input: EnsureDefaultAdminInput) {
  assertAdminAuthStatementsReady();
  return ensureDefaultAdminTx!(input);
}