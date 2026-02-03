# 🧪 TESTES DE AUTENTICAÇÃO - Guia Completo

**Data:** 3 de Fevereiro de 2024  
**Objetivo:** Testar fluxo completo de autenticação  
**Tempo Estimado:** 30-60 minutos

---

## 📋 Resumo dos Testes

Este guia contém testes manuais e automatizados para verificar se o sistema de autenticação funciona corretamente.

### O Que Será Testado:
- ✅ Registro de novo usuário
- ✅ Login com credenciais
- ✅ Geração de tokens (JWT)
- ✅ Refresh de token
- ✅ Acesso a endpoints protegidos
- ✅ Rejeição sem token
- ✅ Rejeição com token inválido
- ✅ Logout

---

## 🚀 Teste Automatizado (Bash)

### Executar Teste Automático

```bash
# Modo desenvolvimento (localhost)
bash test-authentication.sh

# Modo produção (com domínio)
API_URL=https://seu-dominio.com bash test-authentication.sh
```

### O Script Faz:

1. Verifica conectividade com API
2. Registra novo usuário com email único (timestamp)
3. Faz login e obtém tokens
4. Testa acesso a endpoints protegidos
5. Valida comportamento sem token
6. Testa com token inválido
7. Refresh de token (se implementado)
8. Logout

### Saída Esperada:

```
🧪 TESTE COMPLETO DE AUTENTICAÇÃO - Projeto SASS

📍 Configuração:
   API URL: http://localhost:3011
   Email Teste: test_1770135286@example.com
   Senha Teste: ******************

▶ 1️⃣  Verificando Conectividade com API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓ API está respondendo
  ℹ Status: ok

▶ 2️⃣  Teste de Registro de Novo Usuário
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓ Usuário registrado com sucesso
  ℹ User ID: 123456789

▶ 3️⃣  Teste de Login
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓ Login bem-sucedido
  ✓ Access Token obtido
  ✓ Refresh Token obtido

▶ 4️⃣  Teste de Endpoints Protegidos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓ Acesso a endpoint protegido bem-sucedido
  ℹ Email: test_1770135286@example.com

▶ 5️⃣  Teste sem Token (Deve falhar)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓ Corretamente rejeitado sem token
  ℹ Status esperado: 401 Unauthorized ou 403 Forbidden

▶ 6️⃣  Teste com Token Inválido (Deve falhar)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓ Corretamente rejeitado token inválido

▶ 7️⃣  Teste de Refresh Token
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓ Novo access token obtido com sucesso
  ℹ Novo Token: eyJhbGciOiJIUzI1NiIs...rQzI6MzYwMDB9

▶ 8️⃣  Teste de Logout
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✓ Logout processado

📊 RESUMO DOS TESTES

Resultados:

  ✓ API está respondendo
  ✓ Registro de usuário funcionando
  ✓ Login obtém tokens
  ✓ Endpoints protegidos validam token
  ✓ Rejeição sem token está ok
  ✓ Rejeição com token inválido está ok
  ℹ Refresh token: eyJhbGciOiJIUzI1NiIs...
  ℹ Último token: eyJhbGciOiJIUzI1NiIs...

Credenciais de teste:
  Email: test_1770135286@example.com
  Senha: ******************
  User ID: 123456789

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TESTES DE AUTENTICAÇÃO CONCLUÍDOS COM SUCESSO!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Próximos Passos:
  1. Testar endpoints da aplicação com o token
  2. Implementar verificação de email
  3. Implementar reset de senha
  4. Testar em produção (HTTPS)
  5. Implementar rate limiting por usuário
```

---

## 🧑‍💻 Testes Manuais com cURL

Se preferir fazer manualmente, aqui estão os comandos:

### 1. Verificar Health da API

```bash
curl -X GET http://localhost:3011/api/health
```

**Resposta Esperada:**
```json
{
  "status": "ok",
  "timestamp": "2024-02-03T12:00:00.000Z"
}
```

---

### 2. Registrar Novo Usuário

```bash
curl -X POST http://localhost:3011/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"teste@example.com",
    "password":"SenhaSegura123!@#",
    "firstName":"Teste",
    "lastName":"Usuario"
  }'
```

**Resposta Esperada (Sucesso):**
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your email.",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "teste@example.com",
      "firstName": "Teste",
      "lastName": "Usuario",
      "createdAt": "2024-02-03T12:00:00.000Z"
    },
    "verificationRequired": true
  }
}
```

**Resposta Esperada (Email já existe):**
```json
{
  "success": false,
  "message": "Email already registered",
  "code": "EMAIL_EXISTS"
}
```

---

### 3. Login

```bash
curl -X POST http://localhost:3011/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"teste@example.com",
    "password":"SenhaSegura123!@#"
  }'
```

**Resposta Esperada (Sucesso):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "teste@example.com",
      "firstName": "Teste",
      "lastName": "Usuario"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJpYXQiOjE2OTA4MzI0MDAsImV4cCI6MTY5MDg0OTYwMH0.dRz5j9KpL8mN2oQ4sTuV7wXyA0bC1dE2fG3hI4jK5l",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJpYXQiOjE2OTA4MzI0MDAsImV4cCI6MTcwMzQyNDQwMH0.abc123def456"
  }
}
```

**Resposta Esperada (Falha):**
```json
{
  "success": false,
  "message": "Invalid email or password",
  "code": "INVALID_CREDENTIALS"
}
```

---

### 4. Acessar Endpoint Protegido (com Token)

```bash
# Copiar o accessToken da resposta de login
ACCESS_TOKEN="seu_token_aqui"

curl -X GET http://localhost:3011/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Resposta Esperada (Sucesso):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "teste@example.com",
    "firstName": "Teste",
    "lastName": "Usuario",
    "createdAt": "2024-02-03T12:00:00.000Z"
  }
}
```

---

### 5. Acessar Endpoint Protegido (SEM Token)

```bash
curl -X GET http://localhost:3011/api/auth/me
```

**Resposta Esperada (Falha):**
```json
{
  "success": false,
  "message": "No token provided",
  "code": "NO_TOKEN"
}
```

---

### 6. Refresh Token

```bash
REFRESH_TOKEN="seu_refresh_token_aqui"

curl -X POST http://localhost:3011/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken":"'"$REFRESH_TOKEN"'"
  }'
```

**Resposta Esperada (Sucesso):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJpYXQiOjE2OTA4MzI0MDAsImV4cCI6MTY5MDg0OTYwMH0.new_token_here"
  }
}
```

---

### 7. Logout

```bash
ACCESS_TOKEN="seu_token_aqui"
REFRESH_TOKEN="seu_refresh_token_aqui"

curl -X POST http://localhost:3011/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken":"'"$REFRESH_TOKEN"'"
  }'
```

**Resposta Esperada (Sucesso):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## 🔍 Validações Importantes

### ✅ Validação de Senha

```bash
# Senha fraca (menos de 8 caracteres)
curl -X POST http://localhost:3011/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"short","firstName":"Test","lastName":"User"}'
# Esperado: 400 - Senha muito fraca
```

### ✅ Validação de Email

```bash
# Email inválido
curl -X POST http://localhost:3011/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","password":"SenhaSegura123!@#","firstName":"Test","lastName":"User"}'
# Esperado: 400 - Email inválido
```

### ✅ Rate Limiting

```bash
# Fazer múltiplas requisições para testar rate limiting
for i in {1..15}; do
  curl -X POST http://localhost:3011/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo "Tentativa $i"
done
# Esperado: após 10 tentativas, 429 - Too Many Requests
```

---

## 📊 Checklist de Testes

### Registro
- [ ] Email válido aceito
- [ ] Email duplicado rejeitado
- [ ] Senha fraca rejeitada
- [ ] Senha forte aceita
- [ ] Usuário criado no banco de dados
- [ ] Token de verificação gerado

### Login
- [ ] Credenciais corretas aceitas
- [ ] Email incorreto rejeitado
- [ ] Senha incorreta rejeitada
- [ ] Access token retornado
- [ ] Refresh token retornado
- [ ] Token contém user ID
- [ ] Token tem data de expiração

### Endpoints Protegidos
- [ ] Acesso com token válido funciona
- [ ] Acesso sem token rejeitado (401)
- [ ] Acesso com token inválido rejeitado (401)
- [ ] Token expirado rejeitado (401)

### Refresh Token
- [ ] Novo token gerado com sucesso
- [ ] Novo token é diferente do antigo
- [ ] Novo token acessa endpoints protegidos
- [ ] Refresh token inválido é rejeitado

### Logout
- [ ] Logout com token válido sucesso
- [ ] Token é invalidado após logout
- [ ] Próxima requisição com token rejeitada

### Rate Limiting
- [ ] 10 tentativas de login aceitas
- [ ] 11ª tentativa retorna 429
- [ ] Rate limit reseta após 15 minutos

---

## 🐛 Troubleshooting

### Erro: "ECONNREFUSED"
```
Problema: API não está rodando
Solução:
  cd backend
  npm install
  npm start
```

### Erro: "Invalid Token"
```
Problema: JWT_SECRET mudou ou token é inválido
Solução:
  - Gerar novo token com login
  - Verificar JWT_SECRET é igual em todas as instâncias
```

### Erro: "Email already registered"
```
Problema: Email já existe no banco
Solução:
  - Usar email diferente (script automático usa timestamp)
  - Limpar banco de dados para testes: mongosh e db.users.deleteMany({})
```

### Erro: "Rate limit exceeded"
```
Problema: Muitas tentativas
Solução:
  - Aguardar 15 minutos
  - Ou reiniciar servidor
  - Ou mudar endereço IP
```

---

## 📚 Próximos Testes Recomendados

Após validar autenticação:

1. **Testes de Email**
   - [ ] Verificação de email funciona
   - [ ] Link no email é válido
   - [ ] Email não pode ser usado antes de verificação

2. **Testes de Reset de Senha**
   - [ ] Email de reset enviado
   - [ ] Link de reset é válido
   - [ ] Senha é atualizada

3. **Testes de Permissões**
   - [ ] Usuário A não acessa dados de usuário B
   - [ ] Admin pode acessar dados de qualquer usuário
   - [ ] Endpoints específicos requerem permissões

4. **Testes de Performance**
   - [ ] Login em < 500ms
   - [ ] Token validation em < 100ms
   - [ ] Banco de dados índices otimizados

---

## 📝 Template de Relatório de Testes

```
DATA: 3 de Fevereiro de 2024
AMBIENTE: Production / Development / Staging
API URL: https://seu-dominio.com

TESTES EXECUTADOS:
[ ] Health check - PASSOU / FALHOU
[ ] Registro - PASSOU / FALHOU
[ ] Login - PASSOU / FALHOU
[ ] Token validation - PASSOU / FALHOU
[ ] Refresh token - PASSOU / FALHOU
[ ] Endpoints protegidos - PASSOU / FALHOU
[ ] Rate limiting - PASSOU / FALHOU
[ ] Logout - PASSOU / FALHOU

RESUMO:
  Total: 8 testes
  Passou: X
  Falhou: Y
  Taxa de Sucesso: X%

OBSERVAÇÕES:
(adicionar notas, bugs encontrados, etc)

ASSINADO POR:
Nome: ___________
Data: ___________
```

---

**Status:** ✅ Guia de Testes Completo  
**Próximo Passo:** Executar `bash test-authentication.sh`  
**Tempo Estimado:** 30-60 minutos
