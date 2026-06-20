# Panduan Skenario Pengujian Manual (Manual Testing Scenarios) - Smart-Presence

Dokumen ini berisi panduan skenario pengujian manual ujung-ke-ujung (end-to-end) lengkap dengan skenario kasus batas (edge cases) yang mungkin terjadi selama pengoperasian sistem **Smart-Presence**.

---

## DAFTAR ISI
1. [Skenario 1: Persiapan Lingkungan & Uji Coba Kiosk (Webcam & Model AI)](#skenario-1-persiapan-lingkungan--uji-coba-kiosk-webcam--model-ai)
2. [Skenario 2: Pendaftaran Wajah (Face Enrollment - F-01)](#skenario-2-pendaftaran-wajah-face-enrollment---f-01)
3. [Skenario 3: Absensi / Pemindaian Wajah Kiosk (Face Scan - F-02 & F-04)](#skenario-3-absensi--pemindaian-wajah-kiosk-face-scan---f-02--f-04)
4. [Skenario 4: Autentikasi & Otorisasi Admin (Admin Security - F-05)](#skenario-4-autentikasi--otorisasi-admin-admin-security---f-05)
5. [Skenario 5: Pemantauan Real-Time Dashboard (WebSocket - F-03)](#skenario-5-pemantauan-real-time-dashboard-websocket---f-03)
6. [Skenario 6: Ekspor Data Kehadiran (CSV Export - F-06)](#skenario-6-ekspor-data-kehadiran-csv-export---f-06)
7. [Skenario 7: Audit Berkas Log Keamanan (Logs Tracking)](#skenario-7-audit-berkas-log-keamanan-logs-tracking)

---

## Skenario 1: Persiapan Lingkungan & Uji Coba Kiosk (Webcam & Model AI)

### Skenario 1.1: Memulai Server
* **Langkah Uji**:
  1. Buka terminal di direktori `/server` lalu ketik `npm run dev` untuk menyalakan backend.
  2. Buka terminal di direktori root lalu ketik `npm run dev` untuk menyalakan frontend.
* **Hasil yang Diharapkan**:
  * Backend menyala pada port 3001 (`http://localhost:3001`).
  * Database SQLite `data/smart-presence.db` terbuat otomatis jika belum ada.
  * Migrasi tabel database sukses dan Default Admin berhasil di-seed.
  * Frontend menyala pada port 5173/5174.

### Skenario 1.2: Membuka Halaman Tanpa Akses Kamera (Edge Case)
* **Langkah Uji**:
  1. Buka halaman absensi `http://localhost:5173/attendance`.
  2. Saat browser meminta izin kamera, klik **Deny/Block (Tolak)**.
* **Hasil yang Diharapkan**:
  * Area kamera tetap hitam/kosong.
  * Muncul pesan error dengan teks merah: **"Gagal memuat kamera atau model AI. Pastikan izin kamera diberikan."**
  * Tidak terjadi crash atau blank page pada aplikasi.

---

## Skenario 2: Pendaftaran Wajah (Face Enrollment - F-01)

### Skenario 2.1: Alur Sukses Liveness & Registrasi
* **Langkah Uji**:
  1. Buka halaman pendaftaran `http://localhost:5173/register` dan berikan izin akses kamera.
  2. Ikuti instruksi liveness step-by-step:
     * **Misi 1**: Hadapkan wajah lurus ke kamera (`Tatap lurus ke kamera 😐`).
     * **Misi 2**: Buka mulut lebar-lebar (`Bagus! Sekarang BUKA MULUT kamu 😮`).
     * **Misi 3**: Gelengkan/nengokkan kepala sedikit ke kiri atau kanan (`Sip! Terakhir, GELENGKAN KEPALA ke kiri/kanan 😏`).
  3. Setelah verifikasi kamera selesai, masukkan data berikut:
     * **Nama Lengkap**: `Budi Santoso`
     * **ID / Nomor Induk**: `22123456`
  4. Klik tombol **Simpan Registrasi**.
* **Hasil yang Diharapkan**:
  * Tampil status card hijau bertuliskan **"Registrasi berhasil. Data wajah berhasil disimpan ke server..."**.
  * Input form otomatis direset bersih setelah 3.5 detik, dan kamera siap untuk pendaftaran berikutnya.

### Skenario 2.2: Uji Validasi Panjang Input (Edge Case)
* **Langkah Uji**:
  1. Jalankan proses liveness kamera sampai selesai.
  2. Masukkan Nama Lengkap: `Bu` (kurang dari 3 karakter) dan ID: `22` (kurang dari 3 karakter).
  3. Klik tombol **Simpan Registrasi**.
* **Hasil yang Diharapkan**:
  * Tombol simpan dinonaktifkan jika form belum tervalidasi atau liveness belum selesai.
  * Jika diklik, sistem memvalidasi dan memunculkan error card merah: **"Nama lengkap minimal 3 karakter."** atau **"ID / Nomor Induk minimal 3 karakter."**.

### Skenario 2.3: Uji Duplikasi NIM/NIP (Edge Case)
* **Langkah Uji**:
  1. Daftarkan wajah baru dengan liveness sampai selesai.
  2. Masukkan nama berbeda: `Siti Aminah` namun dengan ID/NIM yang sama dengan Budi: `22123456`.
  3. Klik **Simpan Registrasi**.
* **Hasil yang Diharapkan**:
  * Server menolak dan memunculkan error card merah: **"ID / Nomor Induk 22123456 sudah terdaftar di sistem."** (Error HTTP 409 `DUPLICATE_USER`).

### Skenario 2.4: Uji Duplikasi Wajah / Face Similarity (Edge Case)
* **Langkah Uji**:
  1. Gunakan wajah **Budi Santoso** kembali di depan kamera liveness.
  2. Selesaikan misi liveness.
  3. Masukkan identitas baru: Nama: `Budi Duplikat`, ID: `22999999` (ID baru unik).
  4. Klik **Simpan Registrasi**.
* **Hasil yang Diharapkan**:
  * Server menghitung kemiripan wajah baru dengan data di DB. Karena wajah Budi sudah terdaftar, server menolak dan menampilkan error card merah: **"Wajah ini sudah terdaftar atas identitas lain."** (Error HTTP 409 `FACE_ALREADY_REGISTERED`).

---

## Skenario 3: Absensi / Pemindaian Wajah Kiosk (Face Scan - F-02 & F-04)

### Skenario 3.1: Absensi Wajah Terdaftar (Alur Sukses)
* **Langkah Uji**:
  1. Buka halaman absensi `http://localhost:5173/attendance`.
  2. Berdirilah di depan kamera dengan wajah Budi Santoso yang sudah terdaftar.
* **Hasil yang Diharapkan**:
  * Sistem mendeteksi wajah, garis scan biru turun naik, dan status berubah menjadi **"1 Wajah terdeteksi! Mengamankan data..."**.
  * Server memvalidasi kecocokan embeddings (threshold Cosine Similarity >= 85%).
  * Setelah berhasil cocok, area panel kanan memunculkan card hijau **"Berhasil Hadir"** dengan teks: **"Absensi sukses: Budi"**.
  * Panel riwayat kehadiran terakhir di bawah otomatis ter-update menampilkan **Budi (22123456)** beserta jam kehadiran.

### Skenario 3.2: Uji Anti-Dobel Absensi / Cooldown 60 Menit (Edge Case)
* **Langkah Uji**:
  1. Setelah absen Budi sukses di Skenario 3.1, tunggu 5 detik hingga kamera kembali ke status normal (`Sistem siap memindai`).
  2. Biarkan wajah Budi tetap menghadap ke kamera untuk memicu scan kedua kalinya.
* **Hasil yang Diharapkan**:
  * Sistem mendeteksi wajah Budi, namun server menolak pencatatan log ganda karena melanggar jeda waktu 1 jam.
  * Area status card berubah menjadi warna kuning **"Sudah Absen"** bertuliskan: **"Budi sudah melakukan absensi dalam 60 menit terakhir."** (Status `DUPLICATE`).

### Skenario 3.3: Uji Wajah Tidak Terdaftar (Edge Case)
* **Langkah Uji**:
  1. Berdirilah di depan kamera absensi dengan wajah orang lain yang belum pernah didaftarkan sama sekali.
* **Hasil yang Diharapkan**:
  * Sistem mendeteksi wajah, namun karena skor kecocokan tidak menembus batas threshold, status berubah menjadi warna merah **"TIDAK DIKENAL"** bertuliskan: **"Wajah tidak terdaftar."** (Status `UNKNOWN`).

---

## Skenario 4: Autentikasi & Otorisasi Admin (Admin Security - F-05)

### Skenario 4.1: Uji Proteksi Rute (Auth Guard)
* **Langkah Uji**:
  1. Pastikan Anda sedang dalam keadaan belum login (clear cookies/localstorage).
  2. Coba akses langsung URL dashboard riwayat absensi: `http://localhost:5173/admin/records` atau `http://localhost:5173/records`.
* **Hasil yang Diharapkan**:
  * Sistem memblokir akses ke halaman riwayat.
  * Pengguna otomatis dialihkan (redirect) ke halaman login admin di `http://localhost:5173/admin/login`.

### Skenario 4.2: Login Admin Kredensial Salah (Edge Case)
* **Langkah Uji**:
  1. Buka halaman login admin `/admin/login`.
  2. Masukkan username: `admin` dan password asal-asalan: `salahsandi123`.
  3. Tekan tombol **Masuk ke Dashboard**.
* **Hasil yang Diharapkan**:
  * Tombol berubah menampilkan spinner loading.
  * Login gagal dan muncul error merah: **"Username atau password salah."** (Error HTTP 401).

### Skenario 4.3: Login Admin Sukses (Alur Sukses)
* **Langkah Uji**:
  1. Masukkan username: `admin` dan password default sesuai env: `admin123`.
  2. Klik **Masuk ke Dashboard**.
* **Hasil yang Diharapkan**:
  * Login berhasil, token JWT tersimpan aman di local storage.
  * Halaman otomatis beralih ke `/admin/records`, menampilkan data tabel riwayat presensi, dan header menunjukkan teks **"Login sebagai admin"**.

---

## Skenario 5: Pemantauan Real-Time Dashboard (WebSocket - F-03)

### Skenario 5.1: Broadcast Absensi Real-Time & Efek Visual
* **Langkah Uji**:
  1. Buka halaman Dashboard Admin `/admin/records` di satu tab/jendela browser (pastikan sudah login).
  2. Buka halaman Kiosk Absensi `/attendance` di tab/jendela browser lainnya secara berdampingan (split screen).
  3. Lakukan absensi menggunakan wajah **Budi Santoso** di halaman Kiosk.
  4. Amati perubahan di jendela Dashboard Admin.
* **Hasil yang Diharapkan**:
  * **Tabel Ter-Update**: Baris kehadiran baru milik Budi Santoso otomatis terdaftar di paling atas tabel tanpa perlu refresh halaman web.
  * **Emerald Glow Effect**: Baris baru tersebut berkedip/menyala dengan warna hijau emerald tipis selama 3 detik sebelum memudar perlahan ke warna normal.
  * **Toast Notification**: Muncul notifikasi popup melayang di pojok kanan bawah dengan tajuk **"Presensi Masuk Real-Time"** bertuliskan: **"Budi Santoso, NIM: 22123456 | Kiosk-Utama"** lengkap dengan jam absensinya. Notifikasi ini hilang otomatis setelah 4 detik.

---

## Skenario 6: Ekspor Data Kehadiran (CSV Export - F-06)

### Skenario 6.1: Ekspor Semua Data
* **Langkah Uji**:
  1. Buka halaman Dashboard Admin `/admin/records`.
  2. Klik tombol biru **Ekspor CSV** di pojok kanan atas.
* **Hasil yang Diharapkan**:
  * Browser otomatis mengunduh file berkas CSV dengan nama dinamis seperti: `attendance_report_YYYY-MM-DD.csv`.
  * Saat file dibuka (menggunakan Excel/Notepad), datanya terbagi kolom dengan rapi: `id`, `user_id`, `nim_nip`, `nama_lengkap`, `kiosk_id`, `waktu_hadir`, `confidence_score`, `status`, `created_at`.

### Skenario 6.2: Ekspor Menggunakan Filter Tanggal (Edge Case)
* **Langkah Uji**:
  1. Pada panel kiri di bagian filter Tanggal, pilih tanggal hari ini (atau tanggal tertentu).
  2. Setelah tabel terfilter, klik tombol **Ekspor CSV**.
* **Hasil yang Diharapkan**:
  * File CSV yang terunduh hanya berisi log kehadiran milik pengguna yang absen pada tanggal tersebut saja.
  * Format nama file menyesuaikan filter tanggal: `attendance_report_YYYY-MM-DD.csv`.

---

## Skenario 7: Audit Berkas Log Keamanan (Logs Tracking)

### Skenario 7.1: Pengecekan app.log Server
* **Langkah Uji**:
  1. Setelah melakukan serangkaian aksi manual di atas (Daftar, Absen sukses, Absen duplikat, Absen unknown, Login gagal, Ekspor CSV).
  2. Buka folder `server/logs/` pada editor kode Anda.
  3. Buka file berkas `app.log`.
* **Hasil yang Diharapkan**:
  * Setiap HTTP request yang masuk tercatat per baris dalam bentuk JSON Pino log.
  * Tertera informasi waktu, metode HTTP (`POST`/`GET`), status code HTTP (200, 201, 409, 401), durasi pemrosesan (`durationMs`), dan pesan log.
  * **Keamanan Terjaga**: Cari kata kunci `embeddings` atau `faces` pada file log. Pastikan nilainya disensor menjadi `[BIOMETRIC_DATA_REDACTED]` dan tidak memunculkan data vektor wajah sensitif di dalam file log.
