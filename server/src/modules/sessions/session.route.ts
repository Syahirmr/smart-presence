import { Router } from 'express';
import { requireAdminAuth } from '../../middlewares/require-admin-auth.js';
import { getSessions, patchSessionStatus, postCreateSession } from './session.controller.js';

export const sessionRouter = Router();

// Semua rute ini diproteksi requireAdminAuth di level route atau app.js
sessionRouter.post('/sessions', requireAdminAuth, postCreateSession);
sessionRouter.get('/sessions', requireAdminAuth, getSessions);
sessionRouter.patch('/sessions/:id/status', requireAdminAuth, patchSessionStatus);
