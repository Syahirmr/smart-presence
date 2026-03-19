import { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, RefreshCw, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const ADMIN_TOKEN_STORAGE_KEY = 'admin_token';

type AttendanceRecord = {
  id: string;
  timestamp: string;
  date: string;
  name: string;
  nim_nip: string;
  status: 'HADIR' | 'DUPLICATE' | 'UNKNOWN' | string;
  score: number;
};

type AdminAttendanceApiItem = {
  id: string | number;
  waktu_hadir?: string;
  timestamp?: string;
  date?: string;
  status?: string;
  confidence_score?: number;
  score?: number;
  user?: {
    nama_lengkap?: string;
    nim_nip?: string;
  };
  name?: string;
  nim_nip?: string;
};

type AdminAttendanceResponse = {
  success: boolean;
  message: string;
  data?: AdminAttendanceApiItem[] | { results?: AdminAttendanceApiItem[] };
};

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (date: string) => {
  if (!date || date === '-') return '-';

  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getAdminToken = () => {
  const token = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);

  if (!token) {
    throw new Error('SESSION_NOT_FOUND');
  }

  return token;
};

const normalizeAttendanceRecord = (item: AdminAttendanceApiItem): AttendanceRecord => {
  const timestamp = item.waktu_hadir || item.timestamp || '';
  const derivedDate = timestamp ? timestamp.split('T')[0] : '-';

  return {
    id: String(item.id),
    timestamp,
    date: item.date || derivedDate,
    name: item.user?.nama_lengkap || item.name || 'Unknown',
    nim_nip: item.user?.nim_nip || item.nim_nip || '-',
    status: item.status || 'UNKNOWN',
    score: item.confidence_score || item.score || 0,
  };
};

export default function Records() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchRecords = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const token = getAdminToken();

      const params = new URLSearchParams();

      if (filterDate) {
        params.set('date', filterDate);
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/attendance${params.toString() ? `?${params.toString()}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP_ERROR:${response.status}`);
      }

      const payload = (await response.json()) as AdminAttendanceResponse;

      const rawItems = Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.data?.results)
          ? payload.data.results
          : [];

      const normalized = rawItems
        .map(normalizeAttendanceRecord)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setRecords(normalized);
    } catch (error) {
      if (error instanceof Error && error.message === 'SESSION_NOT_FOUND') {
        setErrorMessage('Sesi admin tidak ditemukan. Silakan login ulang.');
      } else if (error instanceof Error && error.message.startsWith('HTTP_ERROR:401')) {
        setErrorMessage('Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.');
      } else {
        setErrorMessage('Gagal mengambil data absensi dari server.');
      }

      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchRecords();
  }, [filterDate]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        record.name.toLowerCase().includes(normalizedSearch) ||
        record.nim_nip.toLowerCase().includes(normalizedSearch) ||
        record.id.toLowerCase().includes(normalizedSearch);

      return matchesSearch;
    });
  }, [records, searchTerm]);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const token = getAdminToken();
      const params = new URLSearchParams();

      if (filterDate) {
        params.set('date', filterDate);
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/attendance/export${params.toString() ? `?${params.toString()}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP_ERROR:${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `attendance_report_${filterDate || new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      if (error instanceof Error && error.message === 'SESSION_NOT_FOUND') {
        window.alert('Sesi admin tidak ditemukan. Silakan login ulang.');
      } else {
        window.alert('Gagal mengekspor CSV dari server.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterDate('');
  };

  return (
    <div className="page-shell">
      <header className="page-header md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <h1 className="page-title gradient-text">Riwayat Absensi</h1>
          <p className="page-subtitle">
            Kelola catatan absensi dari server, cari data berdasarkan nama atau ID, lalu ekspor laporan CSV saat dibutuhkan.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => void fetchRecords()}
            className="btn-secondary w-full sm:w-auto"
            disabled={isLoading}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => void handleExport()}
            className="btn-primary w-full sm:w-auto"
            disabled={!records.length || isExporting}
          >
            <Download size={18} />
            {isExporting ? 'Mengekspor...' : 'Ekspor CSV'}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <div className="glass-card panel-padding space-y-5">
            <h2 className="section-title">Filter Data</h2>

            <div className="space-y-2">
              <label
                htmlFor="search-records"
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
              >
                <Search size={14} /> Cari
              </label>
              <input
                id="search-records"
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari nama, NIM/NIP, atau ID"
                className="input-base"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="filter-date"
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
              >
                <Calendar size={14} /> Tanggal
              </label>
              <input
                id="filter-date"
                type="date"
                value={filterDate}
                onChange={(event) => setFilterDate(event.target.value)}
                className="input-base [color-scheme:dark]"
              />
            </div>

            <button
              onClick={handleResetFilters}
              className="btn-secondary w-full"
              disabled={!searchTerm && !filterDate}
            >
              Reset Filter
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="glass-card panel-padding">
              <p className="text-sm text-slate-400">Total Data Server</p>
              <p className="mt-2 text-2xl font-bold text-slate-100">{records.length}</p>
            </div>
            <div className="glass-card panel-padding">
              <p className="text-sm text-slate-400">Data Ditampilkan</p>
              <p className="mt-2 text-2xl font-bold text-blue-300">{filteredRecords.length}</p>
            </div>
          </div>
        </aside>

        <section className="glass-card overflow-hidden">
          {errorMessage ? (
            <div className="panel-padding">
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
                <p className="text-lg font-semibold text-red-300">Gagal Memuat Data</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{errorMessage}</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="panel-padding">
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-8 text-center">
                <p className="text-lg font-semibold text-blue-300">Menyinkronkan dengan server...</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Mohon tunggu, data absensi sedang diambil dari backend.
                </p>
              </div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="panel-padding">
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-8 text-center">
                <p className="text-lg font-semibold text-slate-200">Belum ada data yang cocok</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Coba ubah kata kunci pencarian atau pilih tanggal lain untuk melihat catatan absensi.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 p-4 md:hidden">
                <AnimatePresence>
                  {filteredRecords.map((record, index) => (
                    <motion.article
                      key={`${record.timestamp}-${record.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: Math.min(index * 0.03, 0.2) }}
                      className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-100">{record.name}</p>
                          <p className="mt-1 text-sm text-slate-400">{record.nim_nip}</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            record.status === 'HADIR'
                              ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                              : record.status === 'DUPLICATE'
                                ? 'border border-amber-500/20 bg-amber-500/10 text-amber-300'
                                : 'border border-red-500/20 bg-red-500/10 text-red-300'
                          }`}
                        >
                          {record.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-400">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tanggal</p>
                          <p className="mt-1 text-slate-200">{formatDate(record.date)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Waktu</p>
                          <p className="mt-1 text-slate-200">{formatTime(record.timestamp)}</p>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[820px] text-left">
                  <thead className="bg-white/5 text-xs uppercase tracking-[0.24em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Pengguna</th>
                      <th className="px-6 py-4 font-semibold">NIM / NIP</th>
                      <th className="px-6 py-4 font-semibold">Tanggal</th>
                      <th className="px-6 py-4 font-semibold">Waktu</th>
                      <th className="px-6 py-4 font-semibold">Skor</th>
                      <th className="px-6 py-4 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <AnimatePresence mode="popLayout">
                      {filteredRecords.map((record, index) => (
                        <motion.tr
                          key={`${record.timestamp}-${record.id}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ delay: Math.min(index * 0.02, 0.12) }}
                          className="hover:bg-white/[0.02]"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-sm font-bold text-blue-300">
                                {record.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-slate-100">{record.name}</p>
                                <p className="text-sm text-slate-500">ID: {record.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-slate-400">{record.nim_nip}</td>
                          <td className="px-6 py-4 text-sm text-slate-400">{formatDate(record.date)}</td>
                          <td className="px-6 py-4 text-sm text-slate-200">{formatTime(record.timestamp)}</td>
                          <td className="px-6 py-4 text-sm text-slate-400">
                            {(record.score * 100).toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                record.status === 'HADIR'
                                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                                  : record.status === 'DUPLICATE'
                                    ? 'border border-amber-500/20 bg-amber-500/10 text-amber-300'
                                    : 'border border-red-500/20 bg-red-500/10 text-red-300'
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </section>
    </div>
  );
}