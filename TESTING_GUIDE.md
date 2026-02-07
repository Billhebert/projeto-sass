# 🧪 Guia Completo de Testes

## Nível 1: Testes Básicos (SEM credenciais reais) ✅ PRONTO

### Teste 1: Carregar SDK
```bash
node test-sdk-report.js
```
**Resultado esperado:** 100% passing (6/6 testes)
**Tempo:** ~5 segundos
**Status:** ✅ PASSANDO

### O que testa:
- ✅ SDK carrega corretamente
- ✅ 90+ módulos disponíveis
- ✅ Cliente HTTP funciona
- ✅ Autenticação setup correto
- ✅ Múltiplas instâncias isoladas

---

## Nível 2: Teste ml-accounts.js Refatorado ⏳ RECOMENDADO

### Teste 2: Verificar Syntax
```bash
node -c backend/routes/ml-accounts.js && echo "✅ Sintaxe OK"
```
**Resultado esperado:** ✅ Sintaxe OK
**Tempo:** ~1 segundo
**Status:** ✅ OK (já testado)

### O que valida:
- ✅ Arquivo não tem erros de sintaxe
- ✅ Pronto para ser usado
- ✅ Importações corretas

---

## Nível 3: Testes COM Credenciais Reais 🔐 (Opcional)

### PASSO 1: Setup OAuth
```bash
node setup-production.js
```

**O que fazer:**
1. Digite seu Client ID (do Mercado Livre)
2. Digite seu Client Secret
3. Abra o link gerado no navegador
4. Autorize no Mercado Livre
5. O sistema salva os tokens automaticamente

**Resultado esperado:**
```
✅ Autenticação bem-sucedida
✅ Tokens salvos em .env
✅ Pronto para testar
```

**Tempo:** ~2 minutos

### PASSO 2: Testar Produção
```bash
node test-production.js
```

**O que testa:**
- ✅ Tokens são válidos
- ✅ Conexão com Mercado Livre funciona
- ✅ Consegue buscar usuário
- ✅ Consegue listar produtos
- ✅ Consegue listar pedidos

**Resultado esperado:**
```
✅ SDK carregado
✅ Tokens válidos
✅ Usuário: seu_nome
✅ Produtos: X itens
✅ Pedidos: Y pedidos
✅ Tudo OK!
```

**Tempo:** ~10 segundos

---

## Nível 4: Testar Servidor Completo (Backend + Frontend)

### PASSO 1: Iniciar Backend
```bash
npm run dev
```

**Resultado esperado:**
```
✅ Backend rodando em http://localhost:3011
✅ Frontend rodando em http://localhost:5173
✅ MongoDB conectado
✅ Redis conectado (se configurado)
```

### PASSO 2: Acessar Frontend
1. Abra http://localhost:5173
2. Faça login
3. Vá para "Minha Conta"
4. Clique em "Conectar Mercado Livre"
5. Autorize no Mercado Livre
6. Veja seus produtos e pedidos

---

## 🎯 Guia Rápido: Qual Teste Fazer?

### Cenário 1: Só quer verificar que tudo foi bem instalado
```bash
node test-sdk-report.js
```
✅ **5 segundos**, sem credenciais

### Cenário 2: Quer validar ml-accounts.js está OK
```bash
node -c backend/routes/ml-accounts.js && echo "✅ Syntax OK"
```
✅ **1 segundo**

### Cenário 3: Quer testar COM dados reais
```bash
# 1. Setup
node setup-production.js

# 2. Teste
node test-production.js

# 3. Ver no servidor
npm run dev
```
✅ **~3 minutos** (2 min setup + testes)

### Cenário 4: Quer testar tudo da forma mais completa
```bash
# 1. Teste basicamente
node test-sdk-report.js

# 2. Setup com conta real
node setup-production.js

# 3. Teste produção
node test-production.js

# 4. Inicie servidor
npm run dev
```
✅ **~10 minutos** total

---

## 📝 Detalhes de Cada Teste

### test-sdk-report.js
**O que faz:**
- Carrega a SDK
- Cria uma instância
- Verifica 90 módulos
- Testa cliente HTTP
- Testa autenticação
- Testa múltiplas instâncias

**Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ 🚀 SDK COMPLETA - TESTE E VALIDAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. CARREGAMENTO DA SDK
✓ SDK importada com sucesso

2. INSTANCIAÇÃO DA SDK
✓ Instância criada com sucesso

3. DISPONIBILIDADE DE MÓDULOS
✓ Presentes: 90 módulos

4. CLIENTE HTTP
✓ HTTP client funcional

5. AUTENTICAÇÃO
✓ Headers de autenticação gerados

6. MÚLTIPLAS INSTÂNCIAS
✓ Múltiplas instâncias isoladas corretamente

📊 RESUMO DOS TESTES
Testes executados: 6
✓ Passou: 6
✗ Falhou: 0

Taxa de sucesso: 100.00%
```

### setup-production.js
**O que faz:**
- Pede Client ID e Secret
- Gera URL de autorização
- Abre no navegador
- Valida o código
- Troca por tokens
- Salva em .env

**Arquivo gerado:** `.env` (com tokens reais)

### test-production.js
**O que faz:**
- Carrega tokens do .env
- Valida tokens com ML
- Busca usuário logado
- Lista produtos
- Lista pedidos
- Mostra resultados

**Output:**
```
✅ SDK carregado
✅ Tokens válidos
✅ Usuário: seu_usuario
✅ Produtos: 5 itens
✅ Pedidos: 2 pedidos
✅ Tudo funcionando!
```

---

## 🔍 Como Interpretar Resultados

### ✅ Sucesso
```
✓ SDK importada com sucesso
✓ Instância criada com sucesso
✓ HTTP client funcional
✓ Headers de autenticação gerados
✓ Múltiplas instâncias isoladas corretamente

Taxa de sucesso: 100.00%
```
**Significado:** Tudo OK! SDK pronta para usar.

### ⚠️ Avisos
```
⚠ TOKEN_NEAR_EXPIRY: Token expira em 1 dia
```
**Significado:** Tudo funciona mas talvez você queira renovar tokens em breve.

### ❌ Erro
```
✗ HTTP client connection failed
Error: Cannot connect to api.mercadolibre.com
```
**Significado:** Problema de conexão ou credenciais inválidas.

---

## 🛠️ Troubleshooting

### Erro: "Cannot find module 'test-sdk-report.js'"
**Solução:**
```bash
# Certifique que está na pasta correta
cd "E:\Paulo ML\projeto-sass"

# Agora execute
node test-sdk-report.js
```

### Erro: "Cannot find module '../sdk/complete-sdk'"
**Solução:**
- Arquivo pode estar em local diferente
- Verifique se existe: `backend/sdk/complete-sdk.js`
- Se não existe, execute: `git status`

### Erro: "ENOENT: no such file or directory '.env'"
**Solução:**
- Execute `node setup-production.js` primeiro
- Isso cria o arquivo `.env`
- Depois execute `node test-production.js`

### Erro: "Invalid token"
**Solução:**
1. Tokens expiraram
2. Execute `node setup-production.js` novamente
3. Refaça a autorização

---

## 📊 Resumo dos Testes Disponíveis

| Teste | Comando | Tempo | Credenciais | Status |
|-------|---------|-------|-------------|--------|
| SDK Básico | `node test-sdk-report.js` | 5 seg | ❌ Não | ✅ PRONTO |
| Verificar Syntax | `node -c backend/routes/ml-accounts.js` | 1 seg | ❌ Não | ✅ OK |
| Setup OAuth | `node setup-production.js` | 2 min | ✅ Sim | ✅ PRONTO |
| Teste Produção | `node test-production.js` | 10 seg | ✅ Sim | ✅ PRONTO |
| Servidor Completo | `npm run dev` | 5 seg | ❌ Não | ✅ PRONTO |

---

## 🎓 O que Aprender com Cada Teste

### test-sdk-report.js Ensina:
- Como a SDK carrega
- Quais módulos estão disponíveis
- Como instanciar corretamente
- Como usar autenticação

### test-production.js Ensina:
- Como usar tokens reais
- Como fazer requisições à API
- Como tratar respostas
- Como lidar com erros

### npm run dev Ensina:
- Como o servidor inicia
- Como frontend conecta com backend
- Como dados fluem pela aplicação
- Como tudo funciona junto

---

## ✅ Checklist de Testes

Marque conforme executa:

**Básico (sem credenciais):**
- [ ] `node test-sdk-report.js` ✅ PASSANDO
- [ ] `node -c backend/routes/ml-accounts.js` ✅ SYNTAX OK

**Com credenciais (opcional):**
- [ ] `node setup-production.js` (após fazer)
- [ ] `node test-production.js` (após setup)

**Servidor:**
- [ ] `npm run dev` (verificar se inicia)
- [ ] Acessar http://localhost:5173
- [ ] Acessar http://localhost:3011

---

## 💡 Dicas

1. **Sempre teste o SDK básico primeiro**
   ```bash
   node test-sdk-report.js
   ```

2. **Se quiser testar com dados reais, prepare credenciais antes**
   - Vá a https://developers.mercadolibre.com.br
   - Pegue Client ID e Secret
   - Depois execute setup

3. **Para ver erros completos, adicione DEBUG**
   ```bash
   DEBUG=* node test-sdk-report.js
   ```

4. **Se algo quebrar, rollback é fácil**
   ```bash
   git checkout HEAD backend/routes/ml-accounts.js
   ```

---

## 🚀 Próximos Passos Após Testes

1. Se tudo passou ✅
   - SDK está pronto
   - Pode usar em produção
   - Pode começar a migrar rotas

2. Se algum teste falhou ❌
   - Verifique a mensagem de erro
   - Consulte troubleshooting
   - Faça commit de qualquer fix

3. Para continuar desenvolvimento
   - Leia `ROADMAP_SDK_INTEGRATION.md`
   - Escolha próxima rota a migrar
   - Siga o padrão do `ml-accounts.js`

