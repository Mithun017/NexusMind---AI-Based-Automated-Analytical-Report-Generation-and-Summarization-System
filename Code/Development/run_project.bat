@echo off
chcp 65001 >nul
title NexusMind - Starting Analytical Intelligence Platform...
color 0E
cls

echo ===================================================================
echo     NexusMind - AI-Based Automated Analytical Report System
echo ===================================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"

REM 1. Start Neo4j Knowledge Graph Engine via Docker (if Docker is active)
echo [1/3] Initializing Neo4j Knowledge Graph Container...
REM Free port 8000 from old external containers if present
docker stop factoryos-chromadb >nul 2>&1
docker start nexusmind-neo4j >nul 2>&1
if %errorlevel% neq 0 (
    docker run -d --name nexusmind-neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/changeme -v nexusmind_neo4j_data:/data neo4j:5-community >nul 2>&1
    if %errorlevel% equ 0 (
        echo    [OK] Neo4j container 'nexusmind-neo4j' created and running!
    ) else (
        echo    [INFO] Docker is offline or starting. Backend will run with MongoDB; start Docker anytime for Neo4j.
    )
) else (
    echo    [OK] Neo4j container 'nexusmind-neo4j' started successfully!
)
echo.

REM 2. Start FastAPI Backend
echo [2/3] Starting Backend Server (FastAPI)...
start "NexusMind - Backend" cmd /k "cd /d "%BACKEND_DIR%" && set "PYTHONPATH=%BACKEND_DIR%" && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
echo    Backend running at: http://localhost:8000
echo    API Docs at:        http://localhost:8000/docs
echo.

REM 3. Start Vite React Frontend
echo [3/3] Starting Frontend Server (React + Vite)...
start "NexusMind - Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"
echo    Frontend running at: http://localhost:5173
echo.

REM 4. Launch Default Browser
echo ===================================================================
echo    Opening NexusMind Studio in browser in 3 seconds...
echo ===================================================================
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo    ===============================================================
echo    All NexusMind Services Dispatched!
echo    - Frontend UI : http://localhost:5173
echo    - FastAPI API : http://localhost:8000
echo    - Neo4j Graph : bolt://localhost:7687 (UI: http://localhost:7474)
echo    ===============================================================
echo.
echo    Run 'Connection.bat' anytime to test end-to-end connectivity.
echo.
pause
