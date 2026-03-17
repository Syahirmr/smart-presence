import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

const dbFilePath = path.resolve(process.cwd(), env.DB_PATH);

// Bikin foldernya otomatis kalau belum ada
fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });

export const db = new Database(dbFilePath);

// Optimasi SQLite biar ngacir dan aman
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('temp_store = MEMORY');

export function getDbPath() {
  return dbFilePath;
}