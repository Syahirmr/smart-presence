import { Router } from 'express';
import { requireAdminAuth } from '../../middlewares/require-admin-auth.js';
import { getAdminAttendanceLogsController } from './admin-attendance.controller.js';
import { exportAdminAttendanceCsvController } from './admin-attendance-export.controller.js';

export const adminAttendanceRouter = Router();

adminAttendanceRouter.get('/attendance', requireAdminAuth, getAdminAttendanceLogsController);
adminAttendanceRouter.get('/attendance/export', requireAdminAuth, exportAdminAttendanceCsvController);