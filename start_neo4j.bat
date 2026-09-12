@echo off
chcp 65001 >nul
title NexusMind - Start Neo4j Knowledge Graph Container
echo ========================================================================
echo   Starting Neo4j Graph Database Container...
echo ========================================================================
echo.

docker start nexusmind-neo4j 2>nul
if %errorlevel% neq 0 (
    echo Launching new Neo4j Community container...
    docker run -d --name nexusmind-neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/changeme -v nexusmind_neo4j_data:/data neo4j:5-community
) else (
    echo Container 'nexusmind-neo4j' started successfully.
)

echo.
echo Checking connection in 5 seconds...
timeout /t 5 >nul
echo.
python "%~dp0Code\Development\backend\check_connections.py"
pause
