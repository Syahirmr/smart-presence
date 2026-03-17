import { Router } from 'express';
import { postAdminLogin } from './admin-auth.controller.js';

export const adminAuthRouter = Router();

adminAuthRouter.post('/login', postAdminLogin);