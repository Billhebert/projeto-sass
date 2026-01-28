#!/usr/bin/env node

/**
 * Solução Prática: Executar Projeto SASS SEM Docker
 * Use MongoDB Memory Server (em memória)
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║        PROJETO SASS - Executar SEM Docker (Solução Prática)   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`);

console.log(`
Você tem 3 opções:

═══════════════════════════════════════════════════════════════

OPÇÃO 1: TESTES RÁPIDOS (Recomendado - 5 segundos)
─────────────────────────────────────────────────

Execute:
  $ node test-endpoints.js

Benefícios:
  ✅ Sem Docker necessário
  ✅ MongoDB em memória (rápido)
  ✅ 10 testes completos
  ✅ Valida tudo (auth, routes, validation)

═══════════════════════════════════════════════════════════════

OPÇÃO 2: SERVIDOR COM MEMORY SERVER (Desenvolvimento)
─────────────────────────────────────────────────

Execute:
  $ NODE_ENV=test npm run dev

Benefícios:
  ✅ Servidor rodando em http://localhost:3000
  ✅ Sem Docker necessário
  ✅ MongoDB em memória
  ✅ Live reload com nodemon

═══════════════════════════════════════════════════════════════

OPÇÃO 3: INSTALAR DOCKER (Produção)
─────────────────────────────────────────────────

Se quiser usar Docker:

Windows/WSL2:
  1. Instale Docker Desktop: https://docker.com/products/docker-desktop
  2. Abra Docker Desktop (pode levar 30s)
  3. Execute: docker compose up -d mongo

Linux:
  1. sudo apt-get install docker.io
  2. sudo usermod -aG docker \$USER
  3. docker compose up -d mongo

═══════════════════════════════════════════════════════════════

RECOMENDAÇÃO RÁPIDA:
─────────────────────────────────────────────────

Para testar AGORA, sem instalação:

  $ node test-endpoints.js

Isso vai:
  ✅ Iniciar MongoDB Memory Server
  ✅ Conectar ao banco
  ✅ Rodar 10 testes
  ✅ Mostrar resultados detalhados

═══════════════════════════════════════════════════════════════

`);

// Oferecer para rodar testes automaticamente
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Deseja executar os testes agora? (s/n): ', (answer) => {
  if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim') {
    rl.close();
    
    console.log(`\nIniciando testes...\n`);
    
    const { spawn } = require('child_process');
    const test = spawn('node', ['test-endpoints.js'], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    test.on('exit', (code) => {
      console.log(`\n✅ Testes finalizados com código: ${code}`);
      process.exit(code);
    });
  } else {
    rl.close();
    console.log(`\nExecute quando quiser: node test-endpoints.js`);
    process.exit(0);
  }
});
