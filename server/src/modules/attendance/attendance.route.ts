import { Router } from 'express';
import { getActiveSessionPublic, postScan } from './attendance.controller.js';

export const attendanceRouter = Router();

// Endpoint public buat Frontend (Kiosk) buat ngambil sesi aktif
attendanceRouter.get('/active-session', getActiveSessionPublic);

// Endpoint final: POST /api/attendance/scan
attendanceRouter.post('/scan', postScan);