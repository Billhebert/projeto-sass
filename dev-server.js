#!/usr/bin/env node

/**
 * Script para iniciar servidor sem problemas de caminho UNC
 * Solução para WSL + Windows
 */

const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║            🚀 Iniciando Servidor SASS (Solução WSL)           ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`);

// Verificar se estamos em desenvolvimento
const nodeEnv = process.env.NODE_ENV || 'development';
console.log(`📝 NODE_ENV: ${nodeEnv}`);
console.log(`📂 Diretório: ${process.cwd()}`);
console.log(`🔧 Node: ${process.version}`);
console.log(`📦 NPM: ${require('child_process').execSync('npm --version').toString().trim()}`);

// Verificar se backend/server.js existe
const serverPath = path.join(__dirname, 'backend', 'server.js');
if (!fs.existsSync(serverPath)) {
  console.error(`\n❌ Erro: backend/server.js não encontrado em ${serverPath}`);
  process.exit(1);
}

console.log(`\n✅ Encontrado: backend/server.js`);

// Iniciar servidor diretamente (sem nodemon para evitar problemas UNC)
console.log(`\n🔄 Iniciando servidor...\n`);

try {
  // Usar node diretamente em vez de nodemon para WSL
  if (nodeEnv === 'test') {
    // Em modo test, usar MongoDB Memory Server
    console.log('📚 Usando MongoDB Memory Server (em memória)');
    require('./backend/server.js');
  } else {
    // Em modo dev, tentar conectar a MongoDB real
    console.log('💾 Esperando conexão com MongoDB...');
    require('./backend/server.js');
  }
} catch (error) {
  console.error(`\n❌ Erro ao iniciar servidor:`);
  console.error(error.message);
  process.exit(1);
}
