@echo off
title CNC SmartCore - All Services Launcher
echo =========================================================================
echo   Starting CNC SmartCore Module 2 Pre-Manufacturing Platform
echo =========================================================================
echo.
echo Launching:
echo   1. Backend API (Spring Boot)        on http://localhost:8080
echo   2. Geometry Service (Python FastAPI) on http://localhost:8000
echo   3. Web Application (React Vite)     on http://localhost:5173
echo.
cd /d "%~dp0"
start "CNC - Backend API" cmd.exe /k "run-backend.bat"
start "CNC - Geometry Service" cmd.exe /k "run-geometry.bat"
start "CNC - Frontend App" cmd.exe /k "run-frontend.bat"

echo All 3 services are launching in separate windows.
echo Once ready, navigate to: http://localhost:5173
echo.
ping -n 5 127.0.0.1 >nul
