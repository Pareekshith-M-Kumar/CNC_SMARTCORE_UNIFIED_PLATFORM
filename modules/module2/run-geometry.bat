@echo off
title CNC SmartCore - Geometry Service (FastAPI)
echo ========================================================
echo Starting CNC SmartCore Geometry Engine on http://localhost:8000
echo ========================================================
cd /d "%~dp0geometry-service"
if exist ".venv\Scripts\python.exe" (
    call .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
) else (
    call python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
)
pause
