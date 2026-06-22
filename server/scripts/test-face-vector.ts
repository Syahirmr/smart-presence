import Database from 'better-sqlite3';
import path from 'path';

// PORT di .env project lu adalah 3001
const API_URL = 'http://127.0.0.1:3001';
const DB_PATH = path.resolve(process.cwd(), 'data', 'smart-presence.db');
const db = new Database(DB_PATH);

async function runTests() {
  console.log('--- Memulai E2E Test Flow: Manajemen Memori Vektor Wajah ---');
  let adminToken = '';
  const userId = 'dummy-mhs-face';

  try {
    // 1. [Setup] Insert 1 data dummy & vektor
    console.log('\n⏳ 1. Setup: Seeding data dummy mahasiswa dan vektor wajah...');
    
    db.exec(`
      INSERT OR IGNORE INTO users (id, nim_nip, nama_lengkap, is_active) 
      VALUES ('${userId}', 'FACE123', 'Mahasiswa Dummy Face', 1);
    `);
    
    const dummyEmbedding = JSON.stringify(Array.from({ length: 128 }, () => 0.5));
    db.exec(`
      INSERT INTO face_embeddings (user_id, embedding_data)
      VALUES ('${userId}', '${dummyEmbedding}');
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

    // 3. [Test Face Reset / Re-Enrollment]
    console.log('\n⏳ 3. Test Face Reset / Re-Enrollment...');
    const resetRes = await fetch(`${API_URL}/api/admin/students/${userId}/face`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (!resetRes.ok) throw new Error(`Reset Face gagal! Status: ${resetRes.status}`);
    console.log('✅ Verifikasi 1 (API Response 200): Sukses.');

    // Cek database langsung
    const faceRow = db.prepare(`SELECT * FROM face_embeddings WHERE user_id = ?`).all(userId);
    if (faceRow.length > 0) throw new Error('Vektor wajah masih ada di database setelah reset!');
    console.log('✅ Verifikasi 2 (Database - Vektor Hilang): Sukses.');

    const userRow = db.prepare(`SELECT is_active FROM users WHERE id = ?`).get(userId) as { is_active: number };
    if (!userRow || userRow.is_active !== 1) throw new Error('Data mahasiswa hilang atau is_active berubah setelah reset face!');
    console.log('✅ Verifikasi 3 (Database - Mahasiswa Tetap Aktif): Sukses.');

    // 4. [Setup Ulang Vektor]
    console.log('\n⏳ 4. Setup Ulang Vektor untuk test Soft Delete...');
    db.exec(`
      INSERT INTO face_embeddings (user_id, embedding_data)
      VALUES ('${userId}', '${dummyEmbedding}');
    `);
    console.log('✅ Setup Ulang Sukses.');

    // 5. [Test Soft Delete Atomic]
    console.log('\n⏳ 5. Test Soft Delete Atomic...');
    const deleteRes = await fetch(`${API_URL}/api/admin/students/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!deleteRes.ok) throw new Error(`Soft Delete gagal! Status: ${deleteRes.status}`);
    console.log('✅ Verifikasi 1 (API Response 200): Sukses.');

    const userRowAfterDelete = db.prepare(`SELECT is_active FROM users WHERE id = ?`).get(userId) as { is_active: number };
    if (userRowAfterDelete.is_active !== 0) throw new Error('Mahasiswa gagal di-soft delete (is_active bukan 0)!');
    console.log('✅ Verifikasi 2 (Database - is_active = 0): Sukses.');

    const faceRowAfterDelete = db.prepare(`SELECT * FROM face_embeddings WHERE user_id = ?`).all(userId);
    if (faceRowAfterDelete.length > 0) throw new Error('Vektor wajah GAGAL dihapus saat Soft Delete (db.transaction gagal)!');
    console.log('✅ Verifikasi 3 (Database - Vektor Ikut Hilang Atomic): Sukses.');

  } catch (error) {
    console.error('\n❌ Test Gagal:', error);
    process.exitCode = 1;
  } finally {
    // 6. [Teardown]
    console.log('\n⏳ 6. Teardown: Membersihkan data dummy dari database...');
    try {
        db.exec(`
            DELETE FROM face_embeddings WHERE user_id = '${userId}';
            DELETE FROM users WHERE id = '${userId}';
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
