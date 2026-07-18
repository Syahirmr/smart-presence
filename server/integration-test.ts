import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const TEST_PORT = 4001;
const TEST_DB = 'data/test-smart-presence.db';
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

function generateDummyEmbedding(value: number): number[] {
  // face-api.js descriptors have length 128
  return Array(128).fill(value);
}

async function runTests() {
  console.log('=== STARTING INTEGRATION TESTS ===');

  // Clean up existing test DB if any
  const testDbPath = path.resolve(process.cwd(), TEST_DB);
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch {}
  }

  // Start the server in the background
  console.log(`Starting server on port ${TEST_PORT} using DB: ${TEST_DB}...`);
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const serverProcess = spawn(npxCmd, ['tsx', 'src/server.ts'], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
    DB_PATH: TEST_DB,
    JWT_SECRET: 'rahasia-negara-yang-panjang-banget',
    DEFAULT_ADMIN_USERNAME: 'Admin!234',
    DEFAULT_ADMIN_PASSWORD: 'admin123',
  },
  shell: true,
});

serverProcess.stdout.on('data', (data) => {
  console.log(`[Server stdout] ${data}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[Server stderr] ${data}`);
});

// Wait for server to bootstrap
await new Promise((resolve) => setTimeout(resolve, 6000));

let testPassed = 0;
let testFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    testPassed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    testFailed++;
  }
}

try {
  // 1. Health Check
  console.log('\n--- 1. Testing Health Check ---');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthJson = await healthRes.json();
  assert(healthRes.status === 200, 'Health check responds with 200 OK');
  assert(healthJson.success === true, 'Health check returns success true');

  // 2. Admin Login
  console.log('\n--- 2. Testing Admin Login ---');
  const loginRes = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Admin!234', password: 'admin123' }),
  });
    const loginJson: any = await loginRes.json();
    assert(loginRes.status === 200, 'Admin login responds with 200 OK');
    assert(!!loginJson.data.token, 'Admin login returns a JWT token');
    const token = loginJson.data.token;

    // 3. User Enrollment
    console.log('\n--- 3. Testing User Enrollment (F-01) ---');
    const enrollUserA = await fetch(`${BASE_URL}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nim_nip: '22123456',
        nama_lengkap: 'User A',
        embeddings: [
          generateDummyEmbedding(0.1), // Front
          generateDummyEmbedding(0.11), // Mouth
          generateDummyEmbedding(0.09), // Side
        ],
      }),
    });
    const enrollUserAJson: any = await enrollUserA.json();
    assert(enrollUserA.status === 201, 'Enroll User A succeeds with 201 Created');
    assert(enrollUserAJson.success === true, 'Enroll User A returns success true');

    // 4. Duplicate NIM/NIP Enrollment Check
    console.log('\n--- 4. Testing Duplicate NIM/NIP Enrollment Check ---');
    const enrollUserADup = await fetch(`${BASE_URL}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nim_nip: '22123456', // Same NIM
        nama_lengkap: 'Another User A',
        embeddings: [
          generateDummyEmbedding(0.5),
          generateDummyEmbedding(0.51),
          generateDummyEmbedding(0.49),
        ],
      }),
    });
    const enrollUserADupJson: any = await enrollUserADup.json();
    assert(enrollUserADup.status === 409, 'Enroll duplicate NIM responds with 409 Conflict');
    assert(enrollUserADupJson.code === 'DUPLICATE_USER', 'Error code is DUPLICATE_USER');

    // 5. Duplicate Face Enrollment Check
    console.log('\n--- 5. Testing Duplicate Face Enrollment Check ---');
    const enrollUserBSimilarFace = await fetch(`${BASE_URL}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nim_nip: '22999999',
        nama_lengkap: 'User B Duplicate Face',
        embeddings: [
          generateDummyEmbedding(0.1), // Face similar to User A
          generateDummyEmbedding(0.11),
          generateDummyEmbedding(0.09),
        ],
      }),
    });
    const enrollUserBSimilarFaceJson: any = await enrollUserBSimilarFace.json();
    assert(enrollUserBSimilarFace.status === 409, 'Enroll duplicate face responds with 409 Conflict');
    assert(enrollUserBSimilarFaceJson.code === 'FACE_ALREADY_REGISTERED', 'Error code is FACE_ALREADY_REGISTERED');

    // Enroll User B with a new face (successful)
    const enrollUserB = await fetch(`${BASE_URL}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nim_nip: '22123457',
        nama_lengkap: 'User B',
        embeddings: [
          generateDummyEmbedding(0.5),
          generateDummyEmbedding(0.51),
          generateDummyEmbedding(0.49),
        ],
      }),
    });
    assert(enrollUserB.status === 201, 'Enroll User B with different face succeeds with 201 Created');

    // 6. Face Scan Attendance (F-02)
    console.log('\n--- 6. Testing Attendance Face Scan ---');
    const scanRes1 = await fetch(`${BASE_URL}/attendance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kiosk_id: 'Test-Kiosk-1',
        faces: [
          { embedding: generateDummyEmbedding(0.1) }, // User A
        ],
      }),
    });
    const scanRes1Json: any = await scanRes1.json();
    assert(scanRes1.status === 200, 'Attendance scan responds with 200 OK');
    assert(scanRes1Json.data.results[0].status === 'HADIR', 'Scan User A status is HADIR');
    assert(scanRes1Json.data.results[0].user.nama_lengkap === 'User A', 'Scan User A maps to correct user name');

    // 7. Unknown Face Scan Check
    console.log('\n--- 7. Testing Unknown Face Scan Check ---');
    const scanResUnknown = await fetch(`${BASE_URL}/attendance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kiosk_id: 'Test-Kiosk-1',
        faces: [
          { embedding: generateDummyEmbedding(0.9) }, // Unregistered face
        ],
      }),
    });
    const scanResUnknownJson: any = await scanResUnknown.json();
    assert(scanResUnknownJson.data.results[0].status === 'UNKNOWN', 'Scan unknown face status is UNKNOWN');

    // 8. Anti-Double Cooldown (F-04)
    console.log('\n--- 8. Testing Anti-Double Cooldown (1 hour) ---');
    const scanRes2 = await fetch(`${BASE_URL}/attendance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kiosk_id: 'Test-Kiosk-1',
        faces: [
          { embedding: generateDummyEmbedding(0.1) }, // User A again
        ],
      }),
    });
    const scanRes2Json: any = await scanRes2.json();
    assert(scanRes2Json.data.results[0].status === 'DUPLICATE', 'Immediate rescanned face status is DUPLICATE');

    // 9. Admin Attendance Log List (F-03)
    console.log('\n--- 9. Testing Admin Attendance Log List (F-03) ---');
    const logsRes = await fetch(`${BASE_URL}/admin/attendance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const logsJson: any = await logsRes.json();
    assert(logsRes.status === 200, 'Get logs responds with 200 OK');
    assert(logsJson.data.logs.length > 0, 'Logs response contains logs data');

    // 10. Admin Export CSV (F-06)
    console.log('\n--- 10. Testing Admin Export CSV (F-06) ---');
    const today = new Date().toISOString().split('T')[0];
    const exportRes = await fetch(`${BASE_URL}/admin/attendance/export?date=${today}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const exportText = await exportRes.text();
    assert(exportRes.status === 200, 'Export CSV responds with 200 OK');
    assert(exportText.includes('id,user_id,nim_nip,nama_lengkap'), 'Exported CSV contains correct header');
    assert(exportText.includes('User A'), 'Exported CSV contains User A presence log');

  } catch (error) {
    console.error('Test execution failed with error:', error);
  } finally {
    // Stop the server
    console.log('\nStopping backend server process...');
    serverProcess.kill('SIGINT');

    // Wait a brief moment to ensure processes close handles on Windows
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Cleanup Test DB
    console.log('Cleaning up test SQLite database files...');
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      const walFile = `${testDbPath}-wal`;
      const shmFile = `${testDbPath}-shm`;
      if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
      if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
      console.log('Cleanup completed successfully.');
    } catch (cleanupError) {
      console.warn('Warning during database files cleanup (file might still be locked):', (cleanupError as Error).message);
    }

    console.log('\n=== INTEGRATION TEST SUMMARY ===');
    console.log(`Passed: ${testPassed}`);
    console.log(`Failed: ${testFailed}`);
    process.exit(testFailed > 0 ? 1 : 0);
  }
}

void runTests();
