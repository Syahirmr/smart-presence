import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, CheckCircle, ClipboardList, RefreshCw, UserCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import * as faceapi from '@vladmandic/face-api';
import { detectFace, loadModels } from '../utils/faceApi';
import { getAttendance, getRegistrations, saveAttendance } from '../utils/storage';

type AttendanceStatus = 'loading' | 'idle' | 'recognizing' | 'success' | 'error';

type RegistrationItem = {
  id: string;
  name: string;
  descriptor: number[];
};

const findBestMatch = (descriptor: Float32Array, registrations: RegistrationItem[]) => {
  let bestMatch: RegistrationItem | null = null;
  let minDistance = 1;

  for (const registration of registrations) {
    const distance = faceapi.euclideanDistance(descriptor, new Float32Array(registration.descriptor));

    if (distance < minDistance) {
      minDistance = distance;

      if (distance < 0.6) {
        bestMatch = registration;
      }
    }
  }

  return bestMatch;
};

const Attendance = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resetTimerRef = useRef<number | null>(null);

  const [status, setStatus] = useState<AttendanceStatus>('loading');
  const [message, setMessage] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [lastMarked, setLastMarked] = useState<{ name: string; time: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializePage = async () => {
      try {
        await loadModels();
        if (!isMounted) return;
        await startCamera();
        if (isMounted) {
          setStatus('idle');
        }
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'Gagal memuat model wajah atau kamera.';
        setStatus('error');
        setMessage(message);
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
      setMessage('');
    }, 5000);
  };

  const handleManualScan = async () => {
    if (!videoRef.current || status === 'recognizing' || !isCameraReady) return;

    setStatus('recognizing');
    setMessage('');

    try {
      const detection = await detectFace(videoRef.current);

      if (!detection) {
        throw new Error('Wajah tidak terdeteksi. Lihat langsung ke kamera dan pastikan pencahayaan cukup.');
      }

      const registrations = getRegistrations();
      if (!registrations.length) {
        throw new Error('Belum ada wajah yang terdaftar di sistem.');
      }

      const bestMatch = findBestMatch(detection.descriptor, registrations);

      if (!bestMatch) {
        throw new Error('Wajah tidak dikenali. Silakan lakukan registrasi terlebih dahulu.');
      }

      const attendance = getAttendance();
      const today = new Date().toISOString().split('T')[0];
      const alreadyMarked = attendance.find((item) => item.id === bestMatch.id && item.date === today);

      if (alreadyMarked) {
        throw new Error(`${bestMatch.name} sudah melakukan absensi hari ini.`);
      }

      saveAttendance(bestMatch.name, bestMatch.id);
      setStatus('success');
      setMessage(`Absensi berhasil dicatat untuk ${bestMatch.name}.`);
      setLastMarked({
        name: bestMatch.name,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      scheduleReset();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pengenalan wajah gagal.';
      setStatus('error');
      setMessage(message);
      scheduleReset();
    }
  };

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1 className="page-title gradient-text">Ambil Absensi</h1>
        <p className="page-subtitle">
          Gunakan kamera untuk mengenali wajah yang sudah terdaftar. Absensi hanya dapat dicatat satu kali per hari.
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

              <div className="pointer-events-none absolute inset-4 rounded-[28px] border border-blue-400/25 sm:inset-6" />

              {status === 'recognizing' && (
                <>
                  <div className="absolute inset-x-0 top-0 z-20 h-1 animate-pulse bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-blue-500/10 backdrop-blur-[1px]">
                    <div className="glass-card flex items-center gap-3 px-5 py-3 text-sm text-slate-100">
                      <RefreshCw className="animate-spin text-blue-400" size={18} />
                      Sedang menganalisis wajah...
                    </div>
                  </div>
                </>
              )}

              {(status === 'loading' || !isCameraReady) && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3 text-sm text-slate-300">
                    <RefreshCw className="animate-spin text-blue-400" size={28} />
                    Menyiapkan kamera...
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card panel-padding flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">Status Kamera</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                <span className={`h-2.5 w-2.5 rounded-full ${isCameraReady ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {isCameraReady ? 'Kamera aktif dan siap memindai' : 'Kamera belum siap'}
              </div>
            </div>

            <button
              onClick={handleManualScan}
              disabled={status === 'recognizing' || status === 'loading' || !isCameraReady}
              className="btn-primary w-full sm:w-auto"
            >
              <UserCheck size={18} />
              Tandai Absensi Saya
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="glass-card panel-padding">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-300">
                <ClipboardList size={20} />
              </div>
              <div>
                <h2 className="section-title">Status Absensi</h2>
                <p className="text-sm text-slate-400">Ringkasan hasil proses scan terbaru.</p>
              </div>
            </div>

            <div className="min-h-[220px] rounded-2xl border border-white/5 bg-slate-950/40 p-4">
              <AnimatePresence mode="wait">
                {status === 'idle' && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-full min-h-[188px] flex-col items-center justify-center gap-3 text-center text-slate-400"
                  >
                    <div className="rounded-full bg-slate-900 p-4">
                      <Camera size={24} />
                    </div>
                    <p className="max-w-xs text-sm leading-6">
                      Sistem siap memindai. Klik tombol absensi saat wajah berada di tengah kamera.
                    </p>
                  </motion.div>
                )}

                {status === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex h-full min-h-[188px] flex-col items-center justify-center gap-3 text-center"
                  >
                    <div className="rounded-full border border-emerald-500/40 bg-emerald-500/15 p-4 text-emerald-400">
                      <CheckCircle size={28} />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-emerald-300">Absensi Berhasil</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{message}</p>
                    </div>
                  </motion.div>
                )}

                {(status === 'error' || status === 'loading') && (
                  <motion.div
                    key={status}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex h-full min-h-[188px] flex-col items-center justify-center gap-3 text-center"
                  >
                    <div
                      className={`rounded-full p-4 ${
                        status === 'loading'
                          ? 'border border-blue-500/30 bg-blue-500/10 text-blue-300'
                          : 'border border-red-500/40 bg-red-500/15 text-red-400'
                      }`}
                    >
                      {status === 'loading' ? <RefreshCw size={28} className="animate-spin" /> : <AlertCircle size={28} />}
                    </div>
                    <div>
                      <p className={`text-lg font-semibold ${status === 'loading' ? 'text-blue-300' : 'text-red-300'}`}>
                        {status === 'loading' ? 'Menyiapkan Sistem' : 'Absensi Gagal'}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        {status === 'loading' ? 'Model wajah dan kamera sedang dipersiapkan.' : message}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="glass-card panel-padding">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Absensi Terakhir</p>
            {lastMarked ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div>
                  <p className="font-semibold text-emerald-100">{lastMarked.name}</p>
                  <p className="mt-1 text-sm text-slate-400">Tercatat pada sesi browser ini</p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-slate-300">{lastMarked.time}</span>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-400">Belum ada absensi yang berhasil dicatat pada sesi ini.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Attendance;
