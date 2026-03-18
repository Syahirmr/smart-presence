import React, { useState } from 'react';
import LivenessCamera from '../components/LivenessCamera';
import { Camera, User, Hash, CheckCircle } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({ nim_nip: '', nama_lengkap: '' });
  const [isLivenessPassed, setIsLivenessPassed] = useState(false);
  const [tempEmbeddings, setTempEmbeddings] = useState<number[][]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fungsi ini nangkep data dari kamera, tapi JANGAN langsung fetch dulu
  const handleCaptureSuccess = (embeddings: number[][]) => {
    setTempEmbeddings(embeddings);
    setIsLivenessPassed(true); // Biar border kamera jadi hijau & tombol aktif
  };

const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLivenessPassed || !formData.nim_nip || isLoading) return;

    setIsLoading(true);
    try {
      // Kita langsung tembak Enroll. Kalau NIM duplikat, backend bakal kasih 409.
      const response = await fetch('http://localhost:3001/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nim_nip: formData.nim_nip,
          nama_lengkap: formData.nama_lengkap,
          embeddings: tempEmbeddings.slice(0, 3)
        })
      });

      if (response.status === 409) {
        // 👇 INI CARA HANDLE 409 CONFLICT 👇
        alert(`⚠️ Gagal: NIM ${formData.nim_nip} sudah terdaftar di sistem!`);
      } else if (response.ok) {
        alert("✅ Pendaftaran Berhasil!");
        window.location.reload(); 
      } else {
        const errText = await response.text();
        alert("Terjadi kesalahan: " + errText);
      }
    } catch (err) {
      alert("Server tidak merespon. Pastikan backend jalan!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-[#4B6BFF] mb-2">Daftarkan Wajah</h1>
        <p className="text-gray-400">Rekam wajah Anda untuk bergabung ke sistem absensi.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 w-full max-w-5xl items-center">
        
        {/* SISI KIRI: KAMERA */}
        <div className={`relative rounded-3xl overflow-hidden border-4 transition-all duration-500 ${isLivenessPassed ? 'border-green-500' : 'border-[#151921]'}`}>
          <LivenessCamera 
            onSuccess={handleCaptureSuccess} 
            onCancel={() => window.location.reload()} 
          />
          {isLivenessPassed && (
            <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
               <div className="bg-green-500 text-white p-3 rounded-full shadow-lg">
                 <CheckCircle size={40} />
               </div>
            </div>
          )}
        </div>

        {/* SISI KANAN: FORM (Sesuai Figma) */}
        <div className="bg-[#151921] p-10 rounded-[32px] shadow-2xl border border-white/5">
          <form onSubmit={handleFinalSubmit} className="space-y-6">
            <div>
              <label className="text-sm text-gray-400 mb-2 block ml-1">Nama Lengkap</label>
              <input 
                type="text"
                className="w-full bg-[#0B0E14] border border-gray-700 rounded-2xl py-4 px-6 focus:border-[#4B6BFF] outline-none transition-all"
                placeholder="John Doe"
                value={formData.nama_lengkap}
                onChange={(e) => setFormData({...formData, nama_lengkap: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block ml-1">ID/Nomor Induk</label>
              <input 
                type="text"
                className="w-full bg-[#0B0E14] border border-gray-700 rounded-2xl py-4 px-6 focus:border-[#4B6BFF] outline-none transition-all"
                placeholder="EMP-123"
                value={formData.nim_nip}
                onChange={(e) => setFormData({...formData, nim_nip: e.target.value})}
              />
            </div>

            <button 
              type="submit"
              disabled={!isLivenessPassed || isLoading}
              className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                isLivenessPassed && !isLoading
                ? 'bg-[#4B6BFF] hover:bg-[#3A56D4] shadow-[0_0_20px_rgba(75,107,255,0.3)]' 
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? "Memproses..." : <><Camera size={22} /> Daftar Sekarang</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}