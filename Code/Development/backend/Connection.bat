@echo off
chcp 65001 >nul
title NexusMind - System Connectivity ^& Storage Diagnostic Suite
cls
echo ========================================================================
echo   Launching NexusMind Connection Diagnostics...
echo ========================================================================
echo.

python "%~dp0check_connections.py"

echo.
pause
