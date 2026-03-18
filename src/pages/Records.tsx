import { useState, useEffect } from 'react';
import { Download, Trash2, Search, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Sesuaikan interface dengan balasan dari Backend SQLite kita
interface AttendanceRecord {
    id: string;
    timestamp: string; // Aslinya waktu_hadir
    date: string;      // Untuk filter tanggal
    name: string;      // Aslinya user.nama_lengkap
    nim_nip: string;   // Aslinya user.nim_nip
    status: string;    // HADIR / DUPLICATE
    score: number;
}

const Records = () => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Saat komponen dimuat, ambil data dari Backend
    useEffect(() => {
        fetchRecordsFromBackend();
    }, []);

    const fetchRecordsFromBackend = async () => {
        setIsLoading(true);
        try {
            // Tembak ke API admin (Asumsi route: /api/admin/attendance)
            // Kalau misal error 404 nanti, berarti URL backendnya perlu kita sesuaikan dikit
            const response = await fetch('http://localhost:3001/api/admin/attendance');
            const rawResult = await response.json();
            
            // Bongkar paket data backend
            let dataArray = [];
            if (Array.isArray(rawResult)) dataArray = rawResult;
            else if (rawResult?.data) dataArray = Array.isArray(rawResult.data) ? rawResult.data : rawResult.data.results || [];
            
            // Format data biar cocok sama tabel UI-mu yang keren ini
            const formattedRecords: AttendanceRecord[] = dataArray.map((log: any) => {
                const dateObj = new Date(log.waktu_hadir);
                return {
                    id: log.id,
                    timestamp: log.waktu_hadir,
                    date: dateObj.toISOString().split('T')[0], // Format YYYY-MM-DD buat filter
                    name: log.user?.nama_lengkap || 'Unknown',
                    nim_nip: log.user?.nim_nip || '-',
                    status: log.status,
                    score: log.confidence_score
                };
            });

            // Urutkan dari yang terbaru
            setRecords(formattedRecords.reverse());
        } catch (error) {
            console.error("Gagal mengambil data dari database:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearData = () => {
        if (window.confirm('Hapus dari tampilan? (Catatan asli tetap aman di database SQLite)')) {
            setRecords([]);
        }
    };

    const handleExport = () => {
        if (records.length === 0) return alert("Tidak ada data untuk diekspor.");
        const headers = ['NIM/NIP', 'Nama', 'Tanggal', 'Waktu', 'Status', 'Skor AI'];
        const csvData = records.map(r => [
            r.nim_nip, r.name, r.date, 
            new Date(r.timestamp).toLocaleTimeString(), 
            r.status, r.score
        ].join(','));
        const blob = new Blob([headers.join(',') + '\n' + csvData.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const filteredRecords = records.filter(record => {
        const matchesSearch = record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.nim_nip.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = filterDate ? record.date === filterDate : true;
        return matchesSearch && matchesDate;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold gradient-text">Riwayat Absensi</h1>
                    <p className="text-slate-400">Kelola dan lihat semua catatan absensi yang tersimpan di Database AI.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchRecordsFromBackend}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all border border-slate-700"
                    >
                        🔄 Refresh
                    </button>
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
                        Bersihkan
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
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-white"
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
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all [color-scheme:dark] text-white"
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
                                        <th className="px-6 py-4 font-semibold">ID / NIM</th>
                                        <th className="px-6 py-4 font-semibold">Tanggal</th>
                                        <th className="px-6 py-4 font-semibold">Waktu</th>
                                        <th className="px-6 py-4 font-semibold text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    <AnimatePresence mode="popLayout">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-blue-400 animate-pulse font-semibold">
                                                    ⏳ Menyinkronkan dengan Database Server...
                                                </td>
                                            </tr>
                                        ) : filteredRecords.map((record, i) => (
                                            <motion.tr
                                                key={`${record.id}-${i}`}
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
                                                <td className="px-6 py-4 text-slate-400 text-sm font-mono">{record.nim_nip}</td>
                                                <td className="px-6 py-4 text-slate-400 text-sm">{record.date}</td>
                                                <td className="px-6 py-4 text-slate-200 text-sm font-mono">
                                                    {new Date(record.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second:'2-digit' })}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md border ${
                                                        record.status === 'HADIR' 
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    }`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                    {!isLoading && filteredRecords.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                                Belum ada data absensi di Database.
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