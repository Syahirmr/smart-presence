import React, { useRef, useState, useEffect } from 'react';
import { loadModels, detectFace } from '../utils/faceApi';

type LivenessStep = 'LOADING_MODEL' | 'HADAP_DEPAN' | 'BUKA_MULUT' | 'GELENG_KEPALA' | 'SELESAI';

interface LivenessCameraProps {
  onSuccess: (embeddings: number[][]) => void;
  onCancel?: () => void;
}

export default function LivenessCamera({ onSuccess, onCancel }: LivenessCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState<LivenessStep>('LOADING_MODEL');
  const [message, setMessage] = useState('Memuat model AI...');
  const [embeddings, setEmbeddings] = useState<number[][]>([]);

  // 1. Load Model & Nyalakan Kamera saat komponen dipanggil
  useEffect(() => {
    const initCamera = async () => {
      await loadModels(); // Memanggil fungsi dari faceApi.ts kamu
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStep('HADAP_DEPAN');
        setMessage('Tatap lurus ke kamera 😐');
      } catch (err) {
        setMessage('Gagal akses kamera. Pastikan izin diberikan.');
      }
    };
    initCamera();

    // Matikan kamera saat komponen ditutup/unmount
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 2. Loop Deteksi Wajah (Liveness)
  useEffect(() => {
    if (step === 'LOADING_MODEL' || step === 'SELESAI') return;

    const interval = setInterval(async () => {
      if (!videoRef.current) return;

      // Memanggil fungsi deteksi dari faceApi.ts kamu
      const detection = await detectFace(videoRef.current);

      if (!detection) {
        setMessage('Wajah tidak terdeteksi. Posisikan wajah di tengah oval.');
        return;
      }

      const landmarks = detection.landmarks;
      const currentEmbedding = Array.from(detection.descriptor);

      // --- MISI 1: HADAP DEPAN ---
      if (step === 'HADAP_DEPAN') {
        const nose = landmarks.getNose()[3];
        const jaw = landmarks.getJawOutline();
        const ratio = (nose.x - jaw[0].x) / (jaw[16].x - nose.x);

        // Toleransi wajah lurus
        if (ratio > 0.8 && ratio < 1.2) {
          setEmbeddings(prev => [...prev, currentEmbedding]);
          setStep('BUKA_MULUT');
          setMessage('Bagus! Sekarang BUKA MULUT kamu 😮');
        } else {
          setMessage('Tolong hadap lurus ke kamera ya.');
        }
      } 
      
      // --- MISI 2: BUKA MULUT ---
      else if (step === 'BUKA_MULUT') {
        const mouth = landmarks.getMouth();
        const distance = Math.abs(mouth[18].y - mouth[14].y);

        // Angka 12 biar lebih gampang lolos pas mangap
        if (distance > 12) {
          setEmbeddings(prev => [...prev, currentEmbedding]);
          setStep('GELENG_KEPALA');
          setMessage('Sip! Terakhir, GELENGKAN KEPALA ke kiri/kanan 😏');
        } else {
          setMessage('Ayo buka mulutnya sedikit lebih lebar 😮');
        }
      } 
      
      // --- MISI 3: GELENG KEPALA ---
      else if (step === 'GELENG_KEPALA') {
        const nose = landmarks.getNose()[3];
        const jaw = landmarks.getJawOutline();
        const ratio = (nose.x - jaw[0].x) / (jaw[16].x - nose.x);

        // Rasio dipermudah: Nengok dikit aja ke 0.7 atau 1.3 langsung lolos!
        if (ratio < 0.7 || ratio > 1.3) { 
          const finalEmbeddings = [...embeddings, currentEmbedding];
          setStep('SELESAI');
          setMessage('Liveness berhasil! 🎉 Sedang menyimpan...');
          
          // Lempar 3 sampel wajah (depan, mangap, nengok) ke halaman Register
          setTimeout(() => onSuccess(finalEmbeddings), 1000); 
        } else {
          setMessage('Ayo nengok dikiiiit aja ke kiri atau kanan 😏');
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [step, embeddings, onSuccess]);

  return (
    <div className="flex flex-col items-center">
      {/* Frame Full Oval & Rapi */}
      <div 
        className="relative overflow-hidden bg-black shadow-2xl border-4 border-blue-400" 
        style={{ width: 280, height: 380, borderRadius: '50%' }}
      >
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }} // Mirror effect biar seperti ngaca
        />
      </div>
      
      <div className={`mt-6 px-6 py-3 w-80 rounded-full text-center text-sm font-bold shadow-md transition-all ${step === 'SELESAI' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
        {message}
      </div>

      {onCancel && (
        <button onClick={onCancel} className="mt-4 text-red-500 font-semibold hover:underline">
          Batalkan Perekaman
        </button>
      )}
    </div>
  );
}