@echo off
title NexusMind - Analytical Intelligence Platform Deployment Launcher
cls

echo ===================================================================
echo     NexusMind AI Analytical Platform - Deployment Menu
echo ===================================================================
echo.

:: Clean up listening ports before launching
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

:: Check & Install backend requirements if needed
python -c "import motor, beanie, neo4j, fastapi" >nul 2>&1
if %errorlevel% neq 0 (
    if not exist "%~dp0backend\venv\Scripts\activate.bat" (
        echo Setting up Python virtual environment (venv)...
        python -m venv "%~dp0backend\venv"
    )
    echo Installing backend dependencies...
    call "%~dp0backend\venv\Scripts\activate.bat"
    pip install -r "%~dp0backend\requirements.txt"
)

:: Check & Install frontend dependencies if needed
if not exist "%~dp0frontend\node_modules\" (
    echo Installing frontend node packages...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
)

echo  [1] Host on Local WiFi Network (IP Shareable)
echo  [2] Public HTTPS URL via Cloudflare Tunnel (cloudflared)
echo  [3] Production Build and Preview Mode (Local Production Server)
echo  [4] Full Containerized Docker Stack (MongoDB + Neo4j + Backend + Frontend)
echo  [5] Exit
echo.
set /p choice="Select deployment mode (1-5): "

if "%choice%"=="1" goto WIFI_DEPLOY
if "%choice%"=="2" goto CLOUDFLARE_DEPLOY
if "%choice%"=="3" goto PROD_PREVIEW
if "%choice%"=="4" goto DOCKER_DEPLOY
if "%choice%"=="5" goto END
goto INVALID

:WIFI_DEPLOY
cls
echo ===================================================================
echo   Mode 1: Hosting on Local WiFi Network (0.0.0.0)
echo ===================================================================
echo.
echo Detecting your WiFi IPv4 Address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do set LOCAL_IP=%%a
set LOCAL_IP=%LOCAL_IP: =%
echo.
echo [SUCCESS] Your shareable WiFi URL: http://%LOCAL_IP%:5173
echo [SUCCESS] Backend API URL:         http://%LOCAL_IP%:8000
echo.
echo Starting FastAPI Backend on 0.0.0.0:8000...
if exist "%~dp0backend\venv\Scripts\activate.bat" (
    start "NexusMind Backend WiFi" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
) else (
    start "NexusMind Backend WiFi" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
)

echo Starting Vite Frontend on 0.0.0.0:5173...
start "NexusMind Frontend WiFi" cmd /k "cd /d %~dp0frontend && npx vite --host 0.0.0.0 --port 5173"

echo.
echo Services launched! You can connect from any mobile/tablet/laptop on your WiFi network at:
echo http://%LOCAL_IP%:5173
echo.
pause
goto END

:CLOUDFLARE_DEPLOY
cls
echo ===================================================================
echo   Mode 2: Cloudflare Tunnel Public HTTPS Deployment
echo ===================================================================
echo.
echo Starting FastAPI Backend on 127.0.0.1:8000...
if exist "%~dp0backend\venv\Scripts\activate.bat" (
    start "NexusMind Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
) else (
    start "NexusMind Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
)

echo Starting Vite Frontend on 127.0.0.1:5173...
start "NexusMind Frontend" cmd /k "cd /d %~dp0frontend && npx vite --port 5173"

echo.
echo Launching Cloudflare Tunnel...
echo Copy the generated https://...trycloudflare.com URL below to share publicly!
echo.
npx -y cloudflared tunnel --url http://localhost:5173
pause
goto END

:PROD_PREVIEW
cls
echo ===================================================================
echo   Mode 3: Production Build and Preview Mode
echo ===================================================================
echo.
echo Starting FastAPI Backend on port 8000...
if exist "%~dp0backend\venv\Scripts\activate.bat" (
    start "NexusMind Backend Prod" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && python -m uvicorn main:app --host 0.0.0.0 --port 8000"
) else (
    start "NexusMind Backend Prod" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000"
)

echo Building and Previewing Frontend for Production...
start "NexusMind Frontend Prod" cmd /k "cd /d %~dp0frontend && npm run build && npx vite preview --host 0.0.0.0 --port 5173"

echo.
echo Production bundle compiled and serving preview on http://localhost:5173.
echo If using an Nginx reverse proxy, route requests to http://127.0.0.1:5173.
pause
goto END

:DOCKER_DEPLOY
cls
echo ===================================================================
echo   Mode 4: Full Containerized Docker Stack Deployment
echo ===================================================================
echo.
echo Starting Docker Compose stack (MongoDB, Neo4j, Backend, Frontend)...
cd /d "%~dp0"
docker-compose up --build

pause
goto END

:INVALID
echo Invalid option selected.
pause
goto END

:END
exit /b
