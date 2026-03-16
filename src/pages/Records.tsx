import { useState, useEffect } from 'react';
import { Download, Trash2, Search, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAttendance, clearAllData, exportToCSV, type AttendanceRecord } from '../utils/storage';

const Records = () => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        setRecords(getAttendance().reverse());
    }, []);

    const handleClearData = () => {
        if (window.confirm('Apakah Anda yakin ingin menghapus semua data absensi dan pendaftaran? Tindakan ini tidak dapat dibatalkan.')) {
            clearAllData();
            setRecords([]);
        }
    };

    const handleExport = () => {
        exportToCSV(records, `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const filteredRecords = records.filter(record => {
        const matchesSearch = record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = filterDate ? record.date === filterDate : true;
        return matchesSearch && matchesDate;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold gradient-text">Riwayat Absensi</h1>
                    <p className="text-slate-400">Kelola dan lihat semua catatan absensi yang tersimpan secara lokal.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                    >
                        <Download size={18} />
                        Ekspor CSV
                    </button>
                    <button
                        onClick={handleClearData}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all border border-red-500/20"
                    >
                        <Trash2 size={18} />
                        Hapus Semua
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 space-y-6">
                    <div className="glass-card p-6 space-y-6">
                        <h3 className="font-semibold text-slate-200">Filter</h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 uppercase flex items-center gap-2">
                                    <Search size={14} /> Cari
                                </label>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Nama atau ID"
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 uppercase flex items-center gap-2">
                                    <Calendar size={14} /> Tanggal
                                </label>
                                <input
                                    type="date"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all [color-scheme:dark]"
                                />
                            </div>

                            {records.length > 0 && (
                                <div className="pt-4 border-t border-white/5 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Total Catatan</span>
                                        <span className="font-bold text-blue-400">{records.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Ditampilkan</span>
                                        <span className="font-bold text-slate-200">{filteredRecords.length}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="md:col-span-3">
                    <div className="glass-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Pengguna</th>
                                        <th className="px-6 py-4 font-semibold">ID</th>
                                        <th className="px-6 py-4 font-semibold">Tanggal</th>
                                        <th className="px-6 py-4 font-semibold">Waktu</th>
                                        <th className="px-6 py-4 font-semibold text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    <AnimatePresence mode="popLayout">
                                        {filteredRecords.map((record, i) => (
                                            <motion.tr
                                                key={record.timestamp}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                                                className="hover:bg-white/[0.02] transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs">
                                                            {record.name.charAt(0)}
                                                        </div>
                                                        <span className="font-medium text-slate-200">{record.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-sm">{record.id}</td>
                                                <td className="px-6 py-4 text-slate-400 text-sm">{record.date}</td>
                                                <td className="px-6 py-4 text-slate-200 text-sm">
                                                    {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase rounded-md border border-emerald-500/20">
                                                        Hadir
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                    {filteredRecords.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                                Tidak ada data yang sesuai dengan kriteria pencarian.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Records;