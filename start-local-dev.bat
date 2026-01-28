@echo off
REM Script para rodar APENAS os bancos de dados no Docker
REM E deixar backend/frontend rodarem localmente

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  PROJETO SASS - Development Local (DB em Docker)          ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/3] Parando containers antigos (se houver)...
docker compose down
timeout /t 2 /nobreak

echo.
echo [2/3] Iniciando APENAS bancos de dados...
docker compose -f docker-compose.dev.yml up -d

echo.
echo [3/3] Aguardando bancos ficarem prontos...
timeout /t 10 /nobreak

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║ ✓ Bancos de dados iniciados com sucesso!                  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo PRÓXIMOS PASSOS:
echo.
echo Em um novo terminal (na pasta do projeto):
echo   npm install
echo   npm run dev:backend
echo.
echo Em outro terminal:
echo   npm run dev:frontend
echo.
echo Ou ambos juntos:
echo   npm run dev
echo.
echo ACESSAR:
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3011
echo   Health:   http://localhost:3011/health
echo.
pause
