@echo off
REM Kill all node processes
echo Matando todos os processos Node.js...
taskkill /IM node.exe /F 2>nul
timeout /t 2 >nul

REM Kill all processes on port 3011 and 5173
echo Liberando portas 3011 e 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| find ":3011"') do taskkill /PID %%a /F 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| find ":5173"') do taskkill /PID %%a /F 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| find ":5174"') do taskkill /PID %%a /F 2>nul

timeout /t 2 >nul
echo.
echo ✓ Processos parados!
echo ✓ Portas liberadas!
echo.
echo Agora execute: npm run dev
echo.
pause
