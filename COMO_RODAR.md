# Como Rodar o Projeto - Guia Rápido

Existem **3 formas de rodar** o projeto. Escolha a que melhor se adequa ao seu caso:

## 1️⃣ Desenvolvimento Local (RECOMENDADO)

**Bancos de dados no Docker • Projeto Localmente**

Melhor para: Desenvolvimento rápido com hot-reload

```bash
# Setup inicial (executar uma vez)
# No Windows:
setup-dev.bat

# No Linux/macOS:
./setup-dev.sh

# Inicie os bancos (em um terminal)
npm run db:start

# Em outro terminal, inicie o backend
npm run dev:backend

# Em outro terminal, inicie o frontend
npm run dev:frontend

# Ou tudo junto em um terminal:
npm run dev
```

**Serviços disponíveis:**
- Backend: `http://localhost:3011`
- Frontend: `http://localhost:5173`
- MongoDB: `localhost:27017` (usuario: admin, senha: changeme)
- Redis: `localhost:6379` (senha: changeme)

**Parar tudo:**
```bash
npm run db:stop
```

**Arquivos importantes:**
- `docker-compose.dev.yml` - Compose com só bancos de dados
- `.env` - Configurações locais
- `DESENVOLVIMENTO_LOCAL.md` - Guia completo

---

## 2️⃣ Docker Completo (PRODUÇÃO/STAGING)

**Tudo no Docker • API + Frontend + Bancos**

Melhor para: Deploy, testes de produção, reproduzir ambiente real

```bash
# Build da imagem (executar quando houver mudanças no código)
docker compose build --no-cache

# Inicie tudo
docker compose up -d

# Veja os logs
docker compose logs -f

# Pare tudo
docker compose down
```

**Serviços disponíveis:**
- Frontend (Nginx): `http://localhost:80`
- Backend: `http://localhost:3011` (interno)
- Health check: `http://localhost:3011/health`
- API Docs: `http://localhost:3011/api-docs`

**Arquivos importantes:**
- `docker-compose.yml` - Compose completo
- `Dockerfile` - Build da aplicação
- `nginx.conf` - Configuração do reverse proxy
- `.env` - Configurações

---

## 3️⃣ Produção Sem Docker

**Apenas Banco de Dados • Projeto em Servidor Real**

Melhor para: Servidor dedicado, VPS, hosting tradicional

```bash
# Setup do banco de dados (em outro servidor/máquina)
docker compose -f docker-compose.dev.yml up -d

# No servidor de produção:
npm install
npm run build
npm start
```

**Arquivo de referência:**
- `DEPLOYMENT_GUIDE.md` - Guias para AWS, DigitalOcean, Heroku, etc.

---

## Comparativo

| Aspecto | Local Dev | Docker Completo | Produção |
|---------|-----------|-----------------|----------|
| **Velocidade setup** | 🟢 Rápido | 🟡 Médio | 🔴 Lento |
| **Hot-reload** | 🟢 Sim | 🔴 Não | 🔴 Não |
| **Realismo** | 🔴 Baixo | 🟢 Alto | 🟢 Máximo |
| **Reproduz bugs** | 🔴 Difícil | 🟢 Fácil | 🟢 Muito fácil |
| **Performance dev** | 🟢 Excelente | 🟡 Boa | 🟢 Excelente |
| **Requisitos** | Node.js + Docker | Docker | Node.js |
| **Ideal para** | Desenvolvimento | Testes/CI | Produção |

---

## Scripts Disponíveis

### Desenvolvimento Local

```bash
npm run dev                # Backend + Frontend juntos
npm run dev:backend        # Só Backend (nodemon)
npm run dev:frontend       # Só Frontend (Vite)

npm run db:start          # Inicia MongoDB + Redis
npm run db:stop           # Para MongoDB + Redis
npm run db:logs           # Ver logs dos bancos
npm run db:clean          # Remove volumes (limpa BD)
```

### Testing

```bash
npm test                  # Testes backend
npm run test:frontend     # Testes frontend (Vitest)
npm run test:frontend:coverage  # Coverage
npm run cypress:open      # E2E interativo
npm run cypress:run       # E2E headless
```

### Build & Deploy

```bash
npm run build             # Build frontend
npm run build:production  # Build + start backend
npm start                 # Start backend (produção)
```

### Docker

```bash
docker compose up -d      # Start tudo
docker compose down       # Stop tudo
docker compose build      # Build imagem
docker compose logs -f    # Ver logs
```

---

## Troubleshooting Rápido

### "Port 3011 already in use"
```bash
# Mude a porta em .env
PORT=3012

# Ou encontre o processo usando a porta:
lsof -i :3011  # Linux/macOS
netstat -ano | findstr :3011  # Windows
```

### "Cannot connect to MongoDB"
```bash
# Verifique se está rodando:
docker compose -f docker-compose.dev.yml ps

# Se não, inicie:
npm run db:start

# Teste a conexão:
mongosh --host localhost --username admin --password changeme
```

### "Cannot connect to Redis"
```bash
# Teste a conexão:
redis-cli -h localhost -p 6379 -a changeme ping
# Resposta esperada: PONG
```

### "Module not found"
```bash
# Reinstale dependências:
rm -rf node_modules package-lock.json
npm install

# Frontend também:
cd frontend && rm -rf node_modules && npm install
```

### "Build fails on Docker"
```bash
# Reconstrua sem cache:
docker compose build --no-cache

# Ou limpe tudo e reinicie:
docker system prune -a
docker compose down -v
docker compose up -d
```

---

## Qual Método Usar?

**Iniciando o projeto?**
→ Use **Desenvolvimento Local** (opção 1)

**Quer testar como fica em produção?**
→ Use **Docker Completo** (opção 2)

**Deployando em servidor?**
→ Use **Produção Sem Docker** (opção 3) ou docker-compose.yml

**Colaborando com equipe?**
→ Todos usem **Desenvolvimento Local** para consistência

---

## Próximas Etapas

1. Escolha o método acima
2. Siga o guia específico:
   - Local: `DESENVOLVIMENTO_LOCAL.md`
   - Docker: `DOCKER_QUICKSTART.md`
   - Produção: `DEPLOYMENT_GUIDE.md`
3. Configure o `.env` com suas credenciais
4. Inicie o projeto
5. Acesse `http://localhost:3011/health` para verificar

---

**Dúvidas?**
- 📖 Leia a documentação nos arquivos `.md`
- 🐛 Verifique o Troubleshooting acima
- 🔍 Procure por logs de erro em `docker compose logs`

**Desenvolvido com ❤️ para Projeto SASS**
