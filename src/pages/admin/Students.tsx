import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Plus, Edit2, Trash2, Camera, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudentStore, type Student } from '../../stores/useStudentStore';

export default function Students() {
  const navigate = useNavigate();
  const students = useStudentStore((state) => state.students);
  const deleteStudent = useStudentStore((state) => state.deleteStudent);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const handleDelete = () => {
    if (studentToDelete) {
      deleteStudent(studentToDelete.id);
      setStudentToDelete(null);
    }
  };

  return (
    <div className="page-shell relative">
      <header className="page-header md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
            <ShieldCheck size={14} />
            Admin Area
          </div>
          <h1 className="page-title gradient-text">Master Data Mahasiswa</h1>
          <p className="page-subtitle">Kelola data mahasiswa dan status pendaftaran wajah (Face Enrollment).</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="btn-primary w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500">
            <Plus size={18} /> Tambah Mahasiswa
          </button>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="flex space-x-1 mb-6 rounded-xl bg-slate-900/50 p-1 border border-white/5 max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button 
          onClick={() => navigate('/admin/records')}
          className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
        >
          Riwayat Absensi
        </button>
        <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-500/20 text-blue-400 shadow-sm transition-all">
          Data Mahasiswa
        </button>
      </div>

      <div className="glass-card panel-padding overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-4 font-semibold">Nama Mahasiswa</th>
                <th className="px-4 py-4 font-semibold">NIM</th>
                <th className="px-4 py-4 font-semibold">Program Studi</th>
                <th className="px-4 py-4 font-semibold">Status Wajah</th>
                <th className="px-4 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {students.map((student) => (
                <tr key={student.id} className="transition-colors hover:bg-white/5">
                  <td className="px-4 py-4 font-medium text-slate-200">{student.nama_lengkap}</td>
                  <td className="px-4 py-4 font-mono text-xs">{student.nim_nip}</td>
                  <td className="px-4 py-4">{student.jurusan}</td>
                  <td className="px-4 py-4">
                    {student.face_enrolled ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                        <ShieldCheck size={14} /> Terdaftar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                        <ShieldAlert size={14} /> Belum Ada
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="rounded-lg p-2 text-slate-400 hover:bg-blue-500/10 hover:text-blue-400 transition-colors" title="Edit Data">
                        <Edit2 size={16} />
                      </button>
                      <button className="rounded-lg p-2 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors" title="Re-Enroll Wajah">
                        <Camera size={16} />
                      </button>
                      <button 
                        onClick={() => setStudentToDelete(student)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Hapus Data"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Belum ada data mahasiswa.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {studentToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setStudentToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card relative z-10 w-full max-w-sm overflow-hidden shadow-2xl border border-red-500/20"
            >
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500 ring-1 ring-red-500/30">
                  <Trash2 size={28} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-100">Hapus Mahasiswa?</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Anda yakin ingin menghapus data <span className="font-semibold text-slate-200">{studentToDelete.nama_lengkap}</span>? Aksi ini tidak dapat dibatalkan.
                </p>
                <div className="mt-6 flex gap-3">
                  <button 
                    onClick={() => setStudentToDelete(null)}
                    className="btn-secondary flex-1 border-white/10"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="btn-primary flex-1 bg-red-600 hover:bg-red-500"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
