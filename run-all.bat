@echo off
title CNC SmartCore Unified Platform Launcher
echo ====================================================================
echo Starting CNC SmartCore Unified Platform (All Services)
echo ====================================================================

echo [1/4] Starting Module 2 Spring Boot Backend on Port 8080...
start "CNC - Module 2 Backend (:8080)" cmd /k "powershell -NoExit -Command ""& 'C:\Users\Greeshma M Kumar\OneDrive\Desktop\PareekshithMK\tools\apache-maven-3.10.0\bin\mvn.cmd' spring-boot:run '-Dspring-boot.run.profiles=local' -f modules/module2/backend/pom.xml"""

echo [2/4] Starting Shell Gateway Dev Server on Port 5173...
start "CNC - Shell Gateway (:5173)" cmd /k "npm.cmd --prefix apps/shell run dev"

echo [3/4] Starting Module 2 Frontend on Port 5174...
start "CNC - Module 2 Frontend (:5174)" cmd /k "npm.cmd --prefix modules/module2/frontend run dev"

echo [4/4] Starting Module 1 Frontend on Port 5175...
start "CNC - Module 1 Frontend (:5175)" cmd /k "npm.cmd --prefix modules/module1/module-1-frontend run dev"

echo.
echo All services launched!
echo Waiting for servers to initialize...
timeout /t 5 /nobreak >nul

echo Opening browser at http://localhost:5173...
start http://localhost:5173

echo ====================================================================
echo CNC SmartCore is running! 
echo Browser:  http://localhost:5173
echo H2 DB:    http://localhost:8080/h2-console
echo ====================================================================
pause
