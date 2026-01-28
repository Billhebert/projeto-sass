#!/bin/bash

# Script para iniciar o servidor no WSL/Linux

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  PROJETO SASS - INICIAR                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "1️⃣ Rodando testes..."
npm test

echo ""
echo "2️⃣ Iniciando servidor..."
echo ""
NODE_ENV=test node backend/server.js

