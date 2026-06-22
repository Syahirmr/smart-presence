import { db } from '../../db/sqlite.js';

export function getAllSettings(): Record<string, string> {
  const stmt = db.prepare('SELECT key, value FROM settings');
  const rows = stmt.all() as { key: string; value: string }[];
  
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export function updateSettings(payload: Record<string, string>): void {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  
  const transaction = db.transaction((entries: [string, string][]) => {
    for (const [key, value] of entries) {
      stmt.run(key, value);
    }
  });

  transaction(Object.entries(payload));
}
