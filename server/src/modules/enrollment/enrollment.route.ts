import { Router } from 'express';
import { postEnroll } from './enrollment.controller.js';

export const enrollmentRouter = Router();

enrollmentRouter.post('/', postEnroll);