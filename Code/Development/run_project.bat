@echo off
title NexusMind - Starting Analytical Intelligence Platform...
color 0B
cls

echo ===================================================================
echo     NexusMind - AI-Based Automated Analytical Report System
echo ===================================================================
echo.

set "PROJECT_DIR=%~dp0"

:: Cleanup existing processes on ports 8000 & 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

:: 1. Start Backend (FastAPI)
echo [1/2] Starting NexusMind FastAPI Backend...
cd /d "%PROJECT_DIR%backend"
if exist "venv\Scripts\activate.bat" (
    start "NexusMind - Backend" cmd /k "call venv\Scripts\activate && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
) else if exist ".venv\Scripts\activate.bat" (
    start "NexusMind - Backend" cmd /k "call .venv\Scripts\activate && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
) else (
    start "NexusMind - Backend" cmd /k "python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
)
echo    Backend running at: http://localhost:8000
echo    API Documentation:  http://localhost:8000/docs
echo.

:: 2. Start Frontend (Vite + React)
echo [2/2] Starting NexusMind React Frontend...
cd /d "%PROJECT_DIR%frontend"
start "NexusMind - Frontend" cmd /k "npm run dev"
echo    Frontend running at: http://localhost:5173
echo.

:: 3. Open Browser
echo ===================================================================
echo    Launching NexusMind in your default browser in 4 seconds...
echo ===================================================================
timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo    NexusMind is running successfully!
echo    - Press any key or close this window anytime.
echo    - Servers are running in their own separate windows.
pause >nul
