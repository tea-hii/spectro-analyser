@echo off
title Spectrogram & Musical Chord Analyzer
echo ============================================================
echo   Khoi dong Web SpectroSub PWA (Client-Side)
echo ============================================================
echo.
cd /d "%~dp0"

where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Phat hien Python, dang khoi chay local server tai port 3000...
    start "" http://localhost:3000/
    python -m http.server 3000
    goto end
)

where npx >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Phat hien Node.js, dang khoi chay npx serve...
    start "" http://localhost:3000/
    npx serve -l 3000
    goto end
)

echo [INFO] Mo truc tiep index.html tren trinh duyet mac dinh...
start "" index.html

:end
pause
