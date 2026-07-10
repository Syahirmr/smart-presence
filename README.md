# 🚀 Smart-Presence: Advanced Face Recognition System

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)

## 📖 Latar Belakang Proyek
**Smart-Presence** adalah sistem presensi inovatif berbasis **Artificial Intelligence (Face Recognition)** yang dirancang khusus untuk mempercepat proses absensi mahasiswa di ruang kelas. Sistem ini menghilangkan antrean panjang dan mencegah kecurangan (titip absen) menggunakan integrasi *real-time* antara Kiosk Kamera dan Dashboard Admin.

## ✨ Fitur Utama
- **AI Face Detection & Recognition:** Ekstraksi vektor wajah akurat menggunakan `face-api.js` (Trio Model Minimalis).
- **Anti-Spoofing & Threshold Dinamis:** Konfigurasi kecerahan dan batas toleransi AI yang adaptif terhadap pencahayaan kelas.
- **Real-Time WebSocket:** Presensi langsung tersinkronisasi ke Dashboard Admin secara instan.
- **High-Concurrency Database:** Arsitektur SQLite dengan mode WAL & Busy Timeout, kebal terhadap ratusan request serentak.
- **1-Click Run:** Skrip otomatisasi peluncuran frontend & backend paralel via terminal.

## 👥 Tim Pengembang (PPL)
| Nama Lengkap | NIM | Peran |
| :--- | :--- | :--- |
| **Rifky Daffa Pratama** | `1237050095` | Project Manager |
| **Syahir Mohamad Ramdhan** | `1237050022` | Backend / DC Developer |
| **Salma Nur Oktavia** | `1237050028` | Frontend Developer |
| **Raihan Alfarizi** | `1237050001` | Backend / AI Developer |
| **Salwa Sayyidati Azkia** | `1237050005` | UI/UX Designer |
| **Sabrina** | `1237050150` | Quality Assurance |

## 🛠️ Instalasi & Cara Menjalankan

Terdapat dua metode untuk menjalankan aplikasi ini di mesin lokal Anda:

### Opsi 1: Menggunakan Git Clone (Untuk Developer)
1. Clone repositori ini ke lokal Anda:
   ```bash
   git clone [URL_REPOSITORY]
   cd advance_face_recognitiom_system-main
   ```
2. Lakukan instalasi dependencies untuk server dan frontend:
   ```bash
   cd server && npm install
   cd ../frontend && npm install
   ```
3. Jalankan aplikasi menggunakan skrip eksekusi:
   - **Windows**: Klik ganda (Double Click) file `start-app.bat`.
   - **Manual**: Buka dua terminal, jalankan `npm run dev` di direktori server dan frontend.

### Opsi 2: Dari File Ekstraksi ZIP (Untuk Dosen Penguji)
1. Ekstrak file `Smart-Presence-Syahir.zip`.
2. Buka terminal di dalam folder hasil ekstraksi.
3. Masuk ke folder `server` dan `frontend` masing-masing, lalu jalankan perintah `npm install` untuk mengunduh modul yang dibutuhkan.
4. Klik ganda file `start-app.bat` untuk menyalakan Backend dan Frontend secara bersamaan.

---
*Dibuat untuk memenuhi Tugas UAS Mata Kuliah Proyek Perangkat Lunak (PPL) - 2026*
