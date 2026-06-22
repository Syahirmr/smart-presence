const API_URL = 'http://127.0.0.1:3001';

async function runTests() {
  console.log('--- Memulai E2E Test Flow: System Health Monitoring ---');

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
    const adminToken = loginData.data.token;
    console.log('✅ Test Auth Sukses. Token didapatkan.');

    // 2. [Test Health Endpoint] Get System Health
    console.log('\n⏳ 2. Mengambil Metrik System Health...');
    const healthRes = await fetch(`${API_URL}/api/admin/system/health`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (!healthRes.ok) {
        const errorText = await healthRes.text();
        throw new Error(`Fetch health gagal! Status: ${healthRes.status}, Body: ${errorText}`);
    }
    const healthData = await healthRes.json();
    
    // 3. [Assertion] Memastikan struktur response valid
    const data = healthData.data;
    if (
      typeof data.uptime_seconds !== 'number' ||
      typeof data.heap_used_mb !== 'number' ||
      typeof data.heap_total_mb !== 'number' ||
      typeof data.os_free_ram_mb !== 'number'
    ) {
      throw new Error('Assertion Gagal: Properti data tidak valid atau tipe bukan number!');
    }
    
    // 4. [Logging] Menampilkan hasil dengan rapi
    console.log(`✅ Status Kesehatan Server -> Uptime: ${data.uptime_seconds}s | Heap: ${data.heap_used_mb}MB / ${data.heap_total_mb}MB | OS Free RAM: ${data.os_free_ram_mb}MB`);

  } catch (error) {
    console.error('\n❌ Test Gagal:', error);
    process.exitCode = 1;
  } finally {
    console.log('\n🎉 E2E TEST SELESAI!');
  }
}

runTests();
