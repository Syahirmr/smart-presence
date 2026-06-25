import { useState } from 'react';
import type { FormEvent } from 'react';
import { LogIn, ShieldCheck, AlertCircle, RefreshCw, KeyRound, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../stores/useAdminAuth';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

type AdminLoginResponse = {
  success: boolean;
  code?: string;
  message?: string;
  data?: {
    token: string;
    token_type?: string;
    must_change_password?: boolean;
    admin: {
      id?: number;
      username: string;
    };
  };
};

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAdminAuth((state) => state.setAuth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const redirectTo = (location.state as { from?: string } | null)?.from || '/admin/records';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setStatus('error');
      setErrorMessage('Username dan password admin wajib diisi.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as AdminLoginResponse | null;

      if (!response.ok) {
        setStatus('error');
        setErrorMessage(payload?.message || 'Login admin gagal.');
        return;
      }

      const token = payload?.data?.token;
      const adminName = payload?.data?.admin?.username;

      if (!token || !adminName) {
        setStatus('error');
        setErrorMessage('Respons login admin tidak lengkap.');
        return;
      }

      setAuth(token, adminName);

      if (payload?.data?.must_change_password) {
        navigate('/admin/records', { replace: true });
        return;
      }

      navigate(redirectTo, { replace: true });
    } catch {
      setStatus('error');
      setErrorMessage('Server tidak merespons. Pastikan backend sedang berjalan.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-md relative flex items-center min-h-[70vh]">
      {/* Background glowing blur effects */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[100px]" />
      <div className="pointer-events-none absolute right-0 top-0 -z-10 h-48 w-48 rounded-full bg-indigo-600/10 blur-[80px]" />

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card w-full shadow-2xl overflow-hidden border border-white/10"
      >
        <div className="p-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 p-4 text-blue-400 ring-1 ring-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)] mb-5"
            >
              <ShieldCheck size={32} />
            </motion.div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Portal Admin</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Otentikasi diperlukan untuk mengakses manajemen riwayat absensi.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 group">
              <label htmlFor="admin-username" className="text-xs font-bold uppercase tracking-wider text-slate-400 group-focus-within:text-blue-400 transition-colors">
                Username / NIP
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <User size={18} />
                </div>
                <input
                  id="admin-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Masukkan kredensial"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/50 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 shadow-inner focus:border-blue-500/50 focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <label htmlFor="admin-password" className="text-xs font-bold uppercase tracking-wider text-slate-400 group-focus-within:text-blue-400 transition-colors">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <KeyRound size={18} />
                </div>
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/50 py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 shadow-inner focus:border-blue-500/50 focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="relative mt-2 w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-2">
                {status === 'submitting' ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Masuk ke Sistem
                  </>
                )}
              </div>
            </button>

            <AnimatePresence>
              {status === 'error' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={20} className="shrink-0 text-red-400" />
                      <div>
                        <p className="font-semibold text-red-400">Otentikasi Gagal</p>
                        <p className="mt-0.5 text-xs text-red-300/80 leading-relaxed">{errorMessage}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </motion.div>
    </div>
  );
}