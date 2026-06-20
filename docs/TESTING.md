# Panduan Pengujian (Testing Guide) - Smart-Presence

Dokumen ini menjelaskan skema pengujian otomatis dan manual untuk memverifikasi fungsionalitas sistem **Smart-Presence** sesuai dengan spesifikasi BRD & FSD.

---

## 1. Pengujian Otomatis (Automated Integration Testing)

Kami telah membuat skrip pengujian integrasi otomatis di dalam folder `server/integration-test.ts` yang memverifikasi seluruh alur API backend menggunakan database pengujian terpisah (`data/test-smart-presence.db`).

### Fitur yang Diuji Otomatis:
1. **Health Check (`/api/health`)**: Memastikan server berjalan normal.
2. **Autentikasi Admin (`/api/admin/login`)**: Memverifikasi pembuatan token JWT menggunakan sandi default yang telah di-hash dengan bcrypt.
3. **Pendaftaran Wajah (Enrollment - `/api/enroll`)**: 
   - Berhasil mendaftarkan pengguna baru dengan 3 sampel vektor wajah (128-dimensi).
   - Menolak pendaftaran jika nomor NIM/NIP sudah digunakan (`DUPLICATE_USER`).
   - Menolak pendaftaran jika wajah yang discan mirip dengan wajah yang sudah terdaftar sebelumnya (`FACE_ALREADY_REGISTERED`).
4. **Pemindaian Wajah & Absensi (`/api/attendance/scan`)**:
   - Berhasil mengenali wajah terdaftar dan mencatat status `HADIR`.
   - Mengabaikan wajah tidak terdaftar dengan status `UNKNOWN`.
   - Mencegah absensi ganda dalam 60 menit dengan status `DUPLICATE` (Aturan Anti-Dobel).
5. **Riwayat Absensi Admin (`/api/admin/attendance`)**: Memverifikasi pengambilan logs dengan otorisasi JWT Token.
6. **Ekspor CSV (`/api/admin/attendance/export`)**: Memverifikasi pembuatan file CSV absensi berdasarkan filter tanggal tertentu.

### Cara Menjalankan Pengujian Otomatis:
Masuk ke direktori `server` dan jalankan skrip pengujian:
```bash
cd server
npx tsx integration-test.ts
```

---

## 2. Pengujian Manual (Manual Verification Flow)

Untuk memverifikasi integrasi antarmuka pengguna (Frontend) dengan server (Backend):

### Persiapan Lingkungan:
1. **Jalankan Server Backend**:
   ```bash
   cd server
   npm run dev
   ```
   *Server akan berjalan di http://localhost:3001*

2. **Jalankan Aplikasi Frontend**:
   ```bash
   # Di direktori root proyek
   npm run dev
   ```
   *Aplikasi akan berjalan di http://localhost:5173 atau http://localhost:5174*

### Skenario Uji Manual:

#### Skenario A: Pendaftaran Wajah (Register Face)
1. Buka halaman `/register`.
2. Berikan izin akses kamera pada browser.
3. Ikuti instruksi liveness:
   - **Langkah 1**: Tatap lurus ke kamera (`HADAP_DEPAN`).
   - **Langkah 2**: Buka mulut Anda lebar-lebar (`BUKA_MULUT`).
   - **Langkah 3**: Gelengkan/nengokkan kepala Anda sedikit ke kiri atau kanan (`GELENG_KEPALA`).
4. Setelah liveness selesai, masukkan **Nama Lengkap** dan **ID/Nomor Induk**, lalu tekan tombol **Simpan Registrasi**.
5. Verifikasi bahwa muncul notifikasi hijau "Registrasi Berhasil".

#### Skenario B: Uji Coba Absensi (Attendance Scanner)
1. Buka halaman `/attendance` (halaman Kiosk).
2. Posisikan wajah Anda di depan kamera.
3. Verifikasi bahwa sistem mendeteksi wajah Anda, mengirim data ke backend, dan menampilkan status hijau **Berhasil Hadir** beserta nama Anda di sebelah kanan.
4. Tunggu beberapa detik hingga kamera memindai wajah Anda untuk kedua kalinya.
5. Verifikasi bahwa status berubah menjadi kuning **Sudah Absen** ("*Nama* sudah melakukan absensi dalam 60 menit terakhir").

#### Skenario C: Dashboard Admin & Ekspor
1. Buka halaman `/admin/records` (otomatis akan dialihkan ke `/admin/login` jika belum masuk).
2. Masukkan username: `admin` dan password default (lihat `.env` backend Anda, default: `admin123`).
3. Setelah login berhasil, Anda akan diarahkan ke halaman **Riwayat Absensi**.
4. Verifikasi bahwa data absen Anda dari Skenario B telah tercatat di tabel.
5. Tekan tombol **Ekspor CSV** dan verifikasi bahwa file `.csv` terunduh dengan benar dan dapat dibuka di Excel/WPS.
