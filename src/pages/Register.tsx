import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, CheckCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { getFaceDescriptor, loadModels } from '../utils/faceApi';
import { saveRegistration } from '../utils/storage';

type RegisterStatus = 'idle' | 'loading' | 'capturing' | 'success' | 'error';

const sanitizeText = (value: string) => value.trim().replace(/\s+/g, ' ');

const Register = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resetTimerRef = useRef<number | null>(null);

  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState<RegisterStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializePage = async () => {
      try {
        // Model AI dipanggil saat halaman dibuka agar initial load aplikasi tetap ringan.
        await loadModels();
        if (!isMounted) return;
        await startCamera();
        if (isMounted) {
          setStatus('idle');
        }
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'Gagal memuat kamera atau model wajah.';
        setStatus('error');
        setErrorMessage(message);
      }
    };

    initializePage();

    return () => {
      isMounted = false;
      stopCamera();
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      setIsCameraReady(true);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const scheduleReset = () => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = window.setTimeout(() => {
      setStatus('idle');
      setErrorMessage('');
    }, 3500);
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanedName = sanitizeText(name);
    const cleanedUserId = sanitizeText(userId);

    if (!videoRef.current || !isCameraReady) {
      setStatus('error');
      setErrorMessage('Kamera belum siap. Tunggu beberapa saat lalu coba lagi.');
      scheduleReset();
      return;
    }

    if (cleanedName.length < 3) {
      setStatus('error');
      setErrorMessage('Nama minimal 3 karakter.');
      scheduleReset();
      return;
    }

    setStatus('capturing');
    setErrorMessage('');

    try {
      const descriptor = await getFaceDescriptor(videoRef.current);

      if (!descriptor) {
        throw new Error('Wajah tidak terdeteksi. Pastikan wajah terlihat jelas dan pencahayaan cukup.');
      }

      saveRegistration({
        id: cleanedUserId || `USR-${Date.now()}`,
        name: cleanedName,
        descriptor: Array.from(descriptor),
      });

      setStatus('success');
      setName('');
      setUserId('');
      scheduleReset();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pendaftaran gagal.';
      setStatus('error');
      setErrorMessage(message);
      scheduleReset();
    }
  };

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1 className="page-title gradient-text">Daftarkan Wajah</h1>
        <p className="page-subtitle">
          Rekam wajah pengguna untuk disimpan sebagai identitas absensi. Pastikan wajah terlihat jelas dan berada di
          tengah frame kamera.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          <div className="glass-card overflow-hidden bg-black">
            <div className="relative aspect-[4/3] sm:aspect-video">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />

              <div className="pointer-events-none absolute inset-4 rounded-[28px] border border-white/15 sm:inset-6" />

              {status === 'capturing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
                  <div className="glass-card flex items-center gap-3 px-5 py-3 text-sm text-slate-100">
                    <RefreshCw className="animate-spin text-blue-400" size={18} />
                    Memproses data wajah...
                  </div>
                </div>
              )}

              {(status === 'loading' || !isCameraReady) && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3 text-sm text-slate-300">
                    <RefreshCw className="animate-spin text-blue-400" size={28} />
                    Menyiapkan kamera...
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card panel-padding grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-slate-200">Status Kamera</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                <span className={`h-2.5 w-2.5 rounded-full ${isCameraReady ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {isCameraReady ? 'Kamera aktif dan siap digunakan' : 'Sedang menyiapkan kamera'}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Tips Registrasi</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Gunakan pencahayaan yang cukup, hindari gerakan cepat, dan posisikan wajah di area tengah.
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
                Data registrasi akan disimpan lokal di browser. Gunakan nama dan ID yang unik agar mudah dikelola.
              </p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="full-name" className="text-sm font-medium text-slate-300">
                Nama Lengkap
              </label>
              <input
                id="full-name"
                type="text"
                required
                maxLength={60}
                autoComplete="off"
                value={name}
                onChange={(event) => setName(event.target.value)}
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
                maxLength={30}
                autoComplete="off"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="Contoh: 22123456"
                className="input-base"
              />
              <p className="text-xs text-slate-500">Opsional. Jika kosong, sistem akan membuat ID otomatis.</p>
            </div>

            <button
              type="submit"
              disabled={status === 'capturing' || status === 'loading' || !isCameraReady}
              className="btn-primary w-full"
            >
              <Camera size={18} />
              Simpan Registrasi
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
                      <p className="mt-1 text-sm text-emerald-200/90">Data wajah tersimpan dan siap dipakai untuk absensi.</p>
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
            </AnimatePresence>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Register;
