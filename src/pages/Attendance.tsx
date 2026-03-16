import { useRef, useState, useEffect } from 'react';
import { Camera, CheckCircle, AlertCircle, RefreshCw, UserCheck, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as faceapi from '@vladmandic/face-api';
import { detectFace } from '../utils/faceApi';
import { getRegistrations, saveAttendance, getAttendance } from '../utils/storage';


const Attendance = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [status, setStatus] = useState<'idle' | 'recognizing' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [lastMarked, setLastMarked] = useState<{ name: string, time: string } | null>(null);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraReady(true);
            }
        } catch (err) {
            console.error("Kesalahan Kamera:", err);
            setStatus('error');
            setMessage('Gagal mengakses kamera.');
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleManualScan = async () => {
        if (!videoRef.current || status === 'recognizing') return;

        setStatus('recognizing');
        try {
            const detection = await detectFace(videoRef.current);

            if (!detection) {
                throw new Error('Wajah tidak terdeteksi. Silakan lihat langsung ke kamera.');
            }

            const registrations = getRegistrations();
            if (registrations.length === 0) {
                throw new Error('Belum ada wajah yang terdaftar di sistem.');
            }


            let bestMatch = null;
            let minDistance = 1.0;

            for (const reg of registrations) {
                const distance = faceapi.euclideanDistance(detection.descriptor, new Float32Array(reg.descriptor));
                if (distance < minDistance) {
                    minDistance = distance;
                    if (distance < 0.6) { // Threshold
                        bestMatch = reg;
                    }
                }
            }

            if (bestMatch) {
                // Check if already marked today
                const attendance = getAttendance();
                const today = new Date().toISOString().split('T')[0];
                const alreadyMarked = attendance.find(a => a.id === bestMatch!.id && a.date === today);

                if (alreadyMarked) {
                    throw new Error(`${bestMatch.name} sudah melakukan absensi hari ini.`);
                }

                saveAttendance(bestMatch.name, bestMatch.id);
                setStatus('success');
                setMessage(`Absensi berhasil dicatat untuk ${bestMatch.name}`);
                setLastMarked({ name: bestMatch.name, time: new Date().toLocaleTimeString() });
                setTimeout(() => setStatus('idle'), 5000);
            } else {
                throw new Error('Wajah tidak dikenali. Silakan lakukan pendaftaran terlebih dahulu.');
            }

        } catch (err: any) {
            setStatus('error');
            setMessage(err.message || 'Pengenalan gagal.');
            setTimeout(() => setStatus('idle'), 5000);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold gradient-text">Ambil Absensi</h1>
                <p className="text-slate-400">Posisikan wajah Anda di dalam frame untuk pengenalan instan.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="relative aspect-video glass-card overflow-hidden bg-black ring-1 ring-white/10">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 border-2 border-blue-500/20 pointer-events-none" />

                        {/* Scanning Overlay */}
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan z-20" />

                        <AnimatePresence>
                            {status === 'recognizing' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px] flex items-center justify-center z-30"
                                >
                                    <div className="glass-card px-6 py-3 flex items-center gap-3">
                                        <RefreshCw className="animate-spin text-blue-400" size={20} />
                                        <span className="font-semibold text-blue-100">Sedang menganalisis wajah...</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {!isCameraReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-40">
                                <RefreshCw className="animate-spin text-blue-400" size={32} />
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleManualScan}
                        disabled={status === 'recognizing' || !isCameraReady}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 group"
                    >
                        <UserCheck className="group-hover:text-blue-400 transition-colors" size={24} />
                        <span>Tandai Absensi Saya</span>
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="glass-card p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <ClipboardList size={20} className="text-blue-400" />
                            Status Absensi
                        </h3>

                        <div className="min-h-[200px] flex flex-col items-center justify-center text-center p-4">
                            <AnimatePresence mode="wait">
                                {status === 'idle' && (
                                    <motion.div
                                        key="idle"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-slate-500 space-y-2"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-slate-900 mx-auto flex items-center justify-center">
                                            <Camera size={24} />
                                        </div>
                                        <p className="text-sm">Siap untuk memindai. Silakan klik tombol untuk memulai.</p>
                                    </motion.div>
                                )}

                                {status === 'success' && (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-3"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto">
                                            <CheckCircle size={32} className="text-emerald-500" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-emerald-400 text-lg">Berhasil!</h4>
                                            <p className="text-slate-300 text-sm">{message}</p>
                                        </div>
                                    </motion.div>
                                )}

                                {status === 'error' && (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-3"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center mx-auto">
                                            <AlertCircle size={32} className="text-red-500" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-red-400 text-lg">Gagal</h4>
                                            <p className="text-slate-300 text-sm">{message}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <AnimatePresence>
                        {lastMarked && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="glass-card p-4 border-emerald-500/20 bg-emerald-500/5"
                            >
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Absensi Terakhir</p>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-emerald-100">{lastMarked.name}</span>
                                    <span className="text-slate-400">{lastMarked.time}</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Attendance;