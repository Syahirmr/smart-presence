import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/api-response.js';
import { getHadirHariIni, getTotalMahasiswa } from './dashboard.repository.js';

export function getDashboardStats(_req: Request, res: Response) {
  const total_mahasiswa = getTotalMahasiswa();
  const hadir_hari_ini = getHadirHariIni();
  const alpha = total_mahasiswa - hadir_hari_ini;

  return sendSuccess(res, {
    statusCode: 200,
    code: 'DASHBOARD_STATS_FETCHED',
    message: 'Berhasil mengambil statistik dashboard',
    data: {
      total_mahasiswa,
      hadir_hari_ini,
      alpha,
    },
  });
}
