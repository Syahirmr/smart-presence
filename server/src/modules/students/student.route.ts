import { Router } from 'express';
import { requireAdminAuth } from '../../middlewares/require-admin-auth.js';
import { getStudents, patchStudent, deleteStudent } from './student.controller.js';

export const studentRouter = Router();

studentRouter.use(requireAdminAuth);

studentRouter.get('/', getStudents);
studentRouter.patch('/:id', patchStudent);
studentRouter.delete('/:id', deleteStudent);
