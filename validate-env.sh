#!/bin/bash

###############################################################################
# Validador de Variáveis de Ambiente
# 
# Função: Validar todas as variáveis de ambiente críticas da aplicação
# Uso: bash validate-env.sh
#
# Este script verifica:
# - Variáveis críticas (JWT_SECRET, MONGODB_URI, etc)
# - Variáveis importantes (FRONTEND_URL, REDIS_URL)
# - Avisos de segurança (senhas padrão, valores de desenvolvimento)
# - Sugestões de correção
###############################################################################

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ícones
CHECK='✓'
CROSS='✗'
WARNING='⚠'
INFO='ℹ'

echo -e "\n${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}   🔍 VALIDADOR DE VARIÁVEIS DE AMBIENTE - Projeto SASS   ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Verificar se arquivo .env existe
if [ ! -f "backend/.env" ]; then
  echo -e "${RED}${CROSS} ERRO: Arquivo backend/.env não encontrado!${NC}"
  echo -e "${YELLOW}${INFO} Crie o arquivo baseado em backend/.env.example${NC}\n"
  exit 1
fi

# Carregar variáveis de ambiente
set -a
source backend/.env
set +a

echo -e "${CYAN}📋 VERIFICANDO VARIÁVEIS...${NC}\n"

# Variáveis críticas
echo -e "${RED}🔴 VARIÁVEIS CRÍTICAS:${NC}"

# JWT_SECRET
if [ -n "$JWT_SECRET" ] && [ ${#JWT_SECRET} -ge 32 ]; then
  echo -e "  ${GREEN}${CHECK}${NC} JWT_SECRET: Configurado (${#JWT_SECRET} caracteres)"
else
  echo -e "  ${RED}${CROSS}${NC} JWT_SECRET: NÃO CONFIGURADO OU MUITO CURTO"
  echo -e "     ${YELLOW}${INFO} Mínimo 32 caracteres${NC}"
fi

# NODE_ENV
if [ "$NODE_ENV" = "production" ] || [ "$NODE_ENV" = "development" ] || [ "$NODE_ENV" = "staging" ]; then
  echo -e "  ${GREEN}${CHECK}${NC} NODE_ENV: $NODE_ENV"
else
  echo -e "  ${RED}${CROSS}${NC} NODE_ENV: Inválido ($NODE_ENV)"
fi

# PORT
if [[ "$PORT" =~ ^[0-9]+$ ]] && [ "$PORT" -gt 0 ] && [ "$PORT" -lt 65536 ]; then
  echo -e "  ${GREEN}${CHECK}${NC} PORT: $PORT"
else
  echo -e "  ${RED}${CROSS}${NC} PORT: Inválido ($PORT)"
fi

# MONGODB_URI
if [[ "$MONGODB_URI" == *"mongodb://"* ]]; then
  echo -e "  ${GREEN}${CHECK}${NC} MONGODB_URI: Configurada"
else
  echo -e "  ${RED}${CROSS}${NC} MONGODB_URI: Não é uma URL válida"
fi

# Variáveis importantes
echo -e "\n${YELLOW}🟠 VARIÁVEIS IMPORTANTES:${NC}"

# FRONTEND_URL
if [[ "$FRONTEND_URL" == *"http"* ]]; then
  echo -e "  ${GREEN}${CHECK}${NC} FRONTEND_URL: $FRONTEND_URL"
else
  echo -e "  ${YELLOW}${WARNING}${NC} FRONTEND_URL: Não é uma URL válida"
fi

# REDIS_URL
if [[ "$REDIS_URL" == *"redis://"* ]]; then
  echo -e "  ${GREEN}${CHECK}${NC} REDIS_URL: Configurada"
else
  echo -e "  ${YELLOW}${WARNING}${NC} REDIS_URL: Não é uma URL válida"
fi

# Verificações de segurança
echo -e "\n${BLUE}🔐 VERIFICAÇÕES DE SEGURANÇA:${NC}"

# JWT_SECRET padrão em produção
if [ "$NODE_ENV" = "production" ]; then
  if [ "$JWT_SECRET" = "dev_jwt_secret_key_change_in_production" ]; then
    echo -e "  ${RED}${CROSS}${NC} JWT_SECRET: USANDO VALOR PADRÃO EM PRODUÇÃO!"
    echo -e "     ${RED}Isso é um RISCO DE SEGURANÇA CRÍTICO!${NC}"
  else
    echo -e "  ${GREEN}${CHECK}${NC} JWT_SECRET: Valor customizado"
  fi
fi

# MongoDB credenciais padrão
if [[ "$MONGODB_URI" == *"changeme"* ]]; then
  echo -e "  ${YELLOW}${WARNING}${NC} MongoDB: Usando credenciais PADRÃO"
  echo -e "     ${YELLOW}Está OK para desenvolvimento, mas mude para produção${NC}"
else
  echo -e "  ${GREEN}${CHECK}${NC} MongoDB: Credenciais customizadas"
fi

# Redis credenciais padrão
if [[ "$REDIS_URL" == *"changeme"* ]]; then
  echo -e "  ${YELLOW}${WARNING}${NC} Redis: Usando senha PADRÃO"
  echo -e "     ${YELLOW}Está OK para desenvolvimento, mas mude para produção${NC}"
else
  echo -e "  ${GREEN}${CHECK}${NC} Redis: Senha customizada"
fi

# Resumo
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}📊 RESUMO:${NC}\n"

ERRORS=0
if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 32 ]; then
  ERRORS=$((ERRORS + 1))
fi
if [ ! "$NODE_ENV" = "production" ] && [ ! "$NODE_ENV" = "development" ] && [ ! "$NODE_ENV" = "staging" ]; then
  ERRORS=$((ERRORS + 1))
fi
if [ ! -z "$PORT" ] && ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
  ERRORS=$((ERRORS + 1))
fi
if [[ "$MONGODB_URI" != *"mongodb://"* ]]; then
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✓ Todas as variáveis críticas estão configuradas!${NC}\n"
  echo -e "${BLUE}Você pode iniciar a aplicação com:${NC}"
  echo -e "  ${CYAN}npm start${NC} (para modo desenvolvimento)"
  echo -e "  ${CYAN}docker compose up -d${NC} (para modo Docker)\n"
  exit 0
else
  echo -e "${RED}✗ Existem $ERRORS erro(s) a corrigir!${NC}\n"
  echo -e "${YELLOW}Próximos passos:${NC}"
  echo -e "  1. Editar o arquivo backend/.env"
  echo -e "  2. Configurar as variáveis faltando"
  echo -e "  3. Salvar e tentar novamente\n"
  exit 1
fi
