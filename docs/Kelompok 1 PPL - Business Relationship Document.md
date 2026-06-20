**Smart-Presence: Sistem Presensi Wajah Otomatis Berbasis Edge AI**

1. **Informasi Dokumen**

	Nama Produk: Smart-Presence

Deskripsi Singkat: Sistem presensi digital berbasis *Face Recognition* (AI) dan *Distributed computing* yang beroperasi secara real-time.

Disusun oleh: Tim Pengembang

Target Pembaca: Sponsor proyek dan Tim Pengembang (Developer).

2. **Ringkasan Eksekutif**  
   Pengelolaan sumber daya manusia dan pemantauan kehadiran memegang peran krusial dalam efisiensi operasional organisasi. Pendekatan presensi konvensional maupun aplikasi *mobile* yang bergantung pada sinyal internet dan *server cloud* kerap memunculkan masalah inefisiensi, manipulasi (titip absen), dan tingginya biaya infrastruktur.  
   Smart-Presence hadir sebagai solusi inovatif yang menggeser beban komputasi AI langsung ke perangkat *Edge* (Kiosk) di jaringan lokal. Sistem ini menjembatani hubungan antara kebutuhan manajemen akan data yang valid dan seketika (*real-time*), dengan kebutuhan pengguna akan proses presensi yang instan, aman, dan tidak bergantung pada kuota internet pribadi.  
3. **Visi & Tujuan Utama Bisnis**  
   Bagian ini mendefinisikan arah strategis dan tolok ukur keberhasilan dari implementasi sistem Smart-presence.  
   1. **Visi Produk**

   Menyediakan platform presensi terpusat, efektif, dan efisien yang mengintegrasikan kecerdasan artificial (AI) dan sistem terdistribusi, guna menciptakan ekosistem pencatatan kehadiran yang 100% valid, berjalan mandiri tanpa ketergantungan internet eksternal, dan mensimulasikan praktik engineering excellence.

   2. **Tujuan Utama Bisnis**

   Keberhasilan proyek ini diukur melalui tiga tujuan utama:

1. Integrasi & AKurasi Data (Keamanan): Menghilangkan celah manipulasi kehadiran (“titip absen”) hingga 0% melalui validasi biometrik wajah (*face recognition*).  
2. Efisiensi Infrastruktur (Zero Cloud-Cost): Menekan biaya operasional langganan cloud server dan bandwith internet secara signifikan, karena sistem dan database beroperasi sepenuhnya di jaringan lokal (LAN/Wi-Fi).  
3. Peningkatan Visibilitas Manajerial: menyajikan data kehadiran secara real-time kepada Admin/Dosen tanpa jeda waktu sinkronisasi, guna mempercepat proses rekapan dan pelaporan.

4. **Pemetaan Pengguna Sistem & Stakeholders**  
   Sistem Smart-Presence berfungsi sebagai fasilitator yang menghubungkan berbagai pemangku kepentingan. Berikut adalah pemetaan peran, kebutuhan, dan hubungan antar-stakeholder:

| Kategori Stakeholder | Peran & Entitas | Kebutuhan Utama (*Needs* & *Pain Points*) | Hubungan Bisnis dengan Sistem |
| :---- | :---- | :---- | :---- |
| Sponsor / Pemilik | Manajemen Puncak (Rektorat / Direktur HR) | **Pain Point:** Laporan absensi sering tidak akurat dan lambat. **Needs:** Sistem yang meningkatkan akuntabilitas tanpa menambah biaya operasional server yang mahal. | Pendana dan pemberi mandat. Menerima jaminan keabsahan data dari sistem untuk keputusan strategis. |
| Pengelola Operasional | Admin HR / Dosen / Tata Usaha | **Pain Point:** Rekap manual memakan waktu; sulit memantau kehadiran secara langsung. **Needs:** *Dashboard* terpusat yang otomatis memperbarui data (*real-time*) dan fitur *export* ke CSV. | Bertindak sebagai pemantau utama. Sistem memberikan visibilitas instan (via WebSocket) setiap kali ada mahasiswa/karyawan yang absen. |
| Pengguna Akhir | Mahasiswa / Karyawan | **Pain Point:** Sering lupa bawa ID Card; aplikasi absen di HP sering *error* jika sinyal jelek. **Needs:** Proses absen yang instan (\< 2 detik), tanpa sentuh, dan privasi wajah terjaga. | Berinteraksi langsung dengan sistem Kiosk. Sistem memberikan *feedback* langsung (Berhasil/Gagal) tanpa menyimpan foto wajah asli di *database* pusat. |
| Pendukung Teknis | Tim IT Internal / *Deployer* | **Pain Point:** *Maintenance server cloud* yang rumit dan isu *downtime* internet. **Needs:** Sistem yang mudah di-*deploy* (misal: via Docker) dan bisa jalan di *Localhost*. | Bertanggung jawab memastikan router LAN/Wi-Fi menyala. Sistem memberikan kemudahan *setup* lokal. |

5. **Ruang lingkup Proyek**  
   Untuk memastikan kelancaran rilis (MVP) pada tenggat waktu yang ditentukan, ruang lingkup dibatasi pada parameter berikut:  
   In-Scope (Termasuk dalam sistem MVP):  
1. Self-Service Kiosk (1-2 Wajah per Frame): Pemrosesan AI Pengenalan Wajah pada sisi klien (*Edge*) dioptimalkan untuk memindai 1 hingga maksimal 2 wajah secara bersamaan pada jarak dekat guna menjaga akurasi \>95% dan mencegah beban komputasi berlebih (*overheating*) pada laptop standar.  
2. Fitur Enrollment: Pendaftaran identitas dasar dan ekstraksi wajah menjadi *face embeddings* ke dalam database lokal (SQLite).  
3. Real-Time Broadcast: Komunikasi dan sinkronisasi data seketika via WebSocket antara Kiosk (di pintu/meja) dan Server Lokal, tanpa *refresh* halaman.  
4. Dashboard Admin: Antarmuka pemantauan *live* dengan indikator kehadiran dan fitur ekspor laporan ke format CSV.  
5. Logika "Anti-Dobel Absen": Sistem menolak rekaman ganda dalam rentang waktu tertentu.

		Out-of-Scope (Tidak termasuk dalam MVP):

1. *Crowd Scanning* / Pemindaian massal seluruh ruangan kelas secara bersamaan.  
2. Pengembangan aplikasi *mobile native* yang diunduh (hanya berbasis Web/Browser).  
3. Integrasi basis data ke sistem akademik/SIAKAD atau sistem payroll pusat.  
4. Hosting aplikasi di *public cloud* (AWS, Azure, dll).

6. **Aturan Hubungan Bisnis & SLA**  
   Untuk menjaga kualitas hubungan antara pengguna dan penyedia sistem, ditetapkan aturan operasional berikut:  
1. Aturan Anti-Kecurangan (Anti-Fraud): Sistem diwajibkan memiliki *threshold similarity* (batas kecocokan wajah) yang ketat. Sistem akan lebih memilih menolak wajah yang buram/tidak yakin (*False Negative*) daripada mengizinkan orang yang salah (*False Positive*).  
2. Aturan Manajemen Sesi: Jika pengguna yang sama terdeteksi oleh Kiosk dalam rentang waktu yang berdekatan pada satu sesi (misal: jeda \< 1 jam), sistem hanya mencatatnya sebagai 1 entri kehadiran untuk mencegah *spam* data.  
3. Ekspektasi Kinerja (Performance SLA): Waktu Respons: Pemrosesan sejak wajah tertangkap kamera hingga data muncul di *Dashboard* Admin maksimal 3 detik. Ketersediaan (*Availability*): Sistem harus 100% fungsional selama jaringan *Local Area Network* (LAN) beroperasi, tanpa membutuhkan koneksi internet (Penyedia Jasa Internet/ISP).

7. **Risiko Bisnis & Asumsi**  
   1. **Asumsi Pengerjaan**

   Perangkat keras pendukung (Laptop kiosk dengan webcam standar dan laptop server) tersedia dan berada di satu jaringan LAN/Wi-Fi yang sama. Terdapat kemauan (*adoption rate*) dari target pengguna untuk beralih dari metode absensi lama ke sistem pemindai wajah.

   2. **Risiko Privasi & Mitigasi (Kepatuhan Data)**

   Kekhawatiran pengguna terhadap kebocoran foto wajah pribadi. Smart-presence tidak akan menyimpan foto (*image file*) wajah secara utuh di database setelah masa pendaftaran. Sistem hanya menyimpan face embeddings (representasi matematis berupa deret angka) yang tidak dapat direkonstruksi kembali menjadi bentuk wajah asli.