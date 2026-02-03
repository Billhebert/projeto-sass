# 🔧 SOLUÇÃO: net::ERR_CONNECTION_REFUSED em localhost:3011

## Problema
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
localhost:3011/api/auth/register:1
```

Seu domínio está no ar, mas a API não está respondendo. Isso significa que o **nginx está funcionando**, mas o **backend Docker não está acessível**.

---

## ✅ SOLUÇÕES (Do mais simples ao mais complexo)

### **SOLUÇÃO 1: Reiniciar Docker (Mais Rápida)**

Execute na sua VPS:

```bash
cd /caminho/do/seu/projeto
docker-compose restart
```

**Tempo de espera:** ~15 segundos

---

### **SOLUÇÃO 2: Verificar o Status**

Execute o script de diagnóstico:

```bash
bash diagnose-docker.sh
```

Isso vai mostrar:
- ✓ Se todos os containers estão rodando
- ✓ Status de saúde de cada um
- ✓ Logs do último erro
- ✓ Conectividade entre serviços

---

### **SOLUÇÃO 3: Reconstruir Imagem (Se mudou código)**

Se você modificou o código do backend:

```bash
docker-compose down
docker-compose up -d --build
```

**Tempo de espera:** ~2-3 minutos

---

### **SOLUÇÃO 4: Verificar Variáveis de Ambiente**

O backend pode não estar iniciando porque falta alguma variável.

1. Verifique o arquivo `.env` no root do projeto:

```bash
cat .env
```

2. Deve conter no mínimo:

```env
API_PORT=3011
MONGODB_URI=mongodb://admin:changeme@mongo:27017/projeto-sass?authSource=admin
REDIS_URL=redis://:changeme@redis:6379
NODE_ENV=production
JWT_SECRET=seu_segredo_aqui
```

3. Se faltam variáveis, adicione e rode:

```bash
docker-compose up -d --build api
```

---

### **SOLUÇÃO 5: Verificar Logs Detalhados**

Para ver exatamente o que está errado:

```bash
# Últimos 50 linhas
docker logs --tail=50 projeto-sass-api

# Logs em tempo real
docker logs -f projeto-sass-api

# Com timestamps
docker logs --timestamps projeto-sass-api
```

**Erros comuns nos logs:**

- `Error: connect ECONNREFUSED` → MongoDB/Redis não está pronto
- `Cannot find module` → npm install não foi executado
- `Port 3011 already in use` → Porta bloqueada/em uso
- `ENOTFOUND` → Problema de DNS/network

---

### **SOLUÇÃO 6: Verificar Conectividade Entre Serviços**

Testar se os containers conseguem se comunicar:

```bash
# De dentro do nginx, tentar acessar a API
docker exec projeto-sass-nginx curl -v http://api:3011/health

# De dentro da API, tentar conectar ao MongoDB
docker exec projeto-sass-api npm test

# Verificar rede
docker network inspect projeto-sass_internal
```

---

### **SOLUÇÃO 7: Limpar e Reiniciar Tudo**

Nuclear option - limpa tudo e começa do zero:

```bash
# Para tudo
docker-compose down

# Remove volumes (cuidado: limpa dados!)
docker-compose down -v

# Aguarda
sleep 10

# Inicia do zero
docker-compose up -d

# Aguarda inicialização (30 segundos)
sleep 30

# Verifica status
docker ps
docker logs projeto-sass-api
```

---

## 🔍 VERIFICAÇÃO

Depois de qualquer solução, verifique se está funcionando:

### 1️⃣ Teste Local (SSH na VPS)

```bash
# Teste interno (de dentro da rede Docker)
docker exec projeto-sass-nginx curl -v http://api:3011/health

# Deve retornar algo como:
# {"status":"ok","uptime":1234,"timestamp":"2024-02-03T..."}
```

### 2️⃣ Teste Externo

```bash
# Do seu PC
curl -v http://seu-dominio.com/api/health

# Ou pelo navegador
https://seu-dominio.com/api/health
```

### 3️⃣ Teste no Navegador

Abra seu site e abra o DevTools (F12):

- **Network tab** → Procure por `/api/auth/register`
- **Status** → Deve ser `200` ou `400` (não `ERR_CONNECTION_REFUSED`)
- **Response** → Deve ter dados, não erro de conexão

---

## 🚨 DIAGNÓSTICO AVANÇADO

Se nada acima funcionou, use este checklist:

### Checklist 1: Docker Status
- [ ] Docker daemon está rodando? `docker ps` funciona?
- [ ] Containers existem? `docker ps -a` mostra `projeto-sass-api`?
- [ ] Container está saudável? `docker inspect projeto-sass-api` mostra Health Status?

### Checklist 2: Portas
- [ ] Porta 3011 está livre? `netstat -tlnp | grep 3011`
- [ ] Nginx escuta em 80/443? `docker ps | grep nginx`
- [ ] Firewall permite 80/443? `sudo ufw status`

### Checklist 3: Network Docker
- [ ] Rede `projeto-sass_internal` existe? `docker network ls`
- [ ] Containers estão na rede? `docker network inspect projeto-sass_internal`
- [ ] DNS resolve `api` → IP correto? `docker exec projeto-sass-nginx nslookup api`

### Checklist 4: Banco de Dados
- [ ] MongoDB está rodando? `docker ps | grep mongo`
- [ ] Redis está rodando? `docker ps | grep redis`
- [ ] Conseguem receber conexões? Verificar logs

### Checklist 5: Aplicação
- [ ] `npm install` foi executado? `docker exec projeto-sass-api ls node_modules`
- [ ] Arquivo `.env` existe no container? `docker exec projeto-sass-api cat /app/.env`
- [ ] server.js escuta em 0.0.0.0:3011? `grep "PORT\|listen" backend/server.js`

---

## 📋 RESUMO DAS SOLUÇÕES

| Problema | Solução | Tempo |
|----------|---------|-------|
| Containers parados | `docker-compose restart` | 15s |
| Precisa verificar | `bash diagnose-docker.sh` | 1min |
| Código mudou | `docker-compose up -d --build` | 3min |
| Variáveis faltam | Atualizar `.env` e reiniciar | 2min |
| Logs com erro | Ler logs, corrigir, reiniciar | 5min |
| Tudo quebrado | `docker-compose down -v && up -d` | 5min |

---

## 🤔 PERGUNTAS FREQUENTES

**P: Funciona local mas não no servidor?**
- R: Problema de rede Docker no servidor. Verifique firewall e docker-compose.yml

**P: Funciona em HTTP mas não em HTTPS?**
- R: Certificado SSL pode estar vencido. Verifique `/etc/letsencrypt/live/seu-dominio.com/`

**P: Funciona mas fica lento?**
- R: Problema de performance. Verifique logs de erro e ajuste resources do Docker

**P: Como fazer log de requisições?**
- R: Já está implementado no backend, veja com `docker logs -f projeto-sass-api`

---

## 📞 PRÓXIMO PASSO

Se depois de tudo isso ainda não funcionar, colete estas informações:

1. Output completo de `docker logs projeto-sass-api` (últimas 100 linhas)
2. Output de `docker ps -a`
3. Seu arquivo `.env` (sem senhas)
4. Output de `docker network inspect projeto-sass_internal`
5. Output de `curl -v http://seu-dominio.com/api/health` (do seu PC)

Compartilhe essas informações para análise mais profunda!

---

## ✨ DICA DE OURO

Adicione este alias na sua VPS para diagnósticos rápidos:

```bash
echo "alias api-diag='docker logs --tail=50 -f projeto-sass-api'" >> ~/.bashrc
source ~/.bashrc

# Agora só execute: api-diag
```

