import { Router } from 'express';
import { requireAdminAuth } from '../../middlewares/require-admin-auth.js';
import { getDashboardStats } from './dashboard.controller.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAdminAuth);

dashboardRouter.get('/stats', getDashboardStats);
