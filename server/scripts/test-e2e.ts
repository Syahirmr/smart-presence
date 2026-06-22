import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { db } from '../src/db/sqlite.js';

// PORT di .env project lu adalah 3001, bukan 3000
// Menggunakan 127.0.0.1 untuk mencegah bug resolve IPv6 di fetch Node.js
const API_URL = 'http://127.0.0.1:3001';
let adminToken = '';
let currentSessionId = '';
const dummyUserId = 'dummy-user-e2e';
const dummyEmbedding = Array.from({ length: 128 }, () => 0.1);

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('--- Memulai E2E Test Flow: Auth & Sessions ---');

  // 0. [Setup]: Seeding data dummy agar AI bisa mengenali wajah
  console.log('\n⏳ 0. Setup: Seeding data user dummy ke database...');
  try {
    db.prepare(`
      INSERT OR IGNORE INTO users (id, nim_nip, nama_lengkap)
      VALUES (?, ?, ?)
    `).run(dummyUserId, '000000000', 'Dummy E2E User');

    db.prepare(`
      INSERT INTO face_embeddings (user_id, embedding_data)
      VALUES (?, ?)
    `).run(dummyUserId, JSON.stringify([dummyEmbedding]));
    console.log('✅ Setup Sukses. Data user dummy berhasil di-insert.');
  } catch (error) {
    console.error('❌ Setup Gagal:', error);
    process.exit(1);
  }

  // 1. [Test Auth]: Login menggunakan kredensial default admin
  console.log('\n⏳ 1. Melakukan Login Admin...');
  try {
    const loginRes = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }), // 🔥 FIXED: Kredensial sesuai dengan .env lu
    });
    
    if (!loginRes.ok) throw new Error(`Login gagal! Status: ${loginRes.status}`);
    const loginData = await loginRes.json();
    adminToken = loginData.data.token;
    console.log('✅ Test Auth Sukses. Token didapatkan.');
  } catch (error) {
    console.error('❌ Test Auth Gagal:', error);
    process.exit(1);
  }

  // 2. [Test Session Create]
  console.log('\n⏳ 2. Membuat Sesi Baru (Matkul PPL)...');
  try {
    const createRes = await fetch(`${API_URL}/api/admin/sessions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ 
        nama_matkul: 'PPL', 
        waktu_mulai: new Date().toISOString(), 
        waktu_selesai: new Date(Date.now() + 7200000).toISOString() // + 2 jam
      }),
    });

    if (!createRes.ok) throw new Error(`Create sesi gagal! Status: ${createRes.status}`);
    const createData = await createRes.json();
    currentSessionId = createData.data.id;
    console.log(`✅ Test Session Create Sukses. ID Sesi: ${currentSessionId}`);
  } catch (error) {
    console.error('❌ Test Session Create Gagal:', error);
    process.exit(1);
  }

  // 3. [Test Session Update]: Mengubah status menjadi 'active'
  console.log('\n⏳ 3. Mengubah Status Sesi menjadi "active"...');
  try {
    const updateRes = await fetch(`${API_URL}/api/admin/sessions/${currentSessionId}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'active' }),
    });

    if (!updateRes.ok) throw new Error(`Update sesi gagal! Status: ${updateRes.status}`);
    console.log('✅ Test Session Update Sukses. Sesi sekarang AKTIF.');
  } catch (error) {
    console.error('❌ Test Session Update Gagal:', error);
    process.exit(1);
  }

  // 4. [Test WebSocket - Success]: Emit Event Presensi saat sesi aktif
  console.log('\n⏳ 4. Test WebSocket (Sesi Aktif) - Mencoba emit presensi...');
  const socket: Socket = io(API_URL);

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      console.log('   🔗 WebSocket Connected');
      
      // Dummy data menggunakan global dummyEmbedding yang udah di-seeding ke database

      // Listen respons sukses
      socket.once('attendance_success', (res) => {
        console.log('✅ Test WebSocket - Success: Server berhasil merespons attendance_success', res.results.map((r: any) => r.status));
        resolve();
      });

      // Listen respons error
      socket.once('attendance_error', (err) => {
        console.error('❌ Test WebSocket Gagal (Seharusnya Sukses, tapi error):', err);
        reject(new Error(err.message));
      });

      // Emit event seperti Kiosk/Kamera
      socket.emit('process_attendance', {
        kiosk_id: 'TEST_KIOSK_1',
        faces: [{ embedding: dummyEmbedding }]
      });
    });

    socket.on('connect_error', (err) => {
      console.error('❌ WebSocket Gagal Connect:', err);
      reject(err);
    });
  });

  // Tunggu sebentar agar stabil sebelum test berikutnya
  await delay(1000);

  // 5. [Test WebSocket - Fail]: Ubah sesi jadi 'completed', lalu absen lagi
  console.log('\n⏳ 5. Test WebSocket (Sesi Non-Aktif)...');
  try {
    console.log('   Mematikan sesi (update status -> completed)...');
    await fetch(`${API_URL}/api/admin/sessions/${currentSessionId}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'completed' }),
    });

    console.log('   Mencoba emit presensi via WebSocket (Seharusnya Ditolak)...');
    await new Promise<void>((resolve, reject) => {
      socket.once('attendance_success', () => {
        console.error('❌ Test WebSocket - Fail: GAGAL! Seharusnya absensi ditolak karena sesi sudah completed, tapi server merespons success.');
        reject(new Error('Test gagal: Sesi sudah ditutup tapi absen sukses'));
      });

      socket.once('attendance_error', (err) => {
        if (err.code === 'NO_ACTIVE_SESSION') {
          console.log('✅ Test WebSocket - Fail Sukses: Server menolak absensi dengan pesan:', err.message);
          resolve();
        } else {
          console.error('❌ Test WebSocket - Fail: Server mengembalikan error lain:', err);
          reject();
        }
      });

      socket.emit('process_attendance', {
        kiosk_id: 'TEST_KIOSK_1',
        faces: [{ embedding: dummyEmbedding }]
      });
    });

  } catch (error) {
    console.error('❌ Test Sesi 5 Gagal:', error);
    socket.disconnect();
    process.exit(1);
  }

  socket.disconnect();

  // 6. [Teardown]: Membersihkan data dummy dari database
  console.log('\n⏳ 6. Teardown: Membersihkan data dummy dari database...');
  try {
    // Karena pakai ON DELETE CASCADE di migrate.ts, hapus user juga bakal hapus face_embeddings & log absensinya
    db.prepare(`DELETE FROM users WHERE id = ?`).run(dummyUserId);
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(currentSessionId);
    console.log('✅ Teardown Sukses. Data sampah sudah dibersihkan.');
  } catch (error) {
    console.error('❌ Teardown Gagal:', error);
  } finally {
    db.close();
  }

  console.log('\n🎉 SEMUA TEST SELESAI DAN SUKSES!');
  process.exit(0);
}

runTests();
