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
  return video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0;
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
        
        // Explicitly play video to ensure compatibility across all browsers (Chrome, Edge, Firefox)
        await videoRef.current.play().catch((err) => {
          console.warn('Silent autoplay play() call: ', err);
        });

        setIsCameraReady(true);
        setStatus('idle');
        setMessage('Sistem siap memindai.');
      } catch (err) {
        if (!isMounted) return;
        console.error('Gagal memuat kamera/model: ', err);
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
          const names = presentUsers.map(r => r.user?.nama_lengkap || 'Pengguna').join(', ');
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
          const names = duplicateUsers.map(r => r.user?.nama_lengkap || 'Pengguna').join(', ');
          setStatus('duplicate');
          
          // Konflik sudah digabung dan dibersihkan di sini:
          finalMessage = `${names} sudah melakukan absensi dalam 60 menit terakhir.`;
          
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

  const getStatusColorConfig = () => {
    switch (status) {
      case 'success':
        return {
          border: 'border-emerald-500',
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          glow: 'shadow-[0_0_25px_rgba(16,185,129,0.35)]',
          label: 'BERHASIL HADIR',
        };
      case 'duplicate':
        return {
          border: 'border-amber-500',
          text: 'text-amber-400',
          bg: 'bg-amber-500/10',
          glow: 'shadow-[0_0_25px_rgba(245,158,11,0.35)]',
          label: 'SUDAH ABSEN',
        };
      case 'error':
        return {
          border: 'border-rose-500',
          text: 'text-rose-400',
          bg: 'bg-rose-500/10',
          glow: 'shadow-[0_0_25px_rgba(244,63,94,0.35)]',
          label: 'GAGAL MEMPROSES',
        };
      case 'recognizing':
        return {
          border: 'border-blue-500 animate-pulse',
          text: 'text-blue-400',
          bg: 'bg-blue-500/10',
          glow: 'shadow-[0_0_30px_rgba(59,130,246,0.45)]',
          label: 'MENGANALISIS WAJAH',
        };
      case 'loading':
        return {
          border: 'border-slate-500',
          text: 'text-slate-400',
          bg: 'bg-slate-500/10',
          glow: 'shadow-none',
          label: 'MENYIAPKAN SISTEM',
        };
      default: // idle
        return {
          border: 'border-blue-500/25',
          text: 'text-blue-300',
          bg: 'bg-blue-500/5',
          glow: 'shadow-none',
          label: 'SISTEM SIAP MEMINDAI',
        };
    }
  };

  const statusConfig = getStatusColorConfig();

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
          <div className={`glass-card overflow-hidden bg-black border-2 transition-all duration-300 ${statusConfig.border} ${statusConfig.glow}`}>
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

              {/* Dynamic Futuristic Corner Brackets */}
              <div className="pointer-events-none absolute inset-0 z-10">
                <div className={`absolute top-6 left-6 sm:top-10 sm:left-10 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg transition-all duration-300 ${statusConfig.border}`} />
                <div className={`absolute top-6 right-6 sm:top-10 sm:right-10 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg transition-all duration-300 ${statusConfig.border}`} />
                <div className={`absolute bottom-6 left-6 sm:bottom-10 sm:left-10 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg transition-all duration-300 ${statusConfig.border}`} />
                <div className={`absolute bottom-6 right-6 sm:bottom-10 sm:right-10 w-8 h-8 border-b-4 border-r-4 rounded-br-lg transition-all duration-300 ${statusConfig.border}`} />
              </div>

              {/* Dynamic Inner Scanning Frame Outline */}
              <div className={`pointer-events-none absolute inset-6 sm:inset-10 rounded-2xl border-2 transition-all duration-300 ${status === 'idle' ? 'border-blue-400/10' : statusConfig.border}`} />

              {/* Laser Scanning Line */}
              {status === 'recognizing' && (
                <div className="absolute inset-x-0 z-20 h-1.5 animate-[scan_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
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

            <div className="min-h-[260px] flex flex-col justify-center rounded-2xl border border-white/5 bg-slate-950/45 p-6 transition-all duration-300">
              <AnimatePresence mode="wait">
                {status === 'idle' && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center justify-center gap-4 text-center text-slate-400"
                  >
                    <div className="rounded-full bg-blue-500/10 border border-blue-500/20 p-4 text-blue-400 animate-pulse">
                      <Camera size={28} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold tracking-wider text-slate-300 uppercase">Auto Scanner Aktif</p>
                      <p className="max-w-xs text-xs text-slate-400 leading-relaxed">
                        Silakan posisikan wajah Anda di depan kamera untuk melakukan scan kehadiran otomatis.
                      </p>
                    </div>
                  </motion.div>
                )}

                {status === 'recognizing' && (
                  <motion.div
                    key="recognizing"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center justify-center gap-4 text-center text-blue-400"
                  >
                    <div className="rounded-full bg-blue-500/15 border border-blue-500/30 p-4 text-blue-400">
                      <RefreshCw size={28} className="animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold tracking-wider text-blue-300 uppercase">Mencari Wajah</p>
                      <p className="max-w-xs text-xs text-slate-400 leading-relaxed">
                        Sistem sedang memproses biometrik wajah Anda. Harap tetap tenang di depan kamera.
                      </p>
                    </div>
                  </motion.div>
                )}

                {status === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center justify-center gap-4 text-center"
                  >
                    <div className="rounded-full border border-emerald-500/40 bg-emerald-500/15 p-4 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                      <CheckCircle size={32} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-lg font-bold text-emerald-400 uppercase tracking-wide">Absensi Berhasil</p>
                      <p className="text-sm font-semibold text-slate-200">{message}</p>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                        Kehadiran Anda telah dicatat dalam database. Terima kasih sudah melakukan presensi tepat waktu.
                      </p>
                    </div>
                  </motion.div>
                )}

                {status === 'duplicate' && (
                  <motion.div
                    key="duplicate"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center justify-center gap-4 text-center"
                  >
                    <div className="rounded-full border border-amber-500/40 bg-amber-500/15 p-4 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                      <AlertCircle size={32} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-lg font-bold text-amber-400 uppercase tracking-wide">Sudah Absen</p>
                      <p className="text-sm font-semibold text-slate-200 leading-relaxed max-w-xs mx-auto">{message}</p>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                        Pembatasan 60 menit aktif untuk mencegah duplikasi data. Tidak perlu melakukan scan ulang.
                      </p>
                    </div>
                  </motion.div>
                )}

                {status === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center justify-center gap-4 text-center"
                  >
                    <div className="rounded-full border border-rose-500/40 bg-rose-500/15 p-4 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)] animate-shake">
                      <AlertCircle size={32} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-lg font-bold text-rose-400 uppercase tracking-wide">
                        {message === 'Wajah tidak terdaftar.' ? 'Wajah Tidak Dikenali' : 'Terjadi Kesalahan'}
                      </p>
                      <p className="text-sm font-semibold text-slate-200 leading-relaxed max-w-xs mx-auto">
                        {message === 'Wajah tidak terdaftar.'
                          ? 'Wajah Anda belum terdaftar di sistem database presensi.'
                          : message}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                        {message === 'Wajah tidak terdaftar.'
                          ? 'Silakan hubungi administrator program untuk mendaftarkan wajah Anda di menu Dapatkan/Daftar Wajah.'
                          : 'Periksa koneksi jaringan ke server atau silakan coba beberapa saat lagi.'}
                      </p>
                    </div>
                  </motion.div>
                )}

                {status === 'loading' && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center gap-4 text-center text-slate-400"
                  >
                    <div className="rounded-full border border-blue-500/30 bg-blue-500/10 p-4 text-blue-400">
                      <RefreshCw size={28} className="animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold tracking-wider text-blue-300 uppercase">Menyiapkan Sistem</p>
                      <p className="max-w-xs text-xs text-slate-400 leading-relaxed">
                        Memuat modul kamera dan memproses AI model wajah. Mohon tunggu...
                      </p>
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
          0% { top: 0%; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}