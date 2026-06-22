import { Router } from 'express';
import { requireAdminAuth } from '../../middlewares/require-admin-auth.js';
import { getSettings, patchSettings } from './setting.controller.js';

export const settingRouter = Router();

settingRouter.use(requireAdminAuth);

settingRouter.get('/', getSettings);
settingRouter.patch('/', patchSettings);
