@echo off
title Stop Spectrogram Analyzer Server
cd /d "%~dp0"

echo Dang tim va tat server tren cong 8000...

:: Tim Process ID dang lang nghe tai port 8000 va kill no
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
  taskkill /F /PID %%a >nul 2>&1
  echo Da tat tien trinh server PID %%a thanh cong.
)

echo Hoan tat! Cong 8000 da duoc giai phong.
timeout /t 2 >nul
exit
