import { Router } from 'express';
import { requireAdminAuth } from '../../middlewares/require-admin-auth.js';
import { deleteStudent, getStudents, patchStudent, resetStudentFace } from './student.controller.js';

export const studentRouter = Router();

studentRouter.use(requireAdminAuth);

studentRouter.get('/', getStudents);
studentRouter.patch('/:id', patchStudent);
studentRouter.delete('/:id', deleteStudent);
studentRouter.delete('/:id/face', resetStudentFace);
