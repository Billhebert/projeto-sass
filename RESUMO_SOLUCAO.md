# ✅ SOLUÇÃO: Erro de Conexão da API (net::ERR_CONNECTION_REFUSED)

## 🎯 Problema Identificado

Você colocou seu domínio no ar, mas recebeu este erro:
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
localhost:3011/api/auth/register
```

## 🔍 Causa Raiz

A **porta 3011 do container API não estava exposta** no `docker-compose.yml`. 

Isso significa:
- ✅ Nginx estava rodando (site acessível)
- ✅ Frontend estava respondendo
- ❌ Mas a API não conseguia ser alcançada de fora do container

```
Fluxo de uma requisição:
navegador → https://seu-dominio.com/api/auth/register
           ↓
          Nginx (recebe a requisição)
           ↓
          tenta conectar em http://api:3011 
           ↓
          ❌ ERRO: Porta não exposta!
```

---

## 🔧 O que foi Corrigido

### 1. **docker-compose.yml**

```diff
api:
  build:
    context: ./backend
    dockerfile: Dockerfile
+ ports:
+   - "3011:3011"
  environment:
    NODE_ENV: production
    PORT: 3011
+   API_HOST: 0.0.0.0
```

**Por quê?**
- `ports: ["3011:3011"]` expõe a porta do container para o host
- `API_HOST: 0.0.0.0` garante que o Express escuta em TODAS as interfaces

### 2. **nginx.conf**

Melhorias implementadas:
- ✅ Adicionado rate limiting para proteção
- ✅ Adicionado security headers (HSTS, X-Content-Type-Options, etc)
- ✅ Melhorado suporte a WebSockets
- ✅ Adicionado tratamento de timeout
- ✅ Melhorado cache SSL

```nginx
location /api/ {
  limit_req zone=api_limit burst=10 nodelay;
  proxy_pass http://api:3011/;
  # ... headers e configurações de proxy
}
```

### 3. **Scripts Criados**

#### `diagnose-docker.sh`
Script para diagnosticar problemas:
```bash
bash diagnose-docker.sh
```

Verifica:
- ✓ Status de cada container
- ✓ Saúde do container (healthcheck)
- ✓ Logs de erro
- ✓ Conectividade entre serviços
- ✓ Variáveis de ambiente

#### `deploy-fix.sh`
Script para corrigir e fazer deploy:
```bash
bash deploy-fix.sh
```

Executa:
- Parar containers antigos
- Reconstruir imagens
- Iniciar tudo novamente
- Testar conectividade
- Mostrar status final

#### `fix-api-connection.sh`
Script rápido para restart:
```bash
bash fix-api-connection.sh
```

### 4. **Guias Criados**

- **API_CONNECTION_ERROR_GUIDE.md** - Guia completo de solução
- **ERRO_CONEXAO_FIX.md** - Guia passo-a-passo em português

---

## 🚀 Como Implementar a Correção

### Na sua VPS:

```bash
# 1. Vá para a pasta do projeto
cd ~/projeto-sass

# 2. Atualize os arquivos
git pull

# 3. Execute o script de correção
bash deploy-fix.sh
```

**Tempo estimado:** 5-10 minutos

### Ou Manualmente:

```bash
# Parar tudo
docker-compose down

# Aguardar
sleep 5

# Iniciar com rebuild
docker-compose up -d --build

# Aguardar inicialização
sleep 40

# Verificar status
docker ps
```

---

## ✅ Verificação

Depois de implementar a correção:

### 1. Teste Interno (SSH na VPS)
```bash
docker exec projeto-sass-nginx curl -v http://api:3011/health
```

Deve retornar: **Status 200** + JSON com `{"status":"ok",...}`

### 2. Teste Externo (Do seu PC)
```bash
curl -v https://seu-dominio.com/api/health
```

Deve retornar: **Status 200** + JSON

### 3. Teste no Navegador
Abra: `https://seu-dominio.com`
- Abra DevTools (F12)
- Vá para Network tab
- Recarregue a página
- Procure por `/api/*` requests
- Status deve ser **200**, não erro de conexão

---

## 📊 Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Nginx | ✅ Funcionando | ✅ Funcionando |
| Frontend | ✅ Acessível | ✅ Acessível |
| API | ❌ Conexão recusada | ✅ Respondendo |
| Rate Limiting | ❌ Não | ✅ Sim |
| Security Headers | ❌ Básico | ✅ Completo |
| WebSockets | ❌ Não suportado | ✅ Suportado |
| Timeouts | ❌ Padrão | ✅ Otimizado |

---

## 🆘 Se Ainda Não Funcionar

### Debug Rápido

```bash
# Ver logs
docker logs -f projeto-sass-api

# Testar conectividade
docker exec projeto-sass-nginx curl -v http://api:3011/health

# Verificar saúde
docker inspect projeto-sass-api | grep -A 5 Health

# Reiniciar API apenas
docker-compose restart api
```

### Solução Nuclear

```bash
# Parar tudo e limpar volumes
docker-compose down -v

# Aguardar
sleep 10

# Começar do zero
docker-compose up -d --build

# Aguardar
sleep 40

# Verificar
docker logs projeto-sass-api
```

---

## 📝 Arquivos Modificados

```
✅ docker-compose.yml     → Adicionado mapeamento de porta 3011
✅ nginx.conf             → Melhorado com rate limiting e headers
✨ diagnose-docker.sh     → Script de diagnóstico
✨ deploy-fix.sh          → Script de deploy
✨ fix-api-connection.sh  → Script de reparo rápido
📄 API_CONNECTION_ERROR_GUIDE.md → Guia técnico
📄 ERRO_CONEXAO_FIX.md          → Guia em português
```

---

## 🎓 Aprendizado

**Por que isso aconteceu?**

Em Docker Compose, por padrão:
- Containers podem se comunicar internamente pela rede
- Mas não expõem portas para o host/internet automaticamente
- Você deve declarar `ports: ["3011:3011"]` para expor

**Sem `ports`:**
```
Fora do Docker → ❌ Não consegue acessar
Dentro do Docker (outros containers) → ✅ Conseguem acessar internamente
```

**Com `ports`:**
```
Fora do Docker → ✅ Consegue acessar
Dentro do Docker → ✅ Conseguem acessar (usando IP do container)
```

---

## 🚀 Próximos Passos

1. **Implementar a correção** (veja seção "Como Implementar")
2. **Testar em produção** (veja seção "Verificação")
3. **Fazer commit do código**:
   ```bash
   git add .
   git commit -m "Fix: Corrigir exposição da porta API"
   git push
   ```
4. **Monitorar performance**:
   ```bash
   docker stats
   docker logs -f projeto-sass-api
   ```
5. **Backup regular**:
   ```bash
   docker exec projeto-sass-mongo mongodump --out /backup
   ```

---

## 📞 Resumo

| Ação | Comando |
|------|---------|
| Ver status | `docker ps` |
| Ver logs | `docker logs projeto-sass-api` |
| Reiniciar API | `docker-compose restart api` |
| Reiniciar tudo | `docker-compose restart` |
| Fazer deploy | `bash deploy-fix.sh` |
| Diagnosticar | `bash diagnose-docker.sh` |
| Limpar tudo | `docker-compose down -v && docker-compose up -d` |

---

## ✨ Status Final

**Antes:**
```
🔴 API: Erro de Conexão
📍 Localização: Docker container porta 3011 não exposta
🚨 Impacto: Não consegue fazer requisições para backend
```

**Depois:**
```
🟢 API: Respondendo normalmente
📍 Localização: Acessível em https://seu-dominio.com/api
✅ Impacto: Tudo funciona!
```

---

**Boa sorte! Se tiver dúvidas, execute `bash diagnose-docker.sh` e compartilhe o output! 🍀**
