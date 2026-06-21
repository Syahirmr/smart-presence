import { useState } from 'react';
import type { FormEvent } from 'react';
import { LogIn, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../stores/useAdminAuth';

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
    <div className="mx-auto w-full max-w-lg">
      <div className="glass-card panel-padding">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-xl bg-blue-500/10 p-3 text-blue-300">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="section-title">Login Admin</h1>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Masuk ke area admin untuk melihat riwayat absensi dan mengelola data.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="admin-username" className="text-sm font-medium text-slate-300">
              Username
            </label>
            <input
              id="admin-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Masukkan username admin"
              className="input-base"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="admin-password" className="text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Masukkan password admin"
              className="input-base"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'submitting' ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Memproses Login...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Masuk Admin
              </>
            )}
          </button>

          {status === 'error' && (
            <div className="status-card border-red-500/20 bg-red-500/10 text-red-300">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Login gagal</p>
                  <p className="mt-1 text-sm text-red-200/90">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}