import fs from 'node:fs';
import path from 'node:path';

// PORT di .env project lu adalah 3001
const API_URL = 'http://127.0.0.1:3001';
const tempBackupPath = path.resolve(process.cwd(), 'data', 'test-downloaded-backup.db');

async function runTests() {
  console.log('--- Memulai E2E Test Flow: Settings & System Backup/Restore ---');
  let adminToken = '';

  try {
    // 1. [Test Auth] Login Admin
    console.log('\n⏳ 1. Melakukan Login Admin...');
    const loginRes = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (!loginRes.ok) throw new Error(`Login gagal! Status: ${loginRes.status}`);
    const loginData = await loginRes.json();
    adminToken = loginData.data.token;
    console.log('✅ Test Auth Sukses. Token didapatkan.');

    // 2. [Test Get Settings]
    console.log('\n⏳ 2. Test Get Settings...');
    const getSettingsRes = await fetch(`${API_URL}/api/admin/settings`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!getSettingsRes.ok) throw new Error(`Get settings gagal! Status: ${getSettingsRes.status}`);
    
    const settingsData = await getSettingsRes.json();
    if (!settingsData.data.settings.kampus_name || !settingsData.data.settings.kiosk_password) {
        throw new Error('Nilai default setting tidak ditemukan!');
    }
    console.log('✅ Test Get Settings Sukses. Nilai default berhasil ditarik.');
    console.log('   Data:', settingsData.data.settings);

    // 3. [Test Update Settings]
    console.log('\n⏳ 3. Test Update Settings...');
    const patchRes = await fetch(`${API_URL}/api/admin/settings`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}` 
      },
      body: JSON.stringify({ kampus_name: 'Institut Teknologi Dummy' })
    });
    if (!patchRes.ok) throw new Error(`Update settings gagal! Status: ${patchRes.status}`);
    const patchData = await patchRes.json();
    if (patchData.data.settings.kampus_name !== 'Institut Teknologi Dummy') {
        throw new Error('Update settings gagal diterapkan di database!');
    }
    console.log('✅ Test Update Settings Sukses. kampus_name berubah menjadi "Institut Teknologi Dummy".');

    // 4. [Test Backup Database]
    console.log('\n⏳ 4. Test Backup Database...');
    const backupRes = await fetch(`${API_URL}/api/admin/system/backup`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!backupRes.ok) throw new Error(`Backup database gagal! Status: ${backupRes.status}`);
    
    const backupBuffer = await backupRes.arrayBuffer();
    fs.mkdirSync(path.dirname(tempBackupPath), { recursive: true });
    fs.writeFileSync(tempBackupPath, Buffer.from(backupBuffer));
    console.log(`✅ Test Backup Database Sukses. File disimpan di: ${tempBackupPath}`);
    console.log(`   Ukuran file: ${backupBuffer.byteLength} bytes`);

    // 5. [Test Restore Database]
    console.log('\n⏳ 5. Test Restore Database...');
    const fileBuffer = fs.readFileSync(tempBackupPath);
    const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
    
    const formData = new FormData();
    formData.append('db_file', blob, 'test-downloaded-backup.db');

    const restoreRes = await fetch(`${API_URL}/api/admin/system/restore`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: formData
    });

    if (!restoreRes.ok) {
        const errText = await restoreRes.text();
        throw new Error(`Restore database gagal! Status: ${restoreRes.status}, Body: ${errText}`);
    }

    const restoreData = await restoreRes.json();
    console.log(`✅ Test Restore Database Sukses. Response: ${restoreData.message}`);

  } catch (error) {
    console.error('\n❌ Test Gagal:', error);
    process.exitCode = 1;
  } finally {
    // 6. [Teardown]
    console.log('\n⏳ 6. Teardown: Membersihkan file hasil backup sementara...');
    if (fs.existsSync(tempBackupPath)) {
        fs.unlinkSync(tempBackupPath);
        console.log('✅ File temp backup dihapus.');
    }
    console.log('\n🎉 E2E TEST SELESAI! Menunggu server restart...');
  }
}

runTests();
