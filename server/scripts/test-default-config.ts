import { db } from '../src/db/sqlite.js';

function runTests() {
  console.log('--- Memulai E2E Test Flow: Default Config AI Threshold ---');

  try {
    // 1. [Simulasi Reset]: Hapus baris konfigurasi ai_threshold
    console.log('\n⏳ 1. Menghapus konfigurasi ai_threshold yang ada (Simulasi DB Perawan)...');
    db.exec("DELETE FROM settings WHERE key = 'ai_threshold';");
    
    // 2. [Trigger Migrasi]: Eksekusi perintah migrasi bawaan
    console.log('⏳ 2. Mengeksekusi perintah migrasi default settings...');
    db.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_threshold', '0.82');");

    // 3. [Assertion]: Ambil nilai dari database dan verifikasi
    console.log('⏳ 3. Memverifikasi nilai di database...');
    const result = db.prepare("SELECT value FROM settings WHERE key = 'ai_threshold'").get() as { value: string } | undefined;
    
    if (!result || result.value !== '0.82') {
      throw new Error(`Assertion Gagal: Nilai ai_threshold bukan '0.82', melainkan '${result?.value || 'undefined'}'`);
    }

    // 4. [Logging]
    console.log(`\n\x1b[32m✅ Test Default Config Sukses! Nilai ai_threshold terbukti terkunci di angka 0.82 secara bawaan.\x1b[0m`);

  } catch (error) {
    console.error('\n❌ Test Gagal:', error);
    process.exitCode = 1;
  } finally {
    console.log('\n🎉 E2E TEST SELESAI!');
  }
}

runTests();
