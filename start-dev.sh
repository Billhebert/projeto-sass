#!/bin/bash

# Script para WSL: Solução para problema de caminho UNC
# Use isso em vez de: NODE_ENV=test npm run dev

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║         🚀 Iniciando Servidor SASS (Compatível WSL)          ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Definir NODE_ENV como test (usa MongoDB Memory Server)
export NODE_ENV=test

echo "📝 NODE_ENV: $NODE_ENV"
echo "📂 Diretório: $(pwd)"
echo "🔧 Node: $(node --version)"
echo "📦 NPM: $(npm --version)"
echo ""

# Iniciar servidor diretamente (contorna problema de nodemon com UNC)
echo "🔄 Iniciando servidor..."
echo "💡 MongoDB: Memory Server (automático)"
echo "🌐 URL: http://localhost:3000"
echo "💻 PID: $$"
echo ""

# Executar servidor sem nodemon
node backend/server.js
