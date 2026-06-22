import type { Socket } from 'socket.io';
import { AppError } from '../lib/app-error.js';
import { processAttendance } from '../modules/attendance/attendance.service.js';
import { attendanceBodySchema } from '../modules/attendance/attendance.schema.js';

export function registerAttendanceHandlers(socket: Socket) {
  socket.on('process_attendance', (inputData: unknown) => {
    try {
      // 1. Validasi Input Payload (menggunakan schema yang sama dengan HTTP API)
      const parsedData = attendanceBodySchema.parse(inputData);

      // 2. Panggil AI Logic
      const results = processAttendance(parsedData);
      
      // 3. Jika sukses, balikin hasil
      socket.emit('attendance_success', { results });
      
    } catch (err) {
      const error = err as any;
      if (error instanceof AppError) {
        // Error custom (seperti NO_ACTIVE_SESSION)
        socket.emit('attendance_error', { 
          code: error.code, 
          message: error.message 
        });
      } else if (error instanceof Error && error.name === 'ZodError') {
         socket.emit('attendance_error', { 
          code: 'VALIDATION_ERROR', 
          message: 'Format data wajah tidak valid' 
        });
      } else {
        // Tangkap error tak terduga lainnya
        socket.emit('attendance_error', { 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Terjadi kesalahan pada server saat memproses absensi via WebSocket' 
        });
        console.error('[Socket Error]', error);
      }
    }
  });
}
