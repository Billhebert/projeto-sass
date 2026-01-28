@echo off
REM Projeto SASS - Complete Docker Setup Script (Windows)
REM This script will build frontend, clean Docker, and start services

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo    Projeto SASS - Docker Setup Script (Windows)
echo    Production Ready Full Stack Application
echo ============================================================
echo.

REM Step 1: Build Frontend
echo [1/5] Building React Frontend...
cd frontend
call npm run build > nul 2>&1
if errorlevel 1 (
    echo ✗ Frontend build failed
    exit /b 1
)
cd ..
echo ✓ Frontend built successfully
echo.

REM Step 2: Verify dist folder
echo [2/5] Verifying frontend dist folder...
if exist "frontend\dist\index.html" (
    echo ✓ Frontend dist folder exists
) else (
    echo ✗ Frontend dist folder not found
    exit /b 1
)
echo.

REM Step 3: Clean up Docker
echo [3/5] Cleaning up Docker environment...
docker compose down -v 2>nul
for /f "tokens=*" %%i in ('docker images -q projeto-sass-api 2^>nul') do docker rmi %%i 2>nul
echo ✓ Docker cleanup complete
echo.

REM Step 4: Build Docker image
echo [4/5] Building Docker image (this may take 1-2 minutes)...
docker compose build --no-cache api > nul 2>&1
if errorlevel 1 (
    echo ✗ Docker build failed
    echo Trying to build again with output:
    docker compose build --no-cache api
    exit /b 1
)
echo ✓ Docker image built successfully
echo.

REM Step 5: Start services
echo [5/5] Starting services...
docker compose up -d > nul 2>&1
timeout /t 3 /nobreak > nul

echo.
echo ============================================================
echo                  SERVICE STATUS
echo ============================================================
echo.
docker compose ps

echo.
echo ============================================================
echo                 ACCESS INFORMATION
echo ============================================================
echo.
echo Dashboard:  http://localhost
echo API Health: http://localhost/api/health
echo.

REM Wait a bit for services to stabilize
timeout /t 2 /nobreak > nul

echo ============================================================
echo                 SETUP COMPLETE! ^^!
echo ============================================================
echo.
echo Your application is running! Open http://localhost in your browser.
echo.
echo Commands:
echo   View logs:  docker compose logs api
echo   Stop:       docker compose down
echo   Restart:    docker compose restart api
echo.
pause
