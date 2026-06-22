@echo off
echo ===================================================
echo   Memulai Sistem Presensi Pintar (Smart-Presence)   
echo ===================================================

echo Menyalakan Backend Server...
start cmd /k "cd server && npm run dev"

echo Menyalakan Frontend Dashboard...
start cmd /k "cd frontend && npm run dev"

echo ===================================================
echo   Aplikasi Berhasil Diluncurkan di Terminal Baru!  
echo ===================================================
pause
