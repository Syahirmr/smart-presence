import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Calendar, Download, LogOut, RefreshCw, Search, ShieldCheck, Plus, Edit2, FileText, Table, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAdminAuth } from '../stores/useAdminAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AttendanceCharts from '../components/AttendanceCharts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

type AttendanceRecord = {
  id: string;
  timestamp: string;
  date: string;
  name: string;
  nim_nip: string;
  status: 'HADIR' | 'DUPLICATE' | 'UNKNOWN' | 'SAKIT' | 'IZIN' | 'ALPHA' | string;
  score: number;
  keterangan?: string;
};

type AdminAttendanceApiItem = {
  id: string | number;
  waktu_hadir?: string;
  timestamp?: string;
  date?: string;
  status?: string;
  confidence_score?: number;
  score?: number;
  keterangan?: string;
  user?: {
    id?: string;
    nama_lengkap?: string;
    nim_nip?: string;
  };
  name?: string;
  nim_nip?: string;
};

type AdminAttendanceResponse = {
  success: boolean;
  code?: string;
  message: string;
  data?: {
    logs?: AdminAttendanceApiItem[];
  } | null;
};

const formatTime = (timestamp: string) => {
  if (!timestamp) return '-';

  return new Date(timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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

const getLocalISODate = (d = new Date()) => {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const getStatusBadgeClass = (status: string) => {
  if (status === 'HADIR') {
    return 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  }

  if (status === 'DUPLICATE') {
    return 'border border-amber-500/20 bg-amber-500/10 text-amber-300';
  }

  if (status === 'SAKIT') {
    return 'border border-blue-500/20 bg-blue-500/10 text-blue-300';
  }

  if (status === 'IZIN') {
    return 'border border-purple-500/20 bg-purple-500/10 text-purple-300';
  }

  if (status === 'ALPHA') {
    return 'border border-red-500/20 bg-red-500/10 text-red-300';
  }

  return 'border border-red-500/20 bg-red-500/10 text-red-300';
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
    score: item.confidence_score ?? item.score ?? 0,
    keterangan: item.keterangan || '',
  };
};

export default function Records() {
  const navigate = useNavigate();
  const token = useAdminAuth((state) => state.token);
  const adminName = useAdminAuth((state) => state.adminName);
  const logout = useAdminAuth((state) => state.logout);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [toasts, setToasts] = useState<{
    id: string;
    name: string;
    nim: string;
    kioskId: string;
    time: string;
  }[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // Manual Override Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [overrideNim, setOverrideNim] = useState('');
  const [overrideDate, setOverrideDate] = useState(getLocalISODate());
  const [overrideStatus, setOverrideStatus] = useState('HADIR');
  const [overrideKeterangan, setOverrideKeterangan] = useState('');
  const [modalError, setModalError] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  const showToast = useCallback((msg: {
    name: string;
    nim: string;
    kioskId: string;
    time: string;
  }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...msg, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const handleUnauthorized = useCallback(() => {
    logout();
    navigate('/admin/login', { replace: true });
  }, [logout, navigate]);

  const fetchRecords = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      setRecords([]);
      setErrorMessage('Sesi admin tidak ditemukan. Silakan login ulang.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const params = new URLSearchParams();

      if (filterStartDate && filterEndDate) {
        params.set('start_date', filterStartDate);
        params.set('end_date', filterEndDate);
      } else if (filterStartDate) {
        params.set('date', filterStartDate);
      } else if (filterEndDate) {
        params.set('date', filterEndDate);
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/attendance${params.toString() ? `?${params.toString()}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const payload = (await response.json().catch(() => null)) as AdminAttendanceResponse | null;

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.message || 'Gagal mengambil data absensi dari server.');
      }

      const rawItems = Array.isArray(payload?.data?.logs) ? payload.data.logs : [];

      const normalized = rawItems
        .map(normalizeAttendanceRecord)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setRecords(normalized);
    } catch (error) {
      setRecords([]);
      setErrorMessage(
        error instanceof Error ? error.message : 'Gagal mengambil data absensi dari server.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [filterStartDate, filterEndDate, handleUnauthorized, token]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // WebSocket Live Real-Time Updates
  useEffect(() => {
    if (!token) return;

    const socketUrl = API_BASE_URL.replace('/api', '');
    const socket = io(socketUrl, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('new_attendance', (data: {
      kiosk_id: string;
      waktu_hadir: string;
      confidence_score: number;
      status?: string;
      keterangan?: string;
      user: { id: string; nim_nip: string; nama_lengkap: string };
    }) => {
      const mappedItem = normalizeAttendanceRecord({
        id: data.user.id,
        waktu_hadir: data.waktu_hadir,
        confidence_score: data.confidence_score,
        status: data.status || 'HADIR',
        keterangan: data.keterangan || '',
        user: data.user,
      });

      setRecords((prev) => {
        // Cek jika log di hari yang sama untuk NIM tersebut sudah ada
        const existingIndex = prev.findIndex(
          (r) => r.nim_nip === mappedItem.nim_nip && r.date === mappedItem.date
        );

        let newRecords = [...prev];

        // Terapkan filter tanggal jika sedang aktif
        if (filterStartDate && filterEndDate) {
          const recordDate = mappedItem.timestamp.split('T')[0];
          if (recordDate < filterStartDate || recordDate > filterEndDate) {
            if (existingIndex !== -1) {
              newRecords.splice(existingIndex, 1);
            }
            return newRecords;
          }
        } else if (filterStartDate) {
          const recordDate = mappedItem.timestamp.split('T')[0];
          if (recordDate !== filterStartDate) {
            if (existingIndex !== -1) {
              newRecords.splice(existingIndex, 1);
            }
            return newRecords;
          }
        }

        if (existingIndex !== -1) {
          newRecords[existingIndex] = mappedItem;
        } else {
          newRecords.unshift(mappedItem);
        }

        // Tampilkan Toast
        showToast({
          name: mappedItem.name,
          nim: mappedItem.nim_nip,
          kioskId: data.kiosk_id,
          time: new Date(mappedItem.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        });

        // Trigger row glow
        setRecentIds((ids) => [...ids, mappedItem.id]);
        setTimeout(() => {
          setRecentIds((ids) => ids.filter((id) => id !== mappedItem.id));
        }, 3000);

        return newRecords;
      });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    return () => {
      socket.disconnect();
    };
  }, [token, filterStartDate, filterEndDate, showToast]);

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
    if (!token) {
      handleUnauthorized();
      return;
    }

    setIsExporting(true);

    try {
      const params = new URLSearchParams();

      if (filterStartDate && filterEndDate) {
        params.set('start_date', filterStartDate);
        params.set('end_date', filterEndDate);
      } else if (filterStartDate) {
        params.set('date', filterStartDate);
      } else if (filterEndDate) {
        params.set('date', filterEndDate);
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/attendance/export${params.toString() ? `?${params.toString()}` : ''}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error('Gagal mengekspor Excel dari server.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `attendance_report_${filterStartDate || getLocalISODate()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : 'Gagal mengekspor Excel dari server.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  
  const handleExportPDF = () => {
    if (filteredRecords.length === 0) {
      window.alert('Tidak ada data untuk diekspor');
      return;
    }
    
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text('Laporan Presensi Mahasiswa', 14, 20);
      
      doc.setFontSize(10);
      doc.text(`Tanggal: ${filterStartDate || 'Semua'} s/d ${filterEndDate || 'Semua'}`, 14, 28);
      doc.text(`Total Data: ${filteredRecords.length}`, 14, 34);

      const tableColumn = ["Nama", "NIM/NIP", "Tanggal", "Waktu", "Status", "Keterangan"];
      const tableRows: string[][] = [];

      filteredRecords.forEach(record => {
        const recordData = [
          record.name,
          record.nim_nip,
          formatDate(record.date),
          formatTime(record.timestamp),
          record.status,
          record.keterangan || '-'
        ];
        tableRows.push(recordData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`attendance_report_${filterStartDate || getLocalISODate()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      window.alert('Gagal membuat PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  // Override Modal Actions
  const handleOpenOverrideModal = (record?: AttendanceRecord) => {
    if (record) {
      setModalMode('edit');
      setOverrideNim(record.nim_nip);
      setOverrideDate(record.date || getLocalISODate());
      setOverrideStatus(record.status === 'UNKNOWN' ? 'HADIR' : record.status);
      setOverrideKeterangan(record.keterangan || '');
    } else {
      setModalMode('create');
      setOverrideNim('');
      setOverrideDate(getLocalISODate());
      setOverrideStatus('HADIR');
      setOverrideKeterangan('');
    }
    setModalError('');
    setIsModalOpen(true);
  };

  const handleCloseOverrideModal = () => {
    setIsModalOpen(false);
    setModalError('');
  };

  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!overrideNim.trim()) {
      setModalError('NIM/NIP wajib diisi');
      return;
    }
    if (!overrideKeterangan.trim()) {
      setModalError('Keterangan / Catatan wajib diisi');
      return;
    }

    setIsSubmittingOverride(true);
    setModalError('');

    try {
      const response = await fetch(`${API_BASE_URL}/admin/attendance/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nim_nip: overrideNim.trim(),
          tanggal: overrideDate,
          status: overrideStatus,
          keterangan: overrideKeterangan.trim(),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.message || 'Gagal menyimpan data override.');
      }

      setIsModalOpen(false);
      void fetchRecords();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Gagal memproses override presensi.');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  return (
    <div className="page-shell">
      <header className="page-header md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
            <ShieldCheck size={14} />
            Admin Area
          </div>

          <h1 className="page-title gradient-text">Riwayat Absensi</h1>
          <p className="page-subtitle">
            Kelola catatan absensi dari server, filter berdasarkan rentang tanggal, lakukan override status kehadiran manual, dan ekspor laporan Excel.
          </p>
          {adminName && (
            <p className="text-sm text-slate-400">
              Login sebagai <span className="font-semibold text-slate-200">{adminName}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => handleOpenOverrideModal()}
            className="btn-primary w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
          >
            <Plus size={18} />
            Absen Manual
          </button>

          <button
            onClick={() => void fetchRecords()}
            className="btn-secondary w-full sm:w-auto"
            disabled={isLoading}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="btn-primary w-full sm:w-auto"
              disabled={!records.length || isExporting}
            >
              <Download size={18} />
              {isExporting ? 'Mengekspor...' : 'Ekspor'}
              <ChevronDown size={14} className={`transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {isExportDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-slate-900 shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        void handleExport();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                    >
                      <Table size={16} />
                      Excel (.xlsx)
                    </button>
                    <button
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        handleExportPDF();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      <FileText size={16} />
                      PDF (.pdf)
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={handleLogout} className="btn-secondary w-full sm:w-auto">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="flex space-x-1 mb-6 rounded-xl bg-slate-900/50 p-1 border border-white/5 max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-500/20 text-blue-400 shadow-sm transition-all">
          Riwayat Absensi
        </button>
        <button 
          onClick={() => navigate('/admin/students')}
          className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
        >
          Data Mahasiswa
        </button>
      </div>

      <AttendanceCharts records={records} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_1fr]">
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
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
              >
                <Calendar size={14} /> Tanggal Mulai
              </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(event) => setFilterStartDate(event.target.value)}
                className="input-base [color-scheme:dark]"
              />
            </div>

            <div className="space-y-2">
              <label
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
              >
                <Calendar size={14} /> Tanggal Selesai
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(event) => setFilterEndDate(event.target.value)}
                className="input-base [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => {
                  const today = getLocalISODate();
                  setFilterStartDate(today);
                  setFilterEndDate(today);
                }}
                className="btn-secondary py-1.5 px-3 text-xs flex-1 bg-slate-900/50 hover:bg-slate-800 border-white/5"
              >
                Hari Ini
              </button>
              <button
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  const dateStr = getLocalISODate(yesterday);
                  setFilterStartDate(dateStr);
                  setFilterEndDate(dateStr);
                }}
                className="btn-secondary py-1.5 px-3 text-xs flex-1 bg-slate-900/50 hover:bg-slate-800 border-white/5"
              >
                Kemarin
              </button>
              <button
                onClick={() => {
                  const today = getLocalISODate();
                  const lastWeek = new Date();
                  lastWeek.setDate(lastWeek.getDate() - 7);
                  setFilterStartDate(getLocalISODate(lastWeek));
                  setFilterEndDate(today);
                }}
                className="btn-secondary py-1.5 px-3 text-xs flex-1 bg-slate-900/50 hover:bg-slate-800 border-white/5"
              >
                7 Hari
              </button>
            </div>

            <button
              onClick={handleResetFilters}
              className="btn-secondary w-full"
              disabled={!searchTerm && !filterStartDate && !filterEndDate}
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
                  Coba ubah kata kunci pencarian atau pilih rentang tanggal lain untuk melihat catatan absensi.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="grid gap-4 p-4 md:hidden">
                <AnimatePresence>
                  {filteredRecords.map((record, index) => (
                    <motion.article
                      key={`${record.timestamp}-${record.id}-${record.nim_nip}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: Math.min(index * 0.03, 0.2) }}
                      className={`rounded-2xl border border-white/10 bg-slate-950/35 p-4 transition-colors duration-1000 ${
                        recentIds.includes(record.id) ? 'bg-emerald-500/10' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-100">{record.name}</p>
                          <p className="mt-1 text-sm text-slate-400">{record.nim_nip}</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusBadgeClass(record.status)}`}
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
                        <div className="col-span-2">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Keterangan</p>
                          <p className="mt-1 text-slate-200">{record.keterangan || '-'}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end gap-2 border-t border-white/5 pt-3">
                        <button
                          onClick={() => handleOpenOverrideModal(record)}
                          className="btn-secondary py-1 px-3 text-xs flex items-center gap-1 border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                        >
                          <Edit2 size={12} /> Override
                        </button>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>

              {/* Desktop View */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[920px] text-left">
                  <thead className="bg-white/5 text-xs uppercase tracking-[0.24em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Pengguna</th>
                      <th className="px-6 py-4 font-semibold">NIM / NIP</th>
                      <th className="px-6 py-4 font-semibold">Tanggal</th>
                      <th className="px-6 py-4 font-semibold">Waktu</th>
                      <th className="px-6 py-4 font-semibold">Skor</th>
                      <th className="px-6 py-4 font-semibold">Keterangan</th>
                      <th className="px-6 py-4 text-right font-semibold">Status</th>
                      <th className="px-6 py-4 text-center font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <AnimatePresence mode="popLayout">
                      {filteredRecords.map((record, index) => (
                        <motion.tr
                          key={`${record.timestamp}-${record.id}-${record.nim_nip}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ delay: Math.min(index * 0.02, 0.12) }}
                          className={`hover:bg-white/[0.02] transition-colors duration-1000 ${
                            recentIds.includes(record.id) ? 'bg-emerald-500/10' : ''
                          }`}
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
                            {record.score === 1 ? 'Manual' : `${(record.score * 100).toFixed(1)}%`}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400 max-w-[150px] truncate" title={record.keterangan}>
                            {record.keterangan || '-'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusBadgeClass(record.status)}`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleOpenOverrideModal(record)}
                              className="text-blue-400 hover:text-blue-300 p-1.5 rounded-full hover:bg-white/5 transition-colors inline-flex"
                              title="Override Status"
                            >
                              <Edit2 size={16} />
                            </button>
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

      {/* Manual Override Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-md overflow-hidden shadow-2xl border border-white/10"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950/45">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="text-blue-400" />
                  {modalMode === 'edit' ? 'Override Status Presensi' : 'Input Absen Manual'}
                </h3>
                <button
                  type="button"
                  onClick={handleCloseOverrideModal}
                  className="text-slate-400 hover:text-slate-200 text-sm font-semibold transition-colors"
                >
                  Batal
                </button>
              </div>

              <form onSubmit={(e) => void handleSubmitOverride(e)} className="p-6 space-y-4">
                {modalError && (
                  <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs leading-relaxed">
                    {modalError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    NIM / NIP Siswa
                  </label>
                  <input
                    type="text"
                    value={overrideNim}
                    onChange={(e) => setOverrideNim(e.target.value)}
                    placeholder="Masukkan NIM/NIP lengkap (contoh: 22123456)"
                    disabled={modalMode === 'edit'}
                    className="input-base disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Tanggal Presensi
                  </label>
                  <input
                    type="date"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    disabled={modalMode === 'edit'}
                    className="input-base [color-scheme:dark] disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Status Presensi
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'HADIR', label: 'Hadir Manual', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
                      { id: 'SAKIT', label: 'Sakit', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
                      { id: 'IZIN', label: 'Izin', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
                      { id: 'ALPHA', label: 'Alpha', color: 'bg-red-500/10 text-red-400 border-red-500/30' }
                    ].map((status) => (
                      <button
                        key={status.id}
                        type="button"
                        onClick={() => setOverrideStatus(status.id)}
                        className={`py-2 px-3 rounded-lg border text-sm font-semibold transition-all flex justify-center items-center ${
                          overrideStatus === status.id 
                            ? `${status.color} ring-1 ring-white/20 shadow-[0_0_10px_rgba(255,255,255,0.05)]` 
                            : 'bg-slate-900/50 text-slate-500 border-white/5 hover:bg-slate-800 hover:text-slate-300'
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Keterangan / Catatan
                  </label>
                  <textarea
                    value={overrideKeterangan}
                    onChange={(e) => setOverrideKeterangan(e.target.value)}
                    placeholder="Contoh: Surat dokter sakit demam, Izin dispensasi..."
                    rows={3}
                    className="input-base resize-none"
                    required
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseOverrideModal}
                    className="btn-secondary w-full"
                    disabled={isSubmittingOverride}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn-primary w-full flex justify-center items-center gap-2"
                    disabled={isSubmittingOverride}
                  >
                    {isSubmittingOverride ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full font-sans">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="glass-card panel-padding border-l-4 border-l-emerald-500 shadow-2xl flex items-center justify-between gap-3 bg-slate-900/95"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Presensi Masuk Real-Time
                </p>
                <p className="mt-1 text-sm font-bold text-slate-100">{toast.name}</p>
                <p className="text-xs text-slate-400">
                  NIM: {toast.nim} | {toast.kioskId}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-mono text-emerald-300">
                {toast.time}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}