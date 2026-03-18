import { useMemo, useState } from 'react';
import { Calendar, Download, Search, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { clearAllData, exportToCSV, getAttendance, type AttendanceRecord } from '../utils/storage';

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Records = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    // Lazy initializer menghindari setState di useEffect dan tetap aman untuk data lokal.
    return [...getAttendance()].reverse();
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        record.name.toLowerCase().includes(normalizedSearch) || record.id.toLowerCase().includes(normalizedSearch);
      const matchesDate = filterDate ? record.date === filterDate : true;

      return matchesSearch && matchesDate;
    });
  }, [records, searchTerm, filterDate]);

  const handleClearData = () => {
    const confirmed = window.confirm(
      'Apakah Anda yakin ingin menghapus semua data absensi dan pendaftaran? Tindakan ini tidak dapat dibatalkan.',
    );

    if (!confirmed) return;

    clearAllData();
    setRecords([]);
  };

  const handleExport = () => {
    exportToCSV(records, `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="page-shell">
      <header className="page-header md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <h1 className="page-title gradient-text">Riwayat Absensi</h1>
          <p className="page-subtitle">
            Kelola catatan absensi, cari data berdasarkan nama atau ID, lalu ekspor laporan saat dibutuhkan.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={handleExport} className="btn-primary w-full sm:w-auto" disabled={!records.length}>
            <Download size={18} />
            Ekspor CSV
          </button>
          <button onClick={handleClearData} className="btn-danger w-full sm:w-auto" disabled={!records.length}>
            <Trash2 size={18} />
            Hapus Semua
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <div className="glass-card panel-padding space-y-5">
            <h2 className="section-title">Filter Data</h2>

            <div className="space-y-2">
              <label htmlFor="search-records" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                <Search size={14} /> Cari
              </label>
              <input
                id="search-records"
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari nama atau ID"
                className="input-base"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="filter-date" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="glass-card panel-padding">
              <p className="text-sm text-slate-400">Total Data</p>
              <p className="mt-2 text-2xl font-bold text-slate-100">{records.length}</p>
            </div>
            <div className="glass-card panel-padding">
              <p className="text-sm text-slate-400">Data Ditampilkan</p>
              <p className="mt-2 text-2xl font-bold text-blue-300">{filteredRecords.length}</p>
            </div>
          </div>
        </aside>

        <section className="glass-card overflow-hidden">
          {filteredRecords.length === 0 ? (
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
                          <p className="mt-1 text-sm text-slate-400">ID: {record.id}</p>
                        </div>
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                          Hadir
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-400">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tanggal</p>
                          <p className="mt-1 text-slate-200">{record.date}</p>
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
                <table className="w-full min-w-[720px] text-left">
                  <thead className="bg-white/5 text-xs uppercase tracking-[0.24em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Pengguna</th>
                      <th className="px-6 py-4 font-semibold">ID</th>
                      <th className="px-6 py-4 font-semibold">Tanggal</th>
                      <th className="px-6 py-4 font-semibold">Waktu</th>
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
                                <p className="text-sm text-slate-500">Tercatat lokal</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400">{record.id}</td>
                          <td className="px-6 py-4 text-sm text-slate-400">{record.date}</td>
                          <td className="px-6 py-4 text-sm text-slate-200">{formatTime(record.timestamp)}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                              Hadir
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
};

export default Records;
