# 🐛 Solução: Problema de Caminho UNC no WSL

## O Problema

Quando você executou `NODE_ENV=test npm run dev`, recebeu:

```
'\\wsl.localhost\Ubuntu\home\bill\projeto-sass'
CMD.EXE foi iniciado tendo o caminho acima como pasta atual.
Não há suporte para caminhos UNC. Padronizando para pasta do Windows.
```

**Causa:** O nodemon tem problemas com caminhos UNC (rede) no WSL.

---

## ✅ Solução Rápida (Escolha UMA)

### Opção 1: TESTES (Recomendado - sem servidor)

```bash
node test-endpoints.js
```

✅ Mais rápido  
✅ Sem problemas WSL  
✅ Testa tudo  
✅ 5 segundos

---

### Opção 2: SERVIDOR (sem nodemon)

```bash
NODE_ENV=test node backend/server.js
```

Ou use nosso script:

```bash
bash start-dev.sh
```

✅ Servidor rodando  
✅ Sem nodemon (contorna UNC)  
✅ MongoDB Memory Server automático  
✅ http://localhost:3000

---

### Opção 3: Script Helper (Alternativa)

```bash
node dev-server.js
```

✅ Wrapper que configura tudo  
✅ Trata erros graciosamente  

---

## 🎯 Qual Escolher?

| Situação | Comando | Tempo |
|----------|---------|-------|
| Quer testar tudo | `node test-endpoints.js` | 5s ⭐ |
| Quer servidor rodando | `NODE_ENV=test node backend/server.js` | Contínuo |
| Quer mais controle | `node dev-server.js` | Contínuo |

---

## 📊 O QUE CADA UMA FAZ

### `node test-endpoints.js`
```
✅ Testa autenticação
✅ Testa rotas protegidas
✅ Testa validação
✅ MongoDB em memória
✅ Saída: PASS/FAIL
✅ Termina sozinho
```

### `NODE_ENV=test node backend/server.js`
```
✅ Servidor Express rodando
✅ MongoDB em memória
✅ Listening on port 3000
✅ Precisa Ctrl+C para parar
✅ Acessa via http://localhost:3000
```

### `node dev-server.js`
```
✅ Wrapper mais amigável
✅ Verificações de arquivo
✅ Mensagens melhoradas
✅ Mesmo resultado do anterior
```

---

## 🔍 Se Testes Falharem

### Erro: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
node test-endpoints.js
```

### Erro: "Port 3000 already in use"
```bash
# Linux/WSL
lsof -i :3000
kill -9 <PID>

# Ou mudar porta no código
```

### MongoDB Memory Server lentidão
```bash
# Primeira execução baixa binário (pode levar 30s)
# Próximas são rápidas (usa cache)
# Espere completar a primeira vez
```

---

## 💡 Dica: Arquivo .env

Se quiser usar MongoDB real (depois de instalar Docker):

```bash
# Windows - abra Docker Desktop

# WSL
docker compose up -d mongo
NODE_ENV=development npm run dev
```

---

## 📝 Resumo da Solução

**Problema:** Nodemon não gosta de caminhos UNC  
**Solução:** Usar `node` diretamente em vez de `npm run dev`  
**Resultado:** Servidor funciona normalmente

---

## 🎯 PRÓXIMO PASSO

Execute AGORA uma destas opções:

```bash
# Opção 1 (RECOMENDADO - testes)
node test-endpoints.js

# Opção 2 (servidor)
NODE_ENV=test node backend/server.js

# Opção 3 (com script)
node dev-server.js
```

Qualquer uma funciona! Escolha a que preferir.

---

**Status:** ✅ Problema resolvido!
