@echo off
REM Script para inicializar o projeto com bancos de dados no Docker (Windows)

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                                                                ║
echo ║  Projeto SASS - Setup Local Development                       ║
echo ║                                                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM 1. Verificar se Docker está instalado
echo [*] Verificando instalação do Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [X] Docker não está instalado!
    exit /b 1
)
echo [OK] Docker encontrado

REM 2. Verificar se Docker Compose está instalado
echo [*] Verificando instalação do Docker Compose...
docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        echo [X] Docker Compose não está instalado!
        exit /b 1
    )
)
echo [OK] Docker Compose encontrado

REM 3. Criar arquivo .env se não existir
echo [*] Verificando arquivo .env...
if not exist ".env" (
    echo [!] .env não encontrado, criando a partir de .env.example
    copy .env.example .env
    echo [OK] .env criado
) else (
    echo [OK] .env já existe
)

REM 4. Criar arquivo backend\.env se não existir
echo [*] Verificando arquivo backend\.env...
if not exist "backend\.env" (
    echo [!] backend\.env não encontrado, criando a partir de backend\.env.example
    copy backend\.env.example backend\.env
    echo [OK] backend\.env criado
) else (
    echo [OK] backend\.env já existe
)

REM 5. Iniciar bancos de dados
echo [*] Iniciando MongoDB e Redis...
docker compose -f docker-compose.dev.yml up -d mongo redis

REM 6. Aguardar saúde dos serviços
echo [*] Aguardando bancos de dados ficarem saudáveis...
timeout /t 15 /nobreak

echo [*] Verificando MongoDB...
docker exec projeto-sass-mongo mongosh --eval "db.adminCommand('ping')" >nul 2>&1
if errorlevel 0 (
    echo [OK] MongoDB está pronto
) else (
    echo [X] MongoDB não ficou pronto
    exit /b 1
)

echo [*] Verificando Redis...
docker exec projeto-sass-redis redis-cli -a changeme ping >nul 2>&1
if errorlevel 0 (
    echo [OK] Redis está pronto
) else (
    echo [X] Redis não ficou pronto
    exit /b 1
)

echo.

REM 7. Instalar dependências
echo [*] Verificando dependências do Node.js...
if not exist "node_modules\" (
    echo [!] node_modules não encontrado, instalando dependências...
    call npm install
    echo [OK] Dependências instaladas
) else (
    echo [OK] Dependências já estão instaladas
)

REM 8. Instalar dependências do frontend
echo [*] Verificando dependências do frontend...
if not exist "frontend\node_modules\" (
    echo [!] frontend\node_modules não encontrado, instalando dependências...
    cd frontend
    call npm install
    cd ..
    echo [OK] Dependências do frontend instaladas
) else (
    echo [OK] Dependências do frontend já estão instaladas
)

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                                                                ║
echo ║  Setup Completo! 🎉                                            ║
echo ║                                                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Próximos passos:
echo.
echo [*] Em um terminal, inicie o backend:
echo     npm run dev:backend
echo.
echo [*] Em outro terminal, inicie o frontend:
echo     npm run dev:frontend
echo.
echo [*] Ou inicie ambos simultaneamente:
echo     npm run dev
echo.
echo Serviços disponíveis:
echo     * Backend:  http://localhost:3011
echo     * Frontend: http://localhost:5173
echo     * Health:   http://localhost:3011/health
echo     * API Docs: http://localhost:3011/api-docs
echo     * MongoDB:  localhost:27017 (admin/changeme)
echo     * Redis:    localhost:6379 (password: changeme)
echo.
echo Para parar os bancos de dados:
echo     npm run db:stop
echo.
pause
