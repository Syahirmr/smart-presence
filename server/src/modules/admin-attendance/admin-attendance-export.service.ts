import ExcelJS from 'exceljs';
import {
  getAttendanceLogsForExportByDate,
  getAttendanceLogsForExportByRange,
} from './admin-attendance.repository.js';
import type { AdminAttendanceExportQuery } from './admin-attendance-export.schema.js';

function formatDate(dateStr: string) {
  return dateStr.split('T')[0] || '-';
}

function formatTime(dateStr: string) {
  if (!dateStr.includes('T')) return '-';
  const parts = dateStr.split('T')[1]; // HH:mm:ss.sssZ
  if (!parts) return '-';
  return parts.split('.')[0] || '-'; // HH:mm:ss
}

export async function exportAdminAttendanceExcel(query: AdminAttendanceExportQuery) {
  const rows = query.date
    ? getAttendanceLogsForExportByDate(query.date)
    : getAttendanceLogsForExportByRange(query.start_date!, query.end_date!);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Laporan Presensi');

  // Kolom yang diminta: No, NIM, Nama, Tanggal, Waktu Presensi, Status Hadir, Keterangan
  worksheet.columns = [
    { header: 'No', key: 'no', width: 8 },
    { header: 'NIM', key: 'nim', width: 20 },
    { header: 'Nama', key: 'nama', width: 30 },
    { header: 'Tanggal', key: 'tanggal', width: 15 },
    { header: 'Waktu Presensi', key: 'waktu', width: 18 },
    { header: 'Status Hadir', key: 'status', width: 15 },
    { header: 'Keterangan', key: 'keterangan', width: 35 },
  ];

  // Styling Row Header (Premium Dark Blue)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1E3A8A' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // Isi Data Rows
  rows.forEach((row, index) => {
    worksheet.addRow({
      no: index + 1,
      nim: row.nim_nip,
      nama: row.nama_lengkap,
      tanggal: formatDate(row.waktu_hadir),
      waktu: formatTime(row.waktu_hadir),
      status: row.status,
      keterangan: row.keterangan || '-',
    });
  });

  // Alignment kolom
  worksheet.getColumn('no').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getColumn('nim').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getColumn('tanggal').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getColumn('waktu').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getColumn('status').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getColumn('nama').alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getColumn('keterangan').alignment = { horizontal: 'left', vertical: 'middle' };

  // Menambahkan Border dan Background Selang-Seling (Zebra)
  worksheet.eachRow((row, rowNumber) => {
    row.height = rowNumber === 1 ? 25 : 20;
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'E5E7EB' } },
        left: { style: 'thin', color: { argb: 'E5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
        right: { style: 'thin', color: { argb: 'E5E7EB' } },
      };

      if (rowNumber > 1) {
        cell.font = { name: 'Arial', size: 10 };
        if (rowNumber % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F9FAFB' },
          };
        }
      }
    });
  });

  const rawBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(rawBuffer);

  const filename = query.date
    ? `attendance-${query.date}.xlsx`
    : `attendance-${query.start_date}-to-${query.end_date}.xlsx`;

  return {
    filename,
    buffer,
  };
}