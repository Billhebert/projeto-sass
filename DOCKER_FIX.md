# 🔧 Docker Fix - Resetar e Reconstruir Containers

## Problema Identificado

Os containers estão com problemas:
- ❌ API unhealthy (health check falhando)
- ❌ Nginx restarting (crash loop)

## Causa

1. Health check testava porta 3011 em vez de 3000 (porta interna do container)
2. MongoDB URI e Redis URL não tinham credenciais de autenticação

## Solução

Siga esses passos **em sua máquina (não em WSL)**:

### 1. Parar todos os containers

```bash
docker compose down
```

Isso vai:
- ✅ Parar todos os containers
- ✅ Remover as instâncias
- ✅ Manter os volumes (dados persistem)

### 2. Limpar volumes (OPCIONAL - apenas se quer resetar dados)

```bash
docker compose down -v
```

**⚠️ Cuidado:** Isso deleta todos os dados no MongoDB e Redis!

### 3. Reconstruir imagem da API

```bash
docker compose build --no-cache api
```

Isso vai:
- ✅ Rebuild a imagem projeto-sass-api
- ✅ Sem cache (pega versão mais recente)
- ✅ Aplica as mudanças do backend/server.js

### 4. Iniciar todos os containers

```bash
docker compose up -d
```

Isso vai:
- ✅ Inicia MongoDB
- ✅ Inicia Redis
- ✅ Inicia API (com health check corrigido)
- ✅ Inicia Nginx (deve rodar agora)

### 5. Verificar status

```bash
docker compose ps
```

Esperado:
```
CONTAINER ID   STATUS
xxx            Up (healthy)    <- mongo
xxx            Up (healthy)    <- redis
xxx            Up                 <- api (vai ficar healthy em 30s)
xxx            Up                 <- nginx
```

## Usando em WSL

Se está no WSL, o comando `docker` pode não estar no PATH. Tente:

```bash
# No seu prompt do WSL
docker ps

# Se não funcionar, procure onde Docker está instalado
which docker
```

Se Docker Desktop está instalado no Windows, você pode usar:
```bash
# Integração Docker Desktop com WSL2
docker ps  # Deve funcionar se WSL2 está integrado
```

## Verificar Logs

Depois que containers estiverem rodando:

```bash
# Logs da API
docker logs projeto-sass-api

# Logs do Nginx
docker logs projeto-sass-nginx

# Logs em tempo real
docker logs -f projeto-sass-api
```

## Se Ainda Houver Problemas

### API continua unhealthy

1. Verifique conectividade com MongoDB:
```bash
docker exec projeto-sass-api curl http://localhost:3000/health
```

2. Verifique logs:
```bash
docker logs projeto-sass-api | tail -100
```

### Nginx continua falhando

1. Verifique se API está healthy primeiro
2. Verifique nginx.conf:
```bash
docker logs projeto-sass-nginx
```

3. Se disser "host not found in upstream", significa API não está saudável

## Reset Completo (Nuclear Option)

Se nada funcionar:

```bash
# Remove TUDO
docker compose down -v
docker system prune -a

# Remove imagem específica
docker rmi projeto-sass-api

# Rebuild do zero
docker compose build --no-cache
docker compose up -d
```

## Alternativa: Usar localhost em vez de service names

Se DNS entre containers não estiver funcionando:

1. Edite docker-compose.yml
2. Troque:
   - `mongo:27017` → `host.docker.internal:27017`
   - `redis:6379` → `host.docker.internal:6379`

Mas melhor é consertar os containers propriamente.

## Quick Reference

```bash
# Parar tudo
docker compose down

# Parar e limpar dados
docker compose down -v

# Rebuild e start
docker compose build --no-cache && docker compose up -d

# Ver status
docker compose ps

# Ver logs
docker logs projeto-sass-api
docker logs -f projeto-sass-api

# Executar comando dentro do container
docker exec projeto-sass-api curl http://localhost:3000/health
```

---

**Dúvidas?** Rode: `docker compose up -d` e verifique com `docker compose ps`
