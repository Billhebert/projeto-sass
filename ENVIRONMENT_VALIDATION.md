# 🔒 Validação de Variáveis de Ambiente

**Data:** 3 de Fevereiro de 2024  
**Status:** ✅ Implementado  
**Tempo de Implementação:** ~30 minutos

---

## 📋 Resumo Executivo

Um novo sistema de validação de variáveis de ambiente foi implementado para garantir que todas as configurações críticas estejam corretas antes do servidor iniciar.

### ✨ Principais Benefícios

- ✅ **Detecta erros cedo** - Identifica problemas antes do servidor quebrar em produção
- ✅ **Avisos de segurança** - Alerta sobre credenciais padrão e valores inseguros
- ✅ **Mensagens claras** - Indica exatamente o que está errado e como corrigir
- ✅ **Validação automática** - Roda ao iniciar o servidor em produção
- ✅ **Formatação colorida** - Fácil de ler com cores e ícones

---

## 🔍 O que é Validado

### 🔴 **Variáveis CRÍTICAS** (Devem estar configuradas)

```
1. JWT_SECRET
   └─ Mínimo 32 caracteres
   └─ Usado para assinar tokens de autenticação
   └─ NUNCA use o valor padrão em produção

2. MONGODB_URI
   └─ Deve começar com "mongodb://"
   └─ Credenciais e host do banco de dados

3. NODE_ENV
   └─ Deve ser: development, production ou staging
   └─ Define comportamento da aplicação

4. PORT
   └─ Número entre 1 e 65535
   └─ Porta em que a API escuta
```

### 🟠 **Variáveis IMPORTANTES** (Recomendado configurar)

```
1. FRONTEND_URL
   └─ URL do frontend (http:// ou https://)
   └─ Usado para CORS

2. REDIS_URL
   └─ URL do Redis para caching
   └─ Deve começar com "redis://"
```

### 🟡 **Variáveis OPCIONAIS** (Bom ter, não críticas)

```
1. ML_CLIENT_ID - ID do cliente Mercado Livre
2. ML_CLIENT_SECRET - Secret do Mercado Livre
3. Outros parâmetros de configuração
```

### 🔐 **Verificações de Segurança**

```
1. JWT_SECRET em produção - Não usar valor padrão
2. MongoDB - Avisar se usando credenciais "changeme"
3. Redis - Avisar se usando senha "changeme"
```

---

## 📁 Arquivos Criados/Modificados

### 1. **backend/config/env-validator.js** ✨ NOVO
**O quê:** Script de validação em Node.js  
**Função:** Valida todas as variáveis ao iniciar o servidor  
**Uso:** Automático - roda ao fazer `node server.js`

```bash
# Testar validação manualmente:
node backend/config/env-validator.js
```

**Saída:**
```
🔍 VALIDANDO VARIÁVEIS DE AMBIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 VARIÁVEIS CRÍTICAS:
  ✅ JWT_SECRET
  ✅ MONGODB_URI
  ✅ NODE_ENV
  ✅ PORT

🟠 VARIÁVEIS IMPORTANTES:
  ✅ FRONTEND_URL
  ✅ REDIS_URL

🟡 VARIÁVEIS OPCIONAIS:
  ✅ ML_CLIENT_ID
  ✅ ML_CLIENT_SECRET

🔐 VERIFICAÇÕES DE SEGURANÇA:
  ✅ JWT_SECRET personalizado
  ✅ MongoDB credenciais customizadas
  ⚠️  Redis usando senha PADRÃO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ VALIDAÇÃO PASSOU - Variáveis críticas OK!
```

---

### 2. **validate-env.sh** ✨ NOVO
**O quê:** Script Bash para validar variáveis  
**Função:** Valação rápida sem precisar executar Node  
**Uso:** `bash validate-env.sh`

```bash
# Exemplo de execução:
$ bash validate-env.sh

🔍 VALIDADOR DE VARIÁVEIS DE AMBIENTE - Projeto SASS

📋 VERIFICANDO VARIÁVEIS...

🔴 VARIÁVEIS CRÍTICAS:
  ✓ JWT_SECRET: Configurado (48 caracteres)
  ✓ NODE_ENV: production
  ✓ PORT: 3011
  ✓ MONGODB_URI: Configurada

🟠 VARIÁVEIS IMPORTANTES:
  ✓ FRONTEND_URL: https://vendata.com.br
  ✓ REDIS_URL: Configurada

🔐 VERIFICAÇÕES DE SEGURANÇA:
  ✓ JWT_SECRET: Valor customizado
  ✓ MongoDB: Credenciais customizadas
  ⚠ Redis: Usando senha PADRÃO

📊 RESUMO:
✓ Todas as variáveis críticas estão configuradas!

Você pode iniciar a aplicação com:
  npm start (para modo desenvolvimento)
  docker compose up -d (para modo Docker)
```

---

### 3. **backend/server.js** 📝 MODIFICADO
**O quê:** Adicionada chamada ao validador no início  
**Mudança:** 
```javascript
// Validate environment variables on startup
const { validateEnvironment } = require('./config/env-validator');
const envValidation = validateEnvironment();

if (!envValidation.success) {
  console.error('\n❌ ERRO CRÍTICO: Variáveis de ambiente inválidas!');
  process.exit(1);
}
```

---

### 4. **backend/package.json** 📝 MODIFICADO
**O quê:** Adicionada dependência `chalk`  
**Razão:** Usado para colorir output da validação

```json
"dependencies": {
  "chalk": "^4.1.2",
  ...
}
```

---

## 🚀 Como Usar

### ✅ Para Desenvolvimento Local

```bash
# 1. Verificar rápido (sem iniciar servidor)
bash validate-env.sh

# 2. Se tiver erros, editar arquivo
nano backend/.env

# 3. Iniciar servidor (rodará validação automaticamente)
cd backend
npm install
npm start
```

---

### ✅ Para Produção (Docker)

#### Opção 1: Variáveis no docker-compose.yml

```yaml
# docker-compose.yml
services:
  api:
    environment:
      - JWT_SECRET=seu_secret_muito_seguro_32_chars_aqui
      - MONGODB_URI=mongodb://user:pass@mongo:27017/projeto-sass
      - REDIS_URL=redis://:password@redis:6379
      - NODE_ENV=production
      - PORT=3011
      - FRONTEND_URL=https://seu-dominio.com.br
```

#### Opção 2: Arquivo .env.production

```bash
# 1. Criar arquivo
cat > .env.production << 'EOF'
NODE_ENV=production
JWT_SECRET=seu_secret_muito_seguro_32_chars_aqui
MONGODB_URI=mongodb://user:pass@mongo:27017/projeto-sass
REDIS_URL=redis://:password@redis:6379
PORT=3011
FRONTEND_URL=https://seu-dominio.com.br
ML_CLIENT_ID=seu_id_aqui
ML_CLIENT_SECRET=seu_secret_aqui
EOF

# 2. Deploy com arquivo
docker compose --env-file .env.production up -d
```

#### Opção 3: Deploy com validação automática

```bash
# O servidor validará automaticamente ao iniciar
# Se houver erro, o container falhará com mensagens claras:

docker compose up -d

# Ver logs com erro:
docker logs projeto-sass-api

# Exemplo de saída com erro:
# ❌ ERRO CRÍTICO: Variáveis de ambiente inválidas!
# 
# 🔴 VARIÁVEIS CRÍTICAS:
#   ❌ JWT_SECRET
#      ⚠️  JWT_SECRET deve ter no mínimo 32 caracteres
```

---

## 📊 Tabela de Variáveis

| Variável | Tipo | Obrigatório | Exemplo | Notas |
|----------|------|-------------|---------|-------|
| **JWT_SECRET** | string | ✅ SIM | `aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0u` | Min 32 chars, NUNCA publique |
| **MONGODB_URI** | URL | ✅ SIM | `mongodb://user:pass@host:27017/db` | Must start with mongodb:// |
| **NODE_ENV** | enum | ✅ SIM | `production` | production, development, staging |
| **PORT** | number | ✅ SIM | `3011` | 1-65535 |
| **FRONTEND_URL** | URL | 🟠 IMP | `https://seu-dominio.com` | For CORS, must start with http/https |
| **REDIS_URL** | URL | 🟠 IMP | `redis://:pass@host:6379` | For caching |
| **ML_CLIENT_ID** | string | 🟡 OPT | `1234567890` | Mercado Livre OAuth |
| **ML_CLIENT_SECRET** | string | 🟡 OPT | `secret_aqui` | Mercado Livre OAuth |
| **LOG_LEVEL** | string | 🟡 OPT | `debug` | debug, info, warn, error |

---

## 🔒 Segurança - Melhores Práticas

### ❌ NUNCA FAÇA

```bash
# ❌ Nunca commit .env em produção com secrets
git add .env  # NÃO FAÇA ISSO!

# ❌ Nunca use valor padrão em produção
JWT_SECRET=dev_jwt_secret_key_change_in_production  # NÃO!

# ❌ Nunca coloque secrets em código
const secret = "meu_secret_123";  // NÃO!

# ❌ Nunca use credenciais fracas
MONGODB_URI=mongodb://admin:changeme@localhost  # NÃO!
```

### ✅ SEMPRE FAÇA

```bash
# ✅ Use variáveis de ambiente
const secret = process.env.JWT_SECRET;

# ✅ Gere secrets fortes (use bash/openssl)
openssl rand -base64 32

# ✅ Adicione .env ao .gitignore
echo "backend/.env" >> .gitignore

# ✅ Use diferentes secrets em cada ambiente
# .env (desenvolvimento)
# .env.production (produção)
# .env.staging (staging)

# ✅ Documente variáveis necessárias
# Crie .env.example com valores de exemplo
```

---

## 🧪 Testando a Validação

### Teste 1: JWT_SECRET Curto

```bash
# Editar backend/.env
JWT_SECRET=short

# Executar validação
node backend/config/env-validator.js

# Resultado esperado:
# ❌ JWT_SECRET
#    ⚠️  JWT_SECRET deve ter no mínimo 32 caracteres
```

### Teste 2: MONGODB_URI Inválido

```bash
# Editar backend/.env
MONGODB_URI=localhost:27017

# Executar validação
node backend/config/env-validator.js

# Resultado esperado:
# ❌ MONGODB_URI
#    ⚠️  MONGODB_URI inválida
```

### Teste 3: Validação Bem-Sucedida

```bash
# Configurar corretamente
cat > backend/.env << 'EOF'
NODE_ENV=development
JWT_SECRET=dev_jwt_secret_key_change_in_production_super_longo
PORT=3011
MONGODB_URI=mongodb://admin:changeme@localhost:27017/projeto-sass
REDIS_URL=redis://:changeme@localhost:6379
FRONTEND_URL=http://localhost:5173
EOF

# Executar validação
node backend/config/env-validator.js

# Resultado esperado:
# ✅ VALIDAÇÃO PASSOU - Variáveis críticas OK!
```

---

## 🚨 Tratamento de Erros

### Se o servidor não iniciar com erro de validação:

1. **Leia a mensagem de erro** - Indica exatamente qual variável está errada

2. **Execute validação manual**:
   ```bash
   node backend/config/env-validator.js
   # ou
   bash validate-env.sh
   ```

3. **Corrija a variável** indicada no seu arquivo `.env`

4. **Teste novamente**

### Exemplo de Diagnóstico

```bash
$ npm start

❌ ERRO CRÍTICO: Variáveis de ambiente inválidas!

📋 ERROS CRÍTICOS A CORRIGIR:

  ❌ JWT_SECRET
     Tipo: security
     Problema: JWT_SECRET deve ter no mínimo 32 caracteres
     Valor atual: dev_secret

  ❌ MONGODB_URI
     Tipo: database
     Problema: MONGODB_URI inválida
     Valor atual: localhost:27017

Por favor, corrija os erros acima e reinicie o servidor.

# Solução:
# 1. Editar backend/.env
# 2. Configurar JWT_SECRET com 32+ caracteres
# 3. Configurar MONGODB_URI corretamente
# 4. npm start novamente
```

---

## 📚 Próximos Passos Recomendados

Após validação das variáveis de ambiente:

1. **✅ Fazer** - Testar fluxo de autenticação (1-2 horas)
2. **✅ Fazer** - Implementar envio de emails (2-3 horas)  
3. **✅ Fazer** - Configurar backups do MongoDB (1-2 horas)
4. **✅ Fazer** - Auditoria de segurança (3-4 horas)
5. **✅ Fazer** - Setup CI/CD pipeline (2-3 horas)

---

## 📖 Referências Rápidas

### Gerar JWT_SECRET Seguro

```bash
# Linux/Mac
openssl rand -base64 32

# Resultado (copiar e usar em JWT_SECRET):
# dRz5j9KpL8mN2oQ4sT6uV7wX9yA0bC1dE2fG3hI4jK5lM6nO7pQ8r

# Sem openssl, usar Node:
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### Checklist de Configuração para Produção

- [ ] JWT_SECRET configurado (min 32 chars, ÚNICO)
- [ ] MONGODB_URI com credenciais próprias
- [ ] REDIS_URL com senha própria
- [ ] NODE_ENV=production
- [ ] FRONTEND_URL apontando para domínio real
- [ ] Validação rodando sem erros
- [ ] .env adicionado ao .gitignore
- [ ] Backups do banco de dados configurados
- [ ] Logs sendo salvo e monitorado

---

## 🆘 Precisa de Ajuda?

### Erro: "JWT_SECRET deve ter no mínimo 32 caracteres"
```bash
# Solução: Gerar novo secret
openssl rand -base64 32
# Copiar resultado e adicionar em backend/.env
```

### Erro: "MONGODB_URI inválida"
```bash
# Verificar formato correto:
# ✅ mongodb://user:pass@host:port/database
# ✅ mongodb+srv://user:pass@host/database (Atlas)
```

### Erro: "REDIS_URL inválida"
```bash
# Verificar formato correto:
# ✅ redis://password@host:6379
# ✅ redis://:password@localhost:6379
```

---

## 📝 Notas Importantes

1. **Desenvolvimento vs Produção**
   - Desenvolvimento: Pode usar valores padrão (para facilitar)
   - Produção: NUNCA use valores padrão

2. **Armazenamento de Secrets**
   - Nunca commit .env em git
   - Use variáveis de ambiente no Docker/Cloud
   - Ou use serviços como AWS Secrets Manager

3. **Rotação de Secrets**
   - JWT_SECRET deve ser rotacionado periodicamente
   - Credenciais de banco devem ser únicas por ambiente
   - Use senhas fortes e aleatórias

4. **Validação Automática**
   - Roda a cada inicialização do servidor
   - Previne erros silenciosos em produção
   - Exibe mensagens claras e acionáveis

---

**Status:** ✅ Sistema de validação completamente implementado e testado  
**Próximo Passo:** Testar fluxo de autenticação completo  
**Tempo Estimado:** 30 minutos (validação) + 1-2 horas (testes)
