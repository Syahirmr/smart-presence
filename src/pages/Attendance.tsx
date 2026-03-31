import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, CheckCircle, ClipboardList, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { detectAllFaces, loadModels } from '../utils/faceApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const KIOSK_ID = import.meta.env.VITE_KIOSK_ID || 'Kiosk-Utama';
const SCAN_RETRY_DELAY_MS = 500;
const RESULT_DISPLAY_MS = 4000;

type AttendanceStatus = 'loading' | 'idle' | 'recognizing' | 'success' | 'error' | 'duplicate';

type LastMarkedAttendance = {
  name: string;
  nim?: string;
  time: string;
};

type ScanUser = {
  nama_lengkap: string;
  nim_nip: string;
};

type ScanResult = {
  status: 'HADIR' | 'DUPLICATE' | 'UNKNOWN';
  confidence_score: number;
  user?: ScanUser;
};

type ScanResponse = {
  success: boolean;
  message: string;
  data?: {
    results?: ScanResult[];
  };
};

function getAttendanceErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.startsWith('HTTP_ERROR:')) {
    return 'Server sedang tidak dapat dihubungi.';
  }

  return 'Gagal memproses pengenalan wajah.';
}

function isVideoReady(video: HTMLVideoElement) {
  return video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
}

export default function Attendance() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isProcessingRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const [status, setStatus] = useState<AttendanceStatus>('loading');
  const [message, setMessage] = useState('Menyiapkan sistem...');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [lastMarked, setLastMarked] = useState<LastMarkedAttendance | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeCamera = async () => {
      try {
        await loadModels();

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isMounted || !videoRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
        setStatus('idle');
        setMessage('Sistem siap memindai.');
      } catch {
        if (!isMounted) return;

        setStatus('error');
        setMessage('Gagal memuat kamera atau model AI. Pastikan izin kamera diberikan.');
      }
    };

    void initializeCamera();

    return () => {
      isMounted = false;

      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }

      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    if (status !== 'idle' || !isCameraReady) return;

    let isActive = true;

    const scheduleNextScan = () => {
      if (!isActive) return;
      window.setTimeout(() => {
        void scanLoop();
      }, SCAN_RETRY_DELAY_MS);
    };

    const scanLoop = async () => {
      const video = videoRef.current;

      if (!isActive || !video || isProcessingRef.current) {
        return;
      }

      if (!isVideoReady(video)) {
        scheduleNextScan();
        return;
      }

      try {
        const detections = await detectAllFaces(video);

        if (!detections || detections.length === 0) {
          scheduleNextScan();
          return;
        }

        isProcessingRef.current = true;
        setStatus('recognizing');
        setMessage(`${detections.length} Wajah terdeteksi! Mengamankan data...`);

        const facesData = detections.map(d => ({ embedding: Array.from(d.descriptor) }));

        const response = await fetch(`${API_BASE_URL}/attendance/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            kiosk_id: KIOSK_ID,
            faces: facesData,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP_ERROR:${response.status}`);
        }

        const payload = (await response.json()) as ScanResponse;
        const results = payload.data?.results;

        if (!results || results.length === 0) {
          throw new Error('INVALID_SCAN_RESPONSE');
        }

        const presentUsers = results.filter(r => r.status === 'HADIR');
        const duplicateUsers = results.filter(r => r.status === 'DUPLICATE');

        let finalMessage = '';

        if (presentUsers.length > 0) {
          const names = presentUsers.map(r => r.user?.nama_lengkap.split(' ')[0] || 'Pengguna').join(', ');
          setStatus('success');
          finalMessage = `Absensi sukses: ${names}`;
          
          setLastMarked({
            name: names,
            nim: presentUsers.map(r => r.user?.nim_nip).join(', '),
            time: new Date().toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          });
        } else if (duplicateUsers.length > 0) {
          const names = duplicateUsers.map(r => r.user?.nama_lengkap.split(' ')[0] || 'Pengguna').join(', ');
          setStatus('duplicate');
          finalMessage = `Sudah absen: ${names}`;
        } else {
          setStatus('error');
          finalMessage = 'Wajah tidak terdaftar.';
        }
        
        setMessage(finalMessage);
      } catch (error) {
        setStatus('error');
        setMessage(getAttendanceErrorMessage(error));
      } finally {
        if (resetTimerRef.current) {
          window.clearTimeout(resetTimerRef.current);
        }

        resetTimerRef.current = window.setTimeout(() => {
          if (!isActive) return;

          setStatus('idle');
          setMessage('Sistem siap memindai.');
          isProcessingRef.current = false;
        }, RESULT_DISPLAY_MS);
      }
    };

    void scanLoop();

    return () => {
      isActive = false;
      isProcessingRef.current = false;

      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, [status, isCameraReady]);

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1 className="page-title gradient-text">Ambil Absensi</h1>
        <p className="page-subtitle">
          Posisikan wajah Anda di dalam frame untuk pengenalan otomatis instan.
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
                className={`h-full w-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                  status === 'recognizing' ? 'opacity-80' : 'opacity-100'
                }`}
              />

              <div className="pointer-events-none absolute inset-4 rounded-[28px] border border-blue-400/25 sm:inset-6" />

              {status === 'recognizing' && (
                <>
                  <div className="absolute inset-x-0 top-0 z-20 h-1 animate-[scan_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-blue-500/10 backdrop-blur-[1px]">
                    <div className="glass-card flex items-center gap-3 px-5 py-3 text-sm text-slate-100">
                      <RefreshCw className="animate-spin text-blue-400" size={18} />
                      Menganalisis wajah...
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="glass-card panel-padding flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">Status Kamera</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isCameraReady ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                {isCameraReady ? 'Auto-Scanner Aktif' : 'Menyiapkan...'}
              </div>
            </div>

            <div className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-medium text-slate-300 sm:w-auto">
              <div className="flex items-center justify-center gap-2">
                <Camera size={18} />
                Otomatis Memindai
              </div>
            </div>
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
                    className="flex min-h-[188px] h-full flex-col items-center justify-center gap-3 text-center text-slate-400"
                  >
                    <div className="rounded-full bg-slate-900 p-4">
                      <Camera size={24} />
                    </div>
                    <p className="max-w-xs text-sm leading-6">{message}</p>
                  </motion.div>
                )}

                {status === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex min-h-[188px] h-full flex-col items-center justify-center gap-3 text-center"
                  >
                    <div className="rounded-full border border-emerald-500/40 bg-emerald-500/15 p-4 text-emerald-400">
                      <CheckCircle size={28} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-300">Berhasil Hadir</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{message}</p>
                    </div>
                  </motion.div>
                )}

                {status === 'duplicate' && (
                  <motion.div
                    key="duplicate"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex min-h-[188px] h-full flex-col items-center justify-center gap-3 text-center"
                  >
                    <div className="rounded-full border border-amber-500/40 bg-amber-500/15 p-4 text-amber-400">
                      <AlertCircle size={28} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-300">Sudah Absen</p>
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
                    className="flex min-h-[188px] h-full flex-col items-center justify-center gap-3 text-center"
                  >
                    <div
                      className={`rounded-full p-4 ${
                        status === 'loading'
                          ? 'border border-blue-500/30 bg-blue-500/10 text-blue-300'
                          : 'border border-red-500/40 bg-red-500/15 text-red-400'
                      }`}
                    >
                      {status === 'loading' ? (
                        <RefreshCw size={28} className="animate-spin" />
                      ) : (
                        <AlertCircle size={28} />
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-lg font-bold ${
                          status === 'loading' ? 'text-blue-300' : 'text-red-300'
                        }`}
                      >
                        {status === 'loading' ? 'Menyiapkan Sistem' : 'TIDAK DIKENAL'}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{message}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="glass-card panel-padding">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Absensi Terakhir
            </p>

            {lastMarked ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div>
                  <p className="font-bold text-emerald-100">{lastMarked.name}</p>
                  <p className="mt-1 font-mono text-xs text-slate-400">{lastMarked.nim}</p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                  {lastMarked.time}
                </span>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Belum ada absensi sukses pada sesi ini.
              </p>
            )}
          </div>
        </section>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10%, 90% { opacity: 1; }
          50% { transform: translateY(350px); }
          100% { transform: translateY(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}