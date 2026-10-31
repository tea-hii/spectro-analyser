@echo off
title Spectrogram Analyzer Server
cd /d "%~dp0"

echo ============================================================
echo   Spectrogram Analyzer - Local Web Server
echo   Dia chi: http://localhost:8000
echo ============================================================
echo.

:: Mo trinh duyet Chrome / Default browser den localhost:8000
start http://localhost:8000

:: Khoi chay server Python
python -m http.server 8000

if %errorlevel% neq 0 (
  echo Python khong co san, dang thu voi npx http-server...
  npx http-server -p 8000 -c-1
)

pause
