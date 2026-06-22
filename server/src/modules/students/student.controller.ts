import type { Request, Response } from 'express';
import { sendSuccess } from '../../lib/api-response.js';
import { AppError } from '../../lib/app-error.js';
import { deleteFaceVector, getAllActiveStudents, softDeleteStudent, updateStudent } from './student.repository.js';
import { updateStudentSchema } from './student.schema.js';

export function getStudents(_req: Request, res: Response) {
  const students = getAllActiveStudents();

  return sendSuccess(res, {
    statusCode: 200,
    code: 'STUDENTS_FETCHED',
    message: 'Berhasil mengambil daftar mahasiswa',
    data: { students },
  });
}

export function patchStudent(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = updateStudentSchema.parse(req.body);

  if (!id) {
    throw new AppError(400, 'BAD_REQUEST', 'ID mahasiswa diperlukan');
  }

  const updated = updateStudent(id, body.nama_lengkap, body.nim_nip);

  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'Mahasiswa tidak ditemukan atau sudah tidak aktif');
  }

  return sendSuccess(res, {
    statusCode: 200,
    code: 'STUDENT_UPDATED',
    message: 'Data mahasiswa berhasil diperbarui',
    data: { id, ...body },
  });
}

export function deleteStudent(req: Request, res: Response) {
  const id = req.params.id as string;

  if (!id) {
    throw new AppError(400, 'BAD_REQUEST', 'ID mahasiswa diperlukan');
  }

  const deleted = softDeleteStudent(id);

  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'Mahasiswa tidak ditemukan atau sudah tidak aktif');
  }

  return sendSuccess(res, {
    statusCode: 200,
    code: 'STUDENT_DELETED',
    message: 'Mahasiswa berhasil dihapus secara soft-delete',
    data: { id },
  });
}

export function resetStudentFace(req: Request, res: Response) {
  const id = req.params.id as string;

  if (!id) {
    throw new AppError(400, 'BAD_REQUEST', 'ID mahasiswa diperlukan');
  }

  // Hapus vektor wajah (tidak throw error jika kosong, karena tujuannya memang mengosongkan)
  deleteFaceVector(id);

  return sendSuccess(res, {
    statusCode: 200,
    code: 'STUDENT_FACE_RESET',
    message: 'Data vektor wajah mahasiswa berhasil dihapus untuk Re-Enrollment',
    data: { id },
  });
}
