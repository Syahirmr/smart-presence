import type { Request, Response } from 'express';
import { adminAttendanceExportQuerySchema } from './admin-attendance-export.schema.js';
import { exportAdminAttendanceExcel } from './admin-attendance-export.service.js';
import { logger } from '../../lib/logger.js';

export async function exportAdminAttendanceCsvController(req: Request, res: Response) {
  try {
    const query = adminAttendanceExportQuerySchema.parse(req.query);

    const result = await exportAdminAttendanceExcel(query);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);

    return res.status(200).send(result.buffer);
  } catch (error) {
    logger.error({ err: error }, 'Failed to export attendance Excel');
    return res.status(500).json({
      success: false,
      code: 'EXCEL_EXPORT_FAILED',
      message: 'Gagal mengekspor data ke Excel',
    });
  }
}