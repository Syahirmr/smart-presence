import { db } from '../src/db/sqlite.js';

async function runTests() {
  console.log('--- Memulai E2E Test Flow: SQLite Concurrency (Busy Timeout) ---');

  try {
    const startTime = performance.now();
    console.log('\n⏳ Mengeksekusi 100 operasi WRITE secara BERSAMAAN (Concurrent)...');

    // [Stress Test Engine]
    const promises = [];
    const updateStmt = db.prepare('UPDATE settings SET value = ? WHERE key = ?');

    for (let i = 0; i < 100; i++) {
      promises.push(
        new Promise<void>((resolve, reject) => {
          // Wrap di dalam setTimeout agar dilempar ke Task Queue (simulasi event loop concurrency)
          setTimeout(() => {
            try {
              updateStmt.run(Math.random().toString(), 'kampus_name');
              resolve();
            } catch (err) {
              reject(err);
            }
          }, Math.random() * 50); // Tambahkan random delay kecil agar thread rebutan koneksi
        })
      );
    }

    // [Execution] Jalankan 100 Promise secara BERSAMAAN
    await Promise.all(promises);
    
    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);
    
    // [Logging Sukses]
    console.log(`\x1b[32m✅ Uji Concurrency Sukses! 100 operasi write berhasil mengantre dan dieksekusi tanpa error SQLITE_BUSY.\x1b[0m`);
    console.log(`⏱️ Total Waktu Eksekusi: ${duration} ms`);

  } catch (error) {
    // [Assertion & Catch]
    console.error('\n❌ Test Gagal (Kemungkinan SQLITE_BUSY Database is Locked):', error);
    process.exitCode = 1;
  } finally {
    // [Teardown]
    console.log('\n⏳ Teardown: Mengembalikan nilai kampus_name...');
    try {
      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('Universitas Brawijaya', 'kampus_name');
      console.log('🎉 E2E TEST SELESAI!');
    } catch (e) {
      console.error('Gagal melakukan teardown:', e);
    }
  }
}

runTests();
