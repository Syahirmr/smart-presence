import React, { useRef, useState, useEffect } from 'react';
import { loadModels, detectFace } from '../utils/faceApi';
import { Camera, CheckCircle2, AlertCircle, UserCheck, RefreshCcw } from 'lucide-react';

export default function Attendance() {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [status, setStatus] = useState('Siap memindai wajah Anda...');
  const [isScanning, setIsScanning] = useState(false);
  // Simpan data hasil absen untuk ditampilkan di kotak status kanan
  const [absenResult, setAbsenResult] = useState<any>(null);

  // 1. Inisialisasi Kamera & AI
  useEffect(() => {
    const initCamera = async () => {
      await loadModels(); 
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsScanning(true);
      } catch (err) {
        setStatus('Gagal mengakses kamera.');
      }
    };
    initCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 2. Looping Pengecekan Wajah Otomatis
  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(async () => {
      if (!videoRef.current) return;

      const detection = await detectFace(videoRef.current);
      if (!detection) return; 

      // Wajah ketemu! Pause scan sebentar
      setIsScanning(false);
      setStatus('Wajah terdeteksi! Mencocokkan... ⏳');

      const currentEmbedding = Array.from(detection.descriptor);

      try {
        const response = await fetch('http://localhost:3001/api/attendance/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kiosk_id: 'Kiosk-Utama', 
            faces: [{ embedding: currentEmbedding }] 
          })
        });

        if (response.ok) {
          const rawResult = await response.json();
          const resultsArray = rawResult?.data?.results || [];
          const info = resultsArray.length > 0 ? resultsArray[0] : null;

          if (info && info.status) {
            setAbsenResult(info);
            // Update status text untuk layar utama
            if (info.status === 'HADIR') setStatus('Berhasil Absen!');
            else if (info.status === 'DUPLICATE') setStatus('Sudah Absen.');
            else setStatus('Wajah Tidak Terdaftar.');
          }
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      }

      // Mulai ulang scanning setelah 4 detik agar user bisa lihat hasilnya di box kanan
      setTimeout(() => {
        setAbsenResult(null);
        setStatus('Siap memindai wajah Anda...');
        setIsScanning(true);
      }, 4000);

    }, 1500); 

    return () => clearInterval(interval);
  }, [isScanning]);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white flex flex-col items-center justify-center p-6">
      {/* Header Sesuai Figma */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-[#4B6BFF] mb-2">Ambil Absensi</h1>
        <p className="text-gray-400">Posisikan wajah Anda di dalam frame untuk pengenalan instan.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-6xl items-stretch">
        
        {/* --- SISI KIRI: VIDEO PREVIEW --- */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative rounded-3xl overflow-hidden border-2 border-[#151921] bg-black aspect-video shadow-2xl">
            <video 
              ref={videoRef} 
              autoPlay muted playsInline
              className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${!isScanning && !absenResult ? 'opacity-50' : 'opacity-100'}`}
            />
            
            {/* Animasi Scan Sci-Fi */}
            {isScanning && (
              <div className="absolute top-0 left-0 w-full h-1 bg-[#4B6BFF] shadow-[0_0_15px_rgba(75,107,255,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
            )}
          </div>
          
          {/* Tombol Dummy agar mirip desain Figma (karena kita pakai auto-scan) */}
          <div className="w-full py-4 bg-[#151921] border border-gray-800 rounded-2xl flex items-center justify-center gap-3 text-gray-400 font-medium">
             {isScanning ? <><RefreshCcw className="animate-spin" size={18} /> Memindai Otomatis...</> : <><UserCheck size={18} /> Menunggu Antrean...</>}
          </div>
        </div>

        {/* --- SISI KANAN: STATUS CARD (KOTAK STATUS ABSENSI) --- */}
        <div className="bg-[#151921] p-8 rounded-[32px] border border-gray-800 flex flex-col items-center justify-center text-center shadow-xl">
          <div className="mb-6 flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-[0.2em]">
            <Camera size={14} /> Status Absensi
          </div>

          <div className="flex-1 flex flex-col items-center justify-center w-full">
            {!absenResult ? (
              // Tampilan saat menunggu/memindai
              <div className="space-y-4 animate-pulse">
                <div className="w-20 h-20 bg-[#0B0E14] rounded-full flex items-center justify-center mx-auto border border-gray-800">
                  <Camera size={32} className="text-gray-700" />
                </div>
                <p className="text-gray-500 text-sm">{status}</p>
              </div>
            ) : (
              // Tampilan saat hasil keluar
              <div className="space-y-5 animate-in fade-in zoom-in duration-300">
                {absenResult.status === 'HADIR' ? (
                  <CheckCircle2 size={64} className="text-green-500 mx-auto" />
                ) : (
                  <AlertCircle size={64} className={`mx-auto ${absenResult.status === 'DUPLICATE' ? 'text-yellow-500' : 'text-red-500'}`} />
                )}
                
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">{absenResult.user?.nama_lengkap || 'Unknown'}</h2>
                  <p className="text-xs text-gray-500 font-mono tracking-widest">{absenResult.user?.nim_nip}</p>
                </div>

                <div className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-tighter inline-block ${
                  absenResult.status === 'HADIR' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                  absenResult.status === 'DUPLICATE' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 
                  'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {absenResult.status === 'HADIR' ? 'BERHASIL HADIR' : absenResult.status === 'DUPLICATE' ? 'SUDAH ABSEN' : 'TIDAK DIKENAL'}
                </div>

                <p className="text-[10px] text-gray-600">Confidence Score: {(absenResult.confidence_score * 100).toFixed(1)}%</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* CSS Animasi Scan */}
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