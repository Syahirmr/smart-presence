import Database from 'better-sqlite3';
import path from 'path';

// PORT di .env project lu adalah 3001
const API_URL = 'http://127.0.0.1:3001';
const DB_PATH = path.resolve(process.cwd(), 'data', 'smart-presence.db');
const db = new Database(DB_PATH);

async function runTests() {
  console.log('--- Memulai E2E Test Flow: CRUD Mahasiswa & Dashboard Stats ---');
  let adminToken = '';
  const sessionId = 'dummy-session-crud-test';

  try {
    // 1. [Setup] Insert data dummy
    console.log('\n⏳ 1. Setup: Seeding data dummy...');
    
    // Create a dummy session first to satisfy the FK constraint in attendance_logs
    db.exec(`INSERT OR IGNORE INTO sessions (id, nama_matkul, waktu_mulai, waktu_selesai, admin_id) VALUES ('${sessionId}', 'Test Matkul', '08:00', '10:00', 1)`);
    
    db.exec(`
      INSERT OR IGNORE INTO users (id, nim_nip, nama_lengkap, is_active) VALUES ('dummy-mhs-1', 'DUMMY123', 'Mahasiswa Dummy 1', 1);
      INSERT OR IGNORE INTO users (id, nim_nip, nama_lengkap, is_active) VALUES ('dummy-mhs-2', 'DUMMY456', 'Mahasiswa Dummy 2', 1);
    `);
    
    const nowISO = new Date().toISOString();
    db.exec(`
      INSERT INTO attendance_logs (user_id, session_id, waktu_hadir, confidence_score, status, kiosk_id)
      VALUES ('dummy-mhs-1', '${sessionId}', '${nowISO}', 0.99, 'HADIR', 'KIOSK-TEST'),
             ('dummy-mhs-2', '${sessionId}', '${nowISO}', 0.99, 'HADIR', 'KIOSK-TEST');
    `);
    console.log('✅ Setup Sukses. Data dummy berhasil di-insert.');

    // 2. [Test Auth] Login Admin
    console.log('\n⏳ 2. Melakukan Login Admin...');
    const loginRes = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (!loginRes.ok) throw new Error(`Login gagal! Status: ${loginRes.status}`);
    const loginData = await loginRes.json();
    adminToken = loginData.data.token;
    console.log('✅ Test Auth Sukses. Token didapatkan.');

    // 3. [Test Read Mahasiswa]
    console.log('\n⏳ 3. Test Read Mahasiswa...');
    const readRes = await fetch(`${API_URL}/api/admin/students`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!readRes.ok) throw new Error(`Read mahasiswa gagal! Status: ${readRes.status}`);
    const readData = await readRes.json();
    
    const hasDummy1 = readData.data.students.some((s: any) => s.id === 'dummy-mhs-1');
    const hasDummy2 = readData.data.students.some((s: any) => s.id === 'dummy-mhs-2');
    
    if (!hasDummy1 || !hasDummy2) {
        throw new Error('Data dummy tidak ditemukan saat Read Mahasiswa');
    }
    console.log('✅ Test Read Mahasiswa Sukses. Data dummy ditemukan.');

    // 4. [Test Update Mahasiswa]
    console.log('\n⏳ 4. Test Update Mahasiswa...');
    const updateRes = await fetch(`${API_URL}/api/admin/students/dummy-mhs-1`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}` 
      },
      body: JSON.stringify({ nama_lengkap: 'Mahasiswa Dummy 1 Updated' })
    });
    if (!updateRes.ok) throw new Error(`Update mahasiswa gagal! Status: ${updateRes.status}`);
    console.log('✅ Test Update Mahasiswa Sukses.');

    // 5. [Test Initial Stats]
    console.log('\n⏳ 5. Test Initial Stats...');
    const statsRes1 = await fetch(`${API_URL}/api/admin/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!statsRes1.ok) throw new Error(`Fetch stats gagal! Status: ${statsRes1.status}`);
    const statsData1 = await statsRes1.json();
    console.log(`✅ Test Initial Stats Sukses. Total: ${statsData1.data.total_mahasiswa}, Hadir: ${statsData1.data.hadir_hari_ini}, Alpha: ${statsData1.data.alpha}`);
    
    const initialHadir = statsData1.data.hadir_hari_ini;
    const initialTotal = statsData1.data.total_mahasiswa;

    // 6. [Test Soft Delete]
    console.log('\n⏳ 6. Test Soft Delete...');
    const deleteRes = await fetch(`${API_URL}/api/admin/students/dummy-mhs-2`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!deleteRes.ok) throw new Error(`Delete mahasiswa gagal! Status: ${deleteRes.status}`);
    console.log('✅ Test Soft Delete Sukses.');

    // 7. [Test Read After Delete]
    console.log('\n⏳ 7. Test Read After Delete...');
    const readRes2 = await fetch(`${API_URL}/api/admin/students`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const readData2 = await readRes2.json();
    const hasDummy2After = readData2.data.students.some((s: any) => s.id === 'dummy-mhs-2');
    if (hasDummy2After) {
        throw new Error('Data dummy-mhs-2 masih ada setelah di-soft delete!');
    }
    console.log('✅ Test Read After Delete Sukses. Data dummy-mhs-2 menghilang dari daftar.');

    // 8. [Test Stats After Delete (Anti-Negative Alpha)]
    console.log('\n⏳ 8. Test Stats After Delete (Anti-Negative Alpha)...');
    const statsRes2 = await fetch(`${API_URL}/api/admin/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const statsData2 = await statsRes2.json();
    
    console.log(`   Statistik Akhir - Total: ${statsData2.data.total_mahasiswa}, Hadir: ${statsData2.data.hadir_hari_ini}, Alpha: ${statsData2.data.alpha}`);
    
    if (statsData2.data.alpha < 0) {
        throw new Error(`Negative Alpha Bug terdeteksi! Alpha bernilai ${statsData2.data.alpha}`);
    }
    if (statsData2.data.total_mahasiswa >= initialTotal || statsData2.data.hadir_hari_ini >= initialHadir) {
        throw new Error('Statistik tidak berkurang setelah mahasiswa di-soft delete!');
    }
    
    console.log('✅ Test Stats After Delete Sukses. Tidak ada Negative Alpha Bug.');

  } catch (error) {
    console.error('\n❌ Test Gagal:', error);
    process.exitCode = 1;
  } finally {
    // 9. [Teardown]
    console.log('\n⏳ 9. Teardown: Membersihkan data dummy dari database...');
    try {
        db.exec(`
            DELETE FROM attendance_logs WHERE user_id IN ('dummy-mhs-1', 'dummy-mhs-2');
            DELETE FROM users WHERE id IN ('dummy-mhs-1', 'dummy-mhs-2');
            DELETE FROM sessions WHERE id = '${sessionId}';
        `);
        console.log('✅ Teardown Sukses. Data sampah sudah dibersihkan.');
    } catch (e) {
        console.error('❌ Teardown Gagal:', e);
    } finally {
        db.close();
    }
    console.log('\n🎉 E2E TEST SELESAI!');
  }
}

runTests();
