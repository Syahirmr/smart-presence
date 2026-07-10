import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..', '..');
const outputFilePath = path.join(rootDir, 'Smart-Presence-Syahir.zip');

const output = fs.createWriteStream(outputFilePath);
const archive = archiver('zip', {
    zlib: { level: 9 } // Kompresi maksimum
});

output.on('close', function() {
    const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    // Pesan sukses berwarna hijau
    console.log(`\x1b[32m[SUKSES] File ZIP berhasil dibuat!\x1b[0m`);
    console.log(`\x1b[32mLokasi: ${outputFilePath}\x1b[0m`);
    console.log(`\x1b[32mTotal ukuran file: ${sizeMB} MB\x1b[0m`);
});

archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
        console.warn('Warning:', err);
    } else {
        throw err;
    }
});

archive.on('error', function(err) {
    throw err;
});

archive.pipe(output);

// Menambahkan semua file dengan ignore sesuai kriteria
archive.glob('**/*', {
    cwd: rootDir,
    ignore: [
        'node_modules/**',
        'server/node_modules/**',
        '.git/**',
        'dist/**',
        '.svelte-kit/**',
        '**/.env', // Mengabaikan file .env saja, bukan .env.example
        'Smart-Presence-Syahir.zip'
    ],
    dot: true // Memastikan hidden file seperti .gitignore atau .env.example terbawa
});

archive.finalize();
