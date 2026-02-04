# 🚨 SOLUÇÃO URGENTE - JWT_SECRET Não Configurado

**Data:** 3 de Fevereiro de 2024  
**Problema:** API container em crash loop - JWT_SECRET não configurado  
**Severidade:** 🔴 CRÍTICO - Impede deploy inteiro

---

## 🔴 O PROBLEMA

Você viu este aviso ao rodar `docker compose up -d --build`:

```
WARN[0000] The "JWT_SECRET" variable is not set. Defaulting to a blank string.
```

E agora:
```
projeto-sass-api    Restarting (1) 14 seconds ago
```

**Causa:** Sem JWT_SECRET válido, o servidor valida variáveis de ambiente e **falha na inicialização**, causando restart infinito.

---

## ✅ SOLUÇÃO RÁPIDA (1 MINUTO)

### Opção 1: Configurar no docker-compose.yml

```bash
# 1. Editar o arquivo
nano docker-compose.yml

# 2. Procurar por "api:" section e adicionar JWT_SECRET
# Localizar:
services:
  api:
    build: ./backend
    ports:
      - "3011:3011"

# Mudar para:
services:
  api:
    build: ./backend
    ports:
      - "3011:3011"
    environment:
      - JWT_SECRET=sua_secret_super_seguro_com_minimo_32_caracteres_aqui
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:changeme@mongo:27017/projeto-sass?authSource=admin
      - REDIS_URL=redis://:changeme@redis:6379
      - FRONTEND_URL=https://vendata.com.br
      - PORT=3011

# 3. Salvar (Ctrl+X, Y, Enter)

# 4. Restartear containers
docker compose down
docker compose up -d --build
```

### Opção 2: Criar arquivo .env (MELHOR)

```bash
# 1. Criar arquivo .env na raiz do projeto
cat > .env << 'EOF'
JWT_SECRET=sua_secret_super_seguro_com_minimo_32_caracteres_aleatorios_aqui
NODE_ENV=production
MONGODB_URI=mongodb://admin:changeme@mongo:27017/projeto-sass?authSource=admin
REDIS_URL=redis://:changeme@redis:6379
FRONTEND_URL=https://vendata.com.br
PORT=3011
EOF

# 2. Usar arquivo .env ao rodar
docker compose --env-file .env down
docker compose --env-file .env up -d --build

# 3. Verificar que está funcionando
docker compose logs -f projeto-sass-api
```

### Opção 3: Gerar JWT_SECRET Seguro

Se não souber como gerar um bom secret:

```bash
# Gerar um secret aleatório de 32 bytes
openssl rand -base64 32

# Exemplo de output:
# dRz5j9KpL8mN2oQ4sT6uV7wX9yA0bC1dE2fG3hI4jK5lM6nO7pQ8r

# Copiar este valor para JWT_SECRET
```

---

## 🔧 PASSO-A-PASSO NA VPS

Execute na VPS estes comandos em sequência:

```bash
# 1. Parar tudo
cd ~/projeto/projeto-sass
docker compose down

# 2. Gerar secret seguro
SECRET=$(openssl rand -base64 32)
echo "Seu JWT_SECRET: $SECRET"

# 3. Criar arquivo .env
cat > .env << EOF
JWT_SECRET=$SECRET
NODE_ENV=production
MONGODB_URI=mongodb://admin:changeme@mongo:27017/projeto-sass?authSource=admin
REDIS_URL=redis://:changeme@redis:6379
FRONTEND_URL=https://vendata.com.br
PORT=3011
EOF

# 4. Verificar que foi criado
cat .env

# 5. Reiniciar com .env
docker compose --env-file .env up -d --build

# 6. Aguardar 30 segundos

# 7. Verificar status
docker ps

# Esperado:
# projeto-sass-api    Up X seconds (healthy)

# 8. Testar API
curl https://vendata.com.br/api/health

# Esperado:
# {"status":"ok","timestamp":"..."}
```

---

## 📊 O que Vai Acontecer

### Antes (Agora):
```
WARN: JWT_SECRET variable is not set
projeto-sass-api    Restarting (1) 14 seconds ago
GET /api/ml-accounts  502 Bad Gateway
```

### Depois (Após solução):
```
✅ JWT_SECRET: Configurado (32 caracteres)
✅ NODE_ENV: production
✅ Validação PASSOU

projeto-sass-api    Up 2 minutes (healthy)
GET /api/ml-accounts  200 OK
```

---

## 🎯 QUAL OPÇÃO ESCOLHER?

| Opção | Vantagem | Desvantagem |
|-------|----------|-----------|
| **Opção 1** (docker-compose.yml) | Simples, rápido | Secret fica no git (não seguro) |
| **Opção 2** (.env file) | Seguro, profissional | Precisa passar .env-file |
| **Opção 3** (gerar secret) | Muito seguro | Requer bash/openssl |

**Recomendação:** Use **Opção 2** (arquivo .env) - é a forma profissional.

---

## 🚨 AVISO IMPORTANTE

```
⚠️  NUNCA COMMIT seu JWT_SECRET em git!

Se você usar docker-compose.yml:
  ❌ Não faça git add docker-compose.yml se tiver JWT_SECRET
  
Se você usar .env:
  ✅ Adicionar ao .gitignore:
     echo ".env" >> .gitignore
     git add .gitignore
     git commit -m "add .env to gitignore"
```

---

## 📝 Arquivo .env Completo (Referência)

```env
# ==========================================
# VARIÁVEIS DE AMBIENTE - PRODUÇÃO
# ==========================================

# Segurança
JWT_SECRET=seu_secret_aleatorio_com_32_caracteres_minimo

# Ambiente
NODE_ENV=production
PORT=3011

# Frontend
FRONTEND_URL=https://vendata.com.br

# Banco de Dados
MONGODB_URI=mongodb://admin:changeme@mongo:27017/projeto-sass?authSource=admin

# Cache
REDIS_URL=redis://:changeme@redis:6379

# Opcional - Mercado Livre
ML_CLIENT_ID=seu_client_id_aqui
ML_CLIENT_SECRET=seu_client_secret_aqui
```

---

## ✅ CHECKLIST DE RESOLUÇÃO

- [ ] Gerar ou ter um JWT_SECRET válido (min 32 chars)
- [ ] Criar arquivo .env ou adicionar ao docker-compose.yml
- [ ] Adicionar .env ao .gitignore
- [ ] Executar `docker compose --env-file .env down`
- [ ] Executar `docker compose --env-file .env up -d --build`
- [ ] Aguardar 30 segundos para containers iniciarem
- [ ] Verificar: `docker ps` (projeto-sass-api deve estar "Up")
- [ ] Testar: `curl https://vendata.com.br/api/health`
- [ ] Esperado: `{"status":"ok"}`

---

## 📞 SE TIVER DÚVIDA

### Pergunta: "Como gero um JWT_SECRET?"
**Resposta:**
```bash
openssl rand -base64 32
# Copiar output e usar como JWT_SECRET
```

### Pergunta: "Posso usar uma senha simples?"
**Resposta:** NÃO! Deve ter MÍNIMO 32 caracteres e ser aleatória.

### Pergunta: "Onde coloco o JWT_SECRET?"
**Resposta:** Em um arquivo `.env` na raiz do projeto, ou em `docker-compose.yml` na seção `environment` do serviço `api`.

### Pergunta: "E se esquecer o JWT_SECRET?"
**Resposta:** Gere um novo! Os tokens antigos não funcionarão mais, e usuários precisarão fazer login novamente.

---

## 🎯 EXECUTE AGORA

Na sua VPS, execute ESTE comando completo:

```bash
cd ~/projeto/projeto-sass && \
docker compose down && \
SECRET=$(openssl rand -base64 32) && \
cat > .env << EOF
JWT_SECRET=$SECRET
NODE_ENV=production
MONGODB_URI=mongodb://admin:changeme@mongo:27017/projeto-sass?authSource=admin
REDIS_URL=redis://:changeme@redis:6379
FRONTEND_URL=https://vendata.com.br
PORT=3011
EOF
docker compose --env-file .env up -d --build && \
echo "✅ Aguardando 30 segundos para containers iniciarem..." && \
sleep 30 && \
docker ps && \
curl https://vendata.com.br/api/health
```

**Tempo total: ~2 minutos**

---

**Status:** 🔴 CRÍTICO - Aguardando implementação da solução  
**Próximo Passo:** Execute os comandos acima  
**Documentação:** DIAGNOSTICO_502_BADGATEWAY.md tem mais detalhes
