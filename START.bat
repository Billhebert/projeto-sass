@echo off
REM Arquivo batch para iniciar o servidor no Windows PowerShell

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                  PROJETO SASS - INICIAR                      ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo 1. Rodando testes...
call npm test

echo.
echo 2. Iniciando servidor...
echo.
powershell -Command "$env:NODE_ENV = 'test'; node backend/server.js"

pause
