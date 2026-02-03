# 🚀 GUIA PASSO-A-PASSO: Fixar Erro de Conexão da API

## Seu Erro
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
localhost:3011/api/auth/register
```

## Causa Raiz
O **Nginx** (que serve seu site em HTTPS) está funcionando, mas não consegue alcançar o **Docker container da API** que deve responder em `http://api:3011`.

---

## ✅ SOLUÇÃO RÁPIDA (5 minutos)

### Passo 1: Acesse sua VPS

```bash
ssh seu-usuario@seu-dominio.com
# ou
ssh seu-usuario@seu-ip-vps
```

### Passo 2: Vá para a pasta do projeto

```bash
cd /caminho/do/projeto-sass
# Geralmente: cd ~/projeto-sass
```

### Passo 3: Faça upload dos arquivos corrigidos

Se você estiver usando Windows, você pode:

**Opção A - Git (Recomendado)**
```bash
git add .
git commit -m "Fix: Expor porta API e melhorar nginx"
git push
```

Depois na VPS:
```bash
git pull
```

**Opção B - SCP/WinSCP**
Copie para a VPS:
- `docker-compose.yml` (versão corrigida)
- `nginx.conf` (versão melhorada)
- `deploy-fix.sh` (novo script)

### Passo 4: Execute o script de correção

```bash
chmod +x deploy-fix.sh
bash deploy-fix.sh
```

Isso vai:
- ✅ Parar containers antigos
- ✅ Reconstruir imagens
- ✅ Iniciar tudo novamente
- ✅ Aguardar 40 segundos
- ✅ Testar conectividade
- ✅ Mostrar logs

### Passo 5: Teste

Abra seu navegador e acesse:
```
https://seu-dominio.com/api/health
```

Deve retornar algo como:
```json
{
  "status": "ok",
  "uptime": 234,
  "timestamp": "2024-02-03T12:34:56.789Z"
}
```

**Pronto!** 🎉 Sua API está funcionando.

---

## O QUE FOI ALTERADO

### 1. `docker-compose.yml`

**Antes:**
```yaml
api:
  # ... sem exposição de porta!
  networks:
    - internal
```

**Depois:**
```yaml
api:
  ports:
    - "3011:3011"  # ← ADICIONADO!
  environment:
    API_HOST: 0.0.0.0  # ← ADICIONADO!
```

**Por quê?** 
- Sem `ports`, o container API não expõe a porta para fora
- `API_HOST: 0.0.0.0` garante que escuta em todas as interfaces

### 2. `nginx.conf`

**Antes:**
- Configuração simplista
- Sem rate limiting
- Sem security headers
- Sem tratamento de timeout

**Depois:**
- Suporta múltiplos domínios
- Rate limiting para API e frontend
- Security headers (HSTS, X-Content-Type-Options, etc)
- Timeouts ajustados
- Cache SSL otimizado
- Melhor tratamento de WebSockets

---

## Se Ainda Não Funcionar

### Debug 1: Verificar Container

```bash
# Está rodando?
docker ps | grep projeto-sass-api

# Ver status completo
docker inspect projeto-sass-api

# Ver saúde do container
docker ps --format="table {{.Names}}\t{{.Status}}"
```

### Debug 2: Ver Logs

```bash
# Últimas 50 linhas
docker logs --tail=50 projeto-sass-api

# Com timestamps
docker logs --timestamps projeto-sass-api

# Em tempo real (saia com Ctrl+C)
docker logs -f projeto-sass-api
```

**Procure por erros como:**
- `Cannot find module` → dependências não instaladas
- `ECONNREFUSED mongo` → MongoDB não respondendo
- `Port 3011 already in use` → porta em uso
- `ENOTFOUND` → problema de DNS

### Debug 3: Testar Conectividade

```bash
# De dentro do nginx, consegue acessar a API?
docker exec projeto-sass-nginx curl -v http://api:3011/health

# De dentro da API, consegue conectar no MongoDB?
docker exec projeto-sass-api curl -v http://mongo:27017

# Verificar rede
docker network inspect projeto-sass_internal
```

### Debug 4: Verificar Variáveis de Ambiente

```bash
# Quais variáveis o container tem?
docker exec projeto-sass-api env | sort

# Quais arquivo .env existe?
docker exec projeto-sass-api cat /app/.env
```

### Debug 5: Reiniciar Tudo do Zero

Se nada funcionar, essa é a solução nuclear:

```bash
# Para tudo
docker-compose down

# Limpa volumes (⚠️ isso deleta dados!)
docker-compose down -v

# Aguarda
sleep 10

# Inicia do zero
docker-compose up -d --build

# Aguarda inicialização
sleep 40

# Verifica
docker ps
docker logs projeto-sass-api
```

---

## 🔧 OPÇÕES DE REPARO

| Situação | Comando | Tempo |
|----------|---------|-------|
| Containers parados | `docker-compose restart` | 15s |
| Código alterado | `docker-compose up -d --build` | 3min |
| Quer ver o que está errado | `docker logs -f projeto-sass-api` | Real-time |
| Mongo/Redis com problema | `docker-compose restart mongo redis` | 30s |
| Quer limpar tudo | `docker-compose down -v && docker-compose up -d` | 5min |
| Container travado | `docker-compose down && docker-compose up -d` | 2min |

---

## ✨ VERIFICAÇÃO FINAL

Depois de executar `deploy-fix.sh`, verifique:

### 1. Containers Rodando?

```bash
docker ps
```

Deve mostrar:
```
projeto-sass-api      Up X seconds
projeto-sass-frontend Up X seconds
projeto-sass-mongo    Up X seconds
projeto-sass-redis    Up X seconds
projeto-sass-nginx    Up X seconds
```

### 2. Porta 3011 Acessível?

```bash
# Do seu PC (não da VPS)
curl -v http://seu-ip-vps:3011/health

# Ou pelo domínio
curl -v https://seu-dominio.com/api/health
```

Deve retornar **Status 200** com JSON, não erro de conexão.

### 3. Frontend Funciona?

Abra `https://seu-dominio.com` no navegador.

Se abrir a página, a parte de frontend está OK!

### 4. API Funciona?

No DevTools do navegador (F12):
- Vá para **Network** tab
- Recarregue a página
- Procure por requisições que começam com `/api`
- Verifique se o **Status** é `200` (não `ERR_CONNECTION_REFUSED`)

---

## 📞 SE AINDA TIVER PROBLEMA

Colete essas informações e compartilhe:

1. Output completo:
   ```bash
   docker logs projeto-sass-api 2>&1 | head -100
   ```

2. Status dos containers:
   ```bash
   docker ps -a
   ```

3. Sua configuração (sem senhas):
   ```bash
   cat .env | grep -v PASSWORD | grep -v SECRET
   ```

4. Logs do nginx:
   ```bash
   docker logs projeto-sass-nginx
   ```

5. Teste de conectividade:
   ```bash
   docker exec projeto-sass-nginx curl -v http://api:3011/health 2>&1
   ```

---

## 🎓 RESUMO TÉCNICO

Seu projeto usa:
- **Nginx** → Proxy reverso, HTTPS, rota `/api` → backend
- **API (Node.js)** → Express em `localhost:3011` dentro do container
- **MongoDB** → Banco de dados
- **Redis** → Cache
- **Docker Compose** → Orquestra tudo

O problema era que a porta 3011 não estava exposta no docker-compose.yml, então:
1. Requisição entra por `https://seu-dominio.com/api/`
2. Nginx rota para `http://api:3011/`
3. Mas `api` container não tinha a porta mapeada
4. Resultado: Conexão recusada

Agora com a correção:
1. Adicionado `ports: ["3011:3011"]` no docker-compose.yml
2. Adicionado `API_HOST: 0.0.0.0` para escutar em todas as interfaces
3. Melhorado o nginx.conf para melhor performance
4. Tudo funciona! ✅

---

## 🚀 PRÓXIMOS PASSOS

Depois que tudo funcionar:

1. **Backup do banco de dados:**
   ```bash
   docker exec projeto-sass-mongo mongodump --out /backup
   ```

2. **Configurar logs persistentes:**
   ```bash
   mkdir -p logs
   docker logs projeto-sass-api > logs/api.log
   ```

3. **Monitorar performance:**
   ```bash
   docker stats
   ```

4. **Fazer commit das mudanças:**
   ```bash
   git add .
   git commit -m "Fix: Corrigir exposição da porta API e melhorar nginx"
   git push
   ```

---

## 🆘 COMANDOS DE EMERGÊNCIA

Se der ruim:

```bash
# Parar tudo imediatamente
docker-compose kill

# Ver o que aconteceu
docker-compose logs

# Limpar tudo e começar do zero
docker-compose down -v
docker system prune -a

# Reconstruir e iniciar
docker-compose up -d --build

# Monitorar em tempo real
docker logs -f projeto-sass-api
```

---

**Boa sorte! 🍀 Qualquer dúvida, execute `bash diagnose-docker.sh` e compartilhe o output!**
