import React, { useRef, useState, useEffect } from 'react';
import { Camera, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFaceDescriptor } from '../utils/faceApi';
import { saveRegistration } from '../utils/storage';

const Register = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [name, setName] = useState('');
    const [userId, setUserId] = useState('');
    const [status, setStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [isCameraReady, setIsCameraReady] = useState(false);

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
            setErrorMessage('Gagal mengakses kamera. Pastikan izin kamera telah diberikan.');
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !videoRef.current) return;

        setStatus('capturing');
        try {
            const descriptor = await getFaceDescriptor(videoRef.current);

            if (!descriptor) {
                throw new Error('Wajah tidak terdeteksi. Pastikan wajah Anda terlihat dengan jelas.');
            }

            saveRegistration({
                id: userId || Date.now().toString(),
                name,
                descriptor: Array.from(descriptor)
            });

            setStatus('success');
            setName('');
            setUserId('');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message || 'Pendaftaran gagal.');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold gradient-text">Daftarkan Wajah</h1>
                <p className="text-slate-400">Rekam wajah Anda untuk bergabung ke sistem absensi.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-4">
                    <div className="relative aspect-video glass-card overflow-hidden bg-black group">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

                        {!isCameraReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                                <RefreshCw className="animate-spin text-blue-400" size={32} />
                            </div>
                        )}

                        <AnimatePresence>
                            {status === 'capturing' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-blue-500/20 backdrop-blur-[2px] flex items-center justify-center"
                                >
                                    <div className="text-white font-semibold flex items-center gap-2">
                                        <RefreshCw className="animate-spin" size={20} />
                                        Memproses...
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-2 px-2">
                        <div className={`w-2 h-2 rounded-full ${isCameraReady ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {isCameraReady ? 'Kamera Siap' : 'Kamera Tidak Terhubung'}
                    </div>
                </div>

                <form onSubmit={handleRegister} className="glass-card p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Nama Lengkap</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">ID / Nomor Induk (Opsional)</label>
                            <input
                                type="text"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                placeholder="EMP-123"
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'capturing' || !isCameraReady}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Camera size={20} />
                        Daftar Sekarang
                    </button>

                    <AnimatePresence>
                        {status === 'success' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3"
                            >
                                <CheckCircle size={20} />
                                <span className="text-sm">Pendaftaran berhasil! Data tersimpan secara lokal.</span>
                            </motion.div>
                        )}
                        {status === 'error' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3"
                            >
                                <AlertCircle size={20} />
                                <span className="text-sm">{errorMessage}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>
            </div>
        </div>
    );
};

export default Register;