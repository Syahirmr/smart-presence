import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/api-response.js';
import { AppError } from '../../lib/app-error.js';
import { getAllSettings, updateSettings } from './setting.repository.js';

export function getSettings(_req: Request, res: Response) {
  const settings = getAllSettings();
  return sendSuccess(res, {
    statusCode: 200,
    code: 'SETTINGS_FETCHED',
    message: 'Berhasil mengambil pengaturan',
    data: { settings },
  });
}

export function patchSettings(req: Request, res: Response) {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    throw new AppError(400, 'BAD_REQUEST', 'Payload harus berupa JSON object');
  }

  // Ensure all values are strings for SQLite
  const payload: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    payload[k] = String(v);
  }

  updateSettings(payload);

  return sendSuccess(res, {
    statusCode: 200,
    code: 'SETTINGS_UPDATED',
    message: 'Pengaturan berhasil diperbarui',
    data: { settings: getAllSettings() },
  });
}
