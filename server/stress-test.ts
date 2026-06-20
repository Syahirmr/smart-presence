import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { io } from 'socket.io-client';

const TEST_PORT = 4002;
const TEST_DB = 'data/stress-smart-presence.db';
const BASE_URL = `http://localhost:${TEST_PORT}/api`;
const WEBSOCKET_URL = `http://localhost:${TEST_PORT}`;

function generateDummyEmbedding(value: number): number[] {
  return Array(128).fill(value);
}

async function runStressTest() {
  console.log('=== STARTING WEBSOCKET & BACKEND STRESS TEST ===');

  // Clean up existing stress DB if any
  const testDbPath = path.resolve(process.cwd(), TEST_DB);
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch {}
  }

  // Start the server in the background
  console.log(`Starting server on port ${TEST_PORT} using DB: ${TEST_DB}...`);
  const serverProcess = spawn('npx', ['tsx', 'src/server.ts'], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      DB_PATH: TEST_DB,
      JWT_SECRET: 'rahasia-negara-yang-panjang-banget',
      DEFAULT_ADMIN_PASSWORD: 'admin123',
    },
    shell: true,
  });

  // Wait for server to bootstrap
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Initialize Socket.IO client
  console.log('Connecting to WebSocket server...');
  const socket = io(WEBSOCKET_URL, {
    transports: ['websocket'],
  });

  let wsEventCount = 0;
  const wsLatencies: number[] = [];
  const requestTimesMap = new Map<string, number>();

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected to server');
  });

  socket.on('new_attendance', (data: any) => {
    wsEventCount++;
    const nim = data.user.nim_nip;
    const sentTime = requestTimesMap.get(nim);
    if (sentTime) {
      const latency = Date.now() - sentTime;
      wsLatencies.push(latency);
    }
  });

  // Step 1: Enroll 100 different users to test database
  console.log('\n--- Step 1: Enrolling 100 different users ---');
  const enrollStart = Date.now();
  for (let i = 1; i <= 100; i++) {
    const idStr = String(i).padStart(3, '0');
    const res = await fetch(`${BASE_URL}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nim_nip: `22000${idStr}`,
        nama_lengkap: `Stress User ${idStr}`,
        embeddings: [
          generateDummyEmbedding(1.0 * i),
          generateDummyEmbedding(1.0 * i + 0.1),
          generateDummyEmbedding(1.0 * i - 0.1),
        ],
      }),
    });
    if (res.status !== 201) {
      console.error(`Failed to enroll user ${idStr}, status: ${res.status}`);
    }
  }
  console.log(`Enrollment completed in ${Date.now() - enrollStart}ms`);

  // Step 2: Stress Scan absensi berturut-turut dengan jeda 50ms
  console.log('\n--- Step 2: Scanning 100 users with 50ms intervals (consecutive scans) ---');
  const scanStart = Date.now();
  const requestPromises = [];

  for (let i = 1; i <= 100; i++) {
    const idStr = String(i).padStart(3, '0');
    const nim = `22000${idStr}`;
    const embeddingValue = 1.0 * i;

    // Simulasikan jeda 50ms per scan
    await new Promise((resolve) => setTimeout(resolve, 50));

    const reqPromise = (async () => {
      const timeSent = Date.now();
      requestTimesMap.set(nim, timeSent);

      try {
        const res = await fetch(`${BASE_URL}/attendance/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kiosk_id: 'Stress-Kiosk',
            faces: [{ embedding: generateDummyEmbedding(embeddingValue) }],
          }),
        });

        const json: any = await res.json();
        const duration = Date.now() - timeSent;
        const status = json.data?.results?.[0]?.status || 'FAILED';
        return { success: res.status === 200, status, duration };
      } catch (err) {
        return { success: false, status: 'ERROR', duration: 0 };
      }
    })();

    requestPromises.push(reqPromise);
  }

  // Tunggu semua request scan selesai
  const results = await Promise.all(requestPromises);
  const totalScanTime = Date.now() - scanStart;

  // Tunggu 2 detik lagi biar sisa WebSocket event masuk semua
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Step 3: Analysis & Report
  console.log('\n--- Step 3: Performance Analysis ---');

  const successfulScans = results.filter(r => r.success && r.status === 'HADIR').length;
  const totalDurations = results.reduce((acc, curr) => acc + curr.duration, 0);
  const avgResponseTime = totalDurations / results.length;

  const avgWsLatency = wsLatencies.length > 0 
    ? wsLatencies.reduce((acc, curr) => acc + curr, 0) / wsLatencies.length 
    : 0;

  console.log(`- Total Waktu Scan Beruntun (100 user): ${totalScanTime}ms`);
  console.log(`- Rata-rata jeda waktu antar scan: ~50ms`);
  console.log(`- Jumlah Scan Sukses (HADIR): ${successfulScans} / 100`);
  console.log(`- Rata-rata Waktu Respons API: ${avgResponseTime.toFixed(1)}ms`);
  console.log(`- Jumlah Event WebSocket Diterima: ${wsEventCount} / 100`);
  console.log(`- Rata-rata Latensi WebSocket (dari request dikirim sampai event diterima): ${avgWsLatency.toFixed(1)}ms`);

  const lagStatus = avgWsLatency < 500 
    ? '✅ AMAN (WebSocket 0% lag, respons di bawah 500ms)' 
    : '⚠️ LAG (WebSocket butuh waktu di atas 500ms)';
  console.log(`- Status Lag WebSocket: ${lagStatus}`);

  // Cleanup
  console.log('\nCleaning up processes...');
  socket.disconnect();
  serverProcess.kill('SIGINT');

  // Wait to release handles
  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    const walFile = `${testDbPath}-wal`;
    const shmFile = `${testDbPath}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
  } catch (err) {}

  console.log('=== STRESS TEST COMPLETED ===');
  process.exit(wsEventCount === 100 ? 0 : 1);
}

void runStressTest();
