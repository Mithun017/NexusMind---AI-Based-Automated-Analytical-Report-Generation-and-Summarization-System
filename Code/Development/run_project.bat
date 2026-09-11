@echo off
title NexusMind - Starting Servers...
color 0A
cls

echo ===================================================================
echo     NexusMind - AI-Based Automated Analytical Report System
echo ===================================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"

REM 1. Start FastAPI Backend
echo [1/2] Starting Backend Server (FastAPI)...
start "NexusMind - Backend" cmd /k "cd /d "%BACKEND_DIR%" && set "PYTHONPATH=%BACKEND_DIR%" && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
echo    Backend running at: http://localhost:8000
echo    API Docs at:        http://localhost:8000/docs
echo.

REM 2. Start Vite React Frontend
echo [2/2] Starting Frontend Server (React + Vite)...
start "NexusMind - Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"
echo    Frontend running at: http://localhost:5173
echo.

REM 3. Launch Default Browser
echo ===================================================================
echo    Opening NexusMind in browser in 3 seconds...
echo ===================================================================
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo    Servers launched successfully!
echo    - Backend:  http://localhost:8000
echo    - Frontend: http://localhost:5173
echo.
echo    You can minimize or close this launcher window.
pause >nul
