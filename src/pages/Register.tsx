import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, CheckCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import LivenessCamera from '../components/LivenessCamera';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const REQUIRED_EMBEDDINGS = 3;
const SUCCESS_RESET_MS = 3500;

type RegisterStatus = 'idle' | 'capturing' | 'submitting' | 'success' | 'error';

type ErrorResponse = {
  success: false;
  code: string;
  message: string;
  details?: unknown;
};

type SuccessResponse = {
  success: true;
  code?: string;
  message: string;
};

type EnrollResponse = ErrorResponse | SuccessResponse;

const sanitizeText = (value: string) => value.trim().replace(/\s+/g, ' ');

export default function Register() {
  const resetTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const [formData, setFormData] = useState({
    nim_nip: '',
    nama_lengkap: '',
  });
  const [status, setStatus] = useState<RegisterStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [capturedEmbeddings, setCapturedEmbeddings] = useState<number[][]>([]);
  const [cameraSessionKey, setCameraSessionKey] = useState(0);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const resetCaptureSession = () => {
    setCapturedEmbeddings([]);
    setCameraSessionKey((previous) => previous + 1);
  };

  const scheduleSuccessReset = () => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = window.setTimeout(() => {
      setStatus('idle');
      setErrorMessage('');
      setFormData({
        nim_nip: '',
        nama_lengkap: '',
      });
      resetCaptureSession();
    }, SUCCESS_RESET_MS);
  };

  const handleCaptureSuccess = (embeddings: number[][]) => {
    setCapturedEmbeddings(embeddings.slice(0, REQUIRED_EMBEDDINGS));
    setStatus('capturing');
    setErrorMessage('');
  };

  const handleCaptureCancel = () => {
    setStatus('idle');
    setErrorMessage('');
    resetCaptureSession();
  };

  const handleFinalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const sanitizedName = sanitizeText(formData.nama_lengkap);
    const sanitizedId = sanitizeText(formData.nim_nip);

    if (sanitizedName.length < 3) {
      setStatus('error');
      setErrorMessage('Nama lengkap minimal 3 karakter.');
      return;
    }

    if (sanitizedId.length < 3) {
      setStatus('error');
      setErrorMessage('ID / Nomor Induk minimal 3 karakter.');
      return;
    }

    if (capturedEmbeddings.length < REQUIRED_EMBEDDINGS) {
      setStatus('error');
      setErrorMessage('Liveness capture belum lengkap. Silakan ulangi proses kamera.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      // 1. Reset timer biar aman kalau user klik berulang kali
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }

      const response = await fetch(`${API_BASE_URL}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nim_nip: sanitizedId,
          nama_lengkap: sanitizedName,
          embeddings: capturedEmbeddings,
        }),
      });

      // 2. Typing eksplisit as EnrollResponse
      const payload = (await response.json().catch(() => null)) as EnrollResponse | null;

      if (response.status === 409) {
        setStatus('error');

        if (payload?.code === 'DUPLICATE_USER') {
          setErrorMessage(`ID / Nomor Induk ${sanitizedId} sudah terdaftar di sistem.`);
          return;
        }

        if (payload?.code === 'FACE_ALREADY_REGISTERED') {
          setErrorMessage('Wajah ini sudah terdaftar atas identitas lain.');
          return;
        }

        setErrorMessage(payload?.message || 'Registrasi ditolak karena data sudah terdaftar.');
        return;
      }

      // 3. Manfaatin pesan spesifik dari backend kalau ada error 400/500
      if (!response.ok) {
        throw new Error(payload?.message || `HTTP_ERROR:${response.status}`);
      }

      setStatus('success');
      scheduleSuccessReset();
    } catch (error) {
      setStatus('error');
      
      if (error instanceof Error) {
        // Ngecek spesifik kalau backend mati / connection refused
        if (error.message.includes('Failed to fetch')) {
          setErrorMessage('Server tidak merespons. Pastikan backend sedang berjalan.');
          return;
        }
        
        // Nampilin pesan spesifik hasil throw dari blok if (!response.ok)
        setErrorMessage(error.message || 'Server gagal memproses registrasi wajah.');
        return;
      }

      setErrorMessage('Terjadi kesalahan yang tidak diketahui saat registrasi.');
    }
  };

  const isCaptureReady = capturedEmbeddings.length >= REQUIRED_EMBEDDINGS;
  const isSubmitting = status === 'submitting';

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1 className="page-title gradient-text">Daftarkan Wajah</h1>
        <p className="page-subtitle">
          Rekam wajah pengguna untuk disimpan di server sebagai identitas absensi. Pastikan wajah terlihat jelas dan
          ikuti instruksi liveness sampai selesai.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          <div
            className={`glass-card overflow-hidden border-2 bg-black transition-colors ${
              isCaptureReady ? 'border-emerald-500/40' : 'border-white/10'
            }`}
          >
            <div className="relative aspect-[4/3] sm:aspect-video">
              <LivenessCamera
                key={cameraSessionKey}
                onSuccess={handleCaptureSuccess}
                onCancel={handleCaptureCancel}
              />

              {status === 'submitting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
                  <div className="glass-card flex items-center gap-3 px-5 py-3 text-sm text-slate-100">
                    <RefreshCw className="animate-spin text-blue-400" size={18} />
                    Mengirim data registrasi ke server...
                  </div>
                </div>
              )}

              {isCaptureReady && status !== 'submitting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/10">
                  <div className="rounded-full bg-emerald-500 p-3 text-white shadow-lg">
                    <CheckCircle size={36} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card panel-padding grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-slate-200">Status Kamera</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isCaptureReady ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                {isCaptureReady ? 'Liveness capture selesai dan siap didaftarkan' : 'Menunggu capture liveness selesai'}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">Tips Registrasi</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Gunakan pencahayaan yang cukup, hindari gerakan cepat, dan ikuti instruksi kamera sampai verifikasi
                selesai.
              </p>
            </div>
          </div>
        </section>

        <section className="glass-card panel-padding">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-300">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="section-title">Form Registrasi</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Data registrasi akan dikirim ke backend dan disimpan di database. Gunakan nama lengkap dan ID yang unik.
              </p>
            </div>
          </div>

          <form onSubmit={handleFinalSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="full-name" className="text-sm font-medium text-slate-300">
                Nama Lengkap
              </label>
              <input
                id="full-name"
                type="text"
                required
                maxLength={80}
                autoComplete="off"
                value={formData.nama_lengkap}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    nama_lengkap: event.target.value,
                  }))
                }
                placeholder="Contoh: Salma Oktavia"
                className="input-base"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="user-id" className="text-sm font-medium text-slate-300">
                ID / Nomor Induk
              </label>
              <input
                id="user-id"
                type="text"
                required
                maxLength={40}
                autoComplete="off"
                value={formData.nim_nip}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    nim_nip: event.target.value,
                  }))
                }
                placeholder="Contoh: 22123456"
                className="input-base"
              />
              <p className="text-xs text-slate-500">
                Wajib unik. Jika ID sudah terdaftar, backend akan menolak registrasi.
              </p>
            </div>

            <button
              type="submit"
              disabled={!isCaptureReady || isSubmitting}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Memproses Registrasi...
                </>
              ) : (
                <>
                  <Camera size={18} />
                  Simpan Registrasi
                </>
              )}
            </button>

            <AnimatePresence mode="wait">
              {status === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="status-card border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Registrasi berhasil</p>
                      <p className="mt-1 text-sm text-emerald-200/90">
                        Data wajah berhasil disimpan ke server dan siap dipakai untuk absensi.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="status-card border-red-500/20 bg-red-500/10 text-red-300"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Registrasi gagal</p>
                      <p className="mt-1 text-sm text-red-200/90">{errorMessage}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {status === 'capturing' && (
                <motion.div
                  key="capturing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="status-card border-blue-500/20 bg-blue-500/10 text-blue-300"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Capture berhasil</p>
                      <p className="mt-1 text-sm text-blue-200/90">
                        Data liveness sudah terkumpul. Lengkapi form lalu simpan registrasi ke server.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </section>
      </div>
    </div>
  );
}