@echo off
title CNC SmartCore - Frontend (Vite + React)
echo ========================================================
echo Starting CNC SmartCore Frontend on http://localhost:5173
echo ========================================================
cd /d "%~dp0frontend"
if exist "C:\Program Files\nodejs\npm.cmd" (
    call "C:\Program Files\nodejs\npm.cmd" run dev
) else (
    call npm.cmd run dev
)
pause
