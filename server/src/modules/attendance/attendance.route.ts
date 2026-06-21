import { Router } from 'express';
import { postScan } from './attendance.controller.js';

export const attendanceRouter = Router();

// Endpoint final: POST /api/attendance/scan
attendanceRouter.post('/scan', postScan);