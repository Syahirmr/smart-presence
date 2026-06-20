# Dokumen Skenario Uji Formal (Formal Test Cases) - Smart-Presence

Dokumen ini mendefinisikan skenario pengujian formal (Positif dan Negatif) untuk memverifikasi fungsionalitas, keamanan, ketahanan AI, dan integritas WebSocket pada sistem **Smart-Presence**.

---

## 1. Skenario Positif (Positive Scenarios)

Skenario positif memverifikasi bahwa sistem berfungsi sebagaimana mestinya ketika menerima input yang valid.

| ID Test Case | Nama Skenario | Langkah Pengujian | Input Data | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- | :--- |
| **TC-POS-01** | Admin Login Sukses | 1. Buka `/admin/login`<br>2. Masukkan username & password valid<br>3. Klik login | Username: `admin`<br>Password: `admin123` | Dialihkan ke `/admin/records`, token JWT disimpan di LocalStorage, dan nama admin tampil di header. |
| **TC-POS-02** | Registrasi Wajah Sukses (F-01) | 1. Buka `/register`<br>2. Selesaikan 3 tahap liveness<br>3. Input nama & ID unik<br>4. Klik simpan | Nama: `Ahmad Fauzi`<br>ID: `22123456`<br>Vektor Wajah: 3 sampel | Muncul pesan sukses warna hijau, form kosong kembali setelah 3.5 detik, dan data masuk ke database. |
| **TC-POS-03** | Absensi Sukses (F-02) | 1. Buka `/attendance`<br>2. Posisikan wajah di frame | Wajah: `Ahmad Fauzi` (terdaftar) | Wajah dikenali, status card menjadi hijau **"Berhasil Hadir"**, nama Ahmad Fauzi masuk ke log absensi terakhir. |
| **TC-POS-04** | Real-Time Dashboard (F-03) | 1. Buka `/admin/records` (Jendela A)<br>2. Buka `/attendance` (Jendela B)<br>3. Lakukan scan wajah sukses di Jendela B | Wajah: `Ahmad Fauzi` | Baris log baru otomatis muncul di atas tabel Jendela A tanpa refresh, berkedip hijau, dan toast notifikasi muncul. |
| **TC-POS-05** | Pencarian & Filter Logs | 1. Buka `/admin/records`<br>2. Masukkan kata kunci pencarian atau filter tanggal | Query: `"Ahmad"` atau tanggal hari ini | Tabel hanya menampilkan data log kehadiran yang cocok dengan filter secara instan. |
| **TC-POS-06** | Ekspor Laporan CSV (F-06) | 1. Buka `/admin/records`<br>2. Klik tombol "Ekspor CSV" | Parameter: Opsi filter aktif | File CSV otomatis terunduh dengan header kolom yang sesuai (`id`, `user_id`, `nim_nip`, `nama_lengkap`, dsb). |

---

## 2. Skenario Negatif & Kasus Batas (Negative & Edge Case Scenarios)

Skenario negatif memverifikasi bahwa sistem mampu menangani input salah, kondisi ekstrem, dan celah keamanan dengan aman tanpa crash.

| ID Test Case | Nama Skenario | Langkah Pengujian | Input Data | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- | :--- |
| **TC-NEG-01** | Login Sandi Salah | 1. Buka `/admin/login`<br>2. Masukkan password salah | Password: `salah123` | Login gagal, tombol loading berhenti, muncul notifikasi merah: **"Username atau password salah."** |
| **TC-NEG-02** | Proteksi Rute Admin | 1. Hapus token di LocalStorage<br>2. Buka langsung `/admin/records` | Akses URL langsung | Sistem memblokir akses dan mengalihkan paksa pengguna ke halaman login `/admin/login`. |
| **TC-NEG-03** | Validasi Form Registrasi | 1. Jalankan liveness hingga selesai<br>2. Kosongkan nama/ID atau input < 3 karakter | Nama: `"ab"`<br>ID: `""` | Tombol simpan terkunci atau muncul error card merah: **"Nama lengkap minimal 3 karakter."** |
| **TC-NEG-04** | Duplikasi NIM/NIP | 1. Selesaikan liveness<br>2. Input ID yang sudah ada di DB | ID: `22123456` (sudah terdaftar) | Server menolak dan memunculkan error merah: **"ID / Nomor Induk sudah terdaftar di sistem."** (HTTP 409). |
| **TC-NEG-05** | Duplikasi Wajah Pendaftar | 1. Selesaikan liveness dengan wajah terdaftar<br>2. Masukkan nama & ID baru | Wajah: `Ahmad Fauzi`<br>ID: `22888888` (baru) | Server menolak dan memunculkan error merah: **"Wajah ini sudah terdaftar atas identitas lain."** (HTTP 409). |
| **TC-NEG-06** | Cahaya Redup (Dim Light) | 1. Buka `/attendance`<br>2. Lakukan pemindaian di ruangan gelap gulita / redup | Wajah terdaftar dalam kondisi redup | TinyFaceDetector gagal mendeteksi landmark wajah; status tetap menunggu wajah dimasukkan ke frame. |
| **TC-NEG-07** | Silau Latar (Backlighting) | 1. Posisikan kamera membelakangi cahaya luar terang<br>2. Lakukan pemindaian | Wajah terdaftar dengan siluet cahaya latar | Landmark wajah tidak terbaca jelas; status absensi ditolak dengan label **TIDAK DIKENAL** (HTTP 200 `UNKNOWN`). |
| **TC-NEG-08** | Penggunaan Aksesoris Wajah | 1. Lakukan pemindaian wajah terdaftar dengan:<br>a. Kacamata bening<br>b. Masker diturunkan di dagu | Kondisi wajah dengan aksesoris | a. **Sukses**: Wajah langsung dikenali.<br>b. **Gagal**: Perubahan garis rahang membuat deteksi meleset (Status `UNKNOWN`). |
| **TC-NEG-09** | Wajah Tidak Terdaftar | 1. Buka `/attendance`<br>2. Lakukan pemindaian wajah baru | Wajah asing (belum pernah didaftar) | Deteksi wajah terdeteksi, namun ditolak dengan status card merah **"TIDAK DIKENAL"** (HTTP 200 `UNKNOWN`). |
| **TC-NEG-10** | Anti-Spam Cooldown | 1. Lakukan scan absensi sukses<br>2. 5 detik kemudian, lakukan scan ulang wajah yang sama | Wajah terdaftar (scan ke-2 kali) | Server menolak pencatatan berulang, status card menjadi kuning **"Sudah Absen"** (HTTP 200 `DUPLICATE`). |
| **TC-NEG-11** | Stress Test Scan Beruntun | 1. Kirim payload absensi berturut-turut dengan jeda < 2 detik secara masif | 100 request (jeda 100ms per request) | Database SQLite (WAL) memproses antrean dengan aman, WebSocket mem-broadcast tanpa bottleneck/lag. |
