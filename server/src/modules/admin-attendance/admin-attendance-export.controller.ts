import type { Request, Response } from 'express';
import { adminAttendanceExportQuerySchema } from './admin-attendance-export.schema.js';
import { exportAdminAttendanceCsv } from './admin-attendance-export.service.js';

export function exportAdminAttendanceCsvController(req: Request, res: Response) {
  const query = adminAttendanceExportQuerySchema.parse(req.query);

  const result = exportAdminAttendanceCsv(query);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

  return res.status(200).send(result.csv);
}