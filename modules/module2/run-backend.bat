@echo off
title CNC SmartCore - Backend (Spring Boot)
echo ========================================================
echo Starting CNC SmartCore Backend on http://localhost:8080
echo ========================================================
cd /d "%~dp0backend"
set "MAVEN_CMD=%~dp0..\..\tools\apache-maven-3.10.0\bin\mvn.cmd"
if exist "%MAVEN_CMD%" (
    call "%MAVEN_CMD%" spring-boot:run "-Dspring-boot.run.profiles=local"
) else if exist "C:\Users\Greeshma M Kumar\OneDrive\Desktop\PareekshithMK\tools\apache-maven-3.10.0\bin\mvn.cmd" (
    call "C:\Users\Greeshma M Kumar\OneDrive\Desktop\PareekshithMK\tools\apache-maven-3.10.0\bin\mvn.cmd" spring-boot:run "-Dspring-boot.run.profiles=local"
) else (
    call mvn spring-boot:run "-Dspring-boot.run.profiles=local"
)
pause
