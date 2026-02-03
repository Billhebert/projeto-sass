# 🚨 QUICK REFERENCE - Erro de Conexão da API

## O Erro
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
localhost:3011/api/auth/register
```

## Solução Rápida (Copy & Paste)

### Via SSH na VPS:

```bash
cd ~/projeto-sass
git pull
bash deploy-fix.sh
```

**Pronto! Tempo: 5-10 minutos**

---

## Troubleshooting Rápido

### API não responde?
```bash
docker logs -f projeto-sass-api
```

### Testar conexão?
```bash
docker exec projeto-sass-nginx curl -v http://api:3011/health
```

### Reiniciar API?
```bash
docker-compose restart api
```

### Reiniciar tudo?
```bash
docker-compose down && sleep 5 && docker-compose up -d --build && sleep 40
```

### Ver status?
```bash
docker ps
```

---

## O que Mudou

| Arquivo | Alteração |
|---------|-----------|
| `docker-compose.yml` | Adicionado `ports: ["3011:3011"]` e `API_HOST: 0.0.0.0` |
| `nginx.conf` | Melhorado rate limiting, headers, WebSocket |
| Scripts novos | `diagnose-docker.sh`, `deploy-fix.sh`, `fix-api-connection.sh` |

---

## Verificação Pós-Implementação

```bash
# Teste 1: Conectividade interna
docker exec projeto-sass-nginx curl -v http://api:3011/health

# Teste 2: Via domínio
curl -v https://seu-dominio.com/api/health

# Teste 3: No navegador
# Abra: https://seu-dominio.com
# Abra DevTools (F12) → Network tab
# Verifique se /api/* requests têm status 200
```

---

## Comandos Úteis

```bash
# Logs em tempo real
docker logs -f projeto-sass-api

# Últimas 50 linhas
docker logs --tail=50 projeto-sass-api

# Com timestamps
docker logs --timestamps projeto-sass-api

# Todos os logs
docker logs projeto-sass-api > api.log

# Ver status de saúde
docker inspect --format='{{.State.Health.Status}}' projeto-sass-api

# Executar comando dentro do container
docker exec projeto-sass-api npm test

# Entrar no container
docker exec -it projeto-sass-api bash

# Ver variáveis de ambiente
docker exec projeto-sass-api env | sort

# Testar conectividade ao MongoDB
docker exec projeto-sass-mongo mongosh --eval "db.adminCommand('ping')"

# Testar conectividade ao Redis
docker exec projeto-sass-redis redis-cli -a changeme ping
```

---

## Situações Comuns

### Containers parados?
```bash
docker-compose restart
```

### Porta em uso?
```bash
docker-compose down
sleep 5
docker-compose up -d
```

### Mudou o código do backend?
```bash
docker-compose up -d --build api
```

### Tudo travado?
```bash
docker-compose kill
docker-compose down -v
docker-compose up -d --build
```

### Quer ver o diagnóstico completo?
```bash
bash diagnose-docker.sh
```

---

## Status

- **Antes:** ❌ API retornando `ERR_CONNECTION_REFUSED`
- **Depois:** ✅ API respondendo normalmente

---

## Dúvidas?

1. Leia `API_CONNECTION_ERROR_GUIDE.md` para guia completo
2. Leia `ERRO_CONEXAO_FIX.md` para passo-a-passo em português
3. Execute `bash diagnose-docker.sh` para diagnóstico automático
4. Execute `docker logs -f projeto-sass-api` para ver logs em tempo real

---

**Última atualização:** Feb 3, 2024
**Status:** ✅ PRONTO PARA USAR
