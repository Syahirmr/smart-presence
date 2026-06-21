import { Router } from 'express';
import { adminLoginRateLimit } from '../../middlewares/admin-login-rate-limit.js';
import { requireAdminAuth } from '../../middlewares/require-admin-auth.js';
import { postAdminLogin } from './admin-auth.controller.js';
import { postAdminChangePassword } from './change-password.controller.js';

export const adminAuthRouter = Router();

adminAuthRouter.post('/login', adminLoginRateLimit, postAdminLogin);
adminAuthRouter.post('/change-password', requireAdminAuth, postAdminChangePassword);