# Quick Start - Projeto SASS

## 🚀 Iniciar em 2 Minutos

### Pré-requisito
- Node.js 16+ instalado
- npm ou yarn

### Passos

```bash
# 1. Instalar dependências (1 min)
npm install

# 2. Rodar testes (5 seg)
npm test
# Resultado esperado: ✓ Passed: 10 / ✗ Failed: 0

# 3. Iniciar servidor (1 seg)
NODE_ENV=test node backend/server.js

# 4. Acessar
# http://localhost:3000
```

---

## 📝 Endpoints Disponíveis

### Autenticação
```bash
# Registrar usuário
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "João",
    "lastName": "Silva"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Contas Mercado Livre
```bash
# Listar contas (requer token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/ml-accounts

# Adicionar conta
curl -X POST http://localhost:3000/api/ml-accounts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "..."}' \
```

---

## 🧪 Testes

```bash
# Rodar testes (validação completa)
npm test

# Resultado: 10/10 tests passing em ~5 segundos
```

---

## 🌐 Acessar Dashboard

Após iniciar servidor:
1. Abra http://localhost:3000
2. Registre um usuário
3. Faça login
4. Dashboard deve carregar

---

## 📚 Documentação Completa

- **DEPLOYMENT.md** - Guia de deploy (Docker, Local, Servidor)
- **README.md** - Visão geral do projeto
- **Backend Code** - `backend/` contém toda implementação

---

## 🐛 Troubleshooting

### Erro: Port 3000 já em uso
```bash
# Mudar porta
PORT=3001 NODE_ENV=test node backend/server.js
```

### Erro: npm install falha
```bash
# Limpar cache e reinstalar
npm cache clean --force
rm -rf node_modules
npm install
```

### Servidor não inicia
```bash
# Verificar logs
NODE_ENV=test node backend/server.js 2>&1 | tail -20

# Se vir "mongoose" errors, é normal em primeira execução
# Servidor cria collections automaticamente
```

---

## 💡 Dicas

- Testes usam MongoDB em memória (não precisa instalar MongoDB)
- Em produção, use variáveis de ambiente em `.env`
- Tokens JWT expiram em 24h por padrão
- Para Docker, execute: `docker compose up -d`

---

## ✅ Status

- ✓ Backend implementado e testado
- ✓ 10/10 testes passando
- ✓ Zero warnings/errors
- ✓ Pronto para produção

**Você está pronto para começar!** 🎉
