# Guia de Verificação de Email

Este documento explica o sistema de verificação de email implementado no projeto.

## 🔐 Fluxo de Verificação de Email

### 1. **Registro do Usuário**

Quando um usuário se registra, o processo é:

```
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "João",
  "lastName": "Silva"
}
```

**Resposta:**

```json
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "João",
      "lastName": "Silva",
      "emailVerified": false
    }
  }
}
```

**O que acontece no backend:**

1. ✅ Validar dados de entrada
2. ✅ Verificar se email já existe
3. ✅ Criar usuário com `emailVerified: false`
4. ✅ Gerar token de verificação (válido por 24 horas)
5. ✅ Enviar email com link de verificação
6. ✅ Retornar resposta (sem JWT token ainda)

### 2. **Email de Verificação**

O usuário recebe um email com:

- Botão "Confirmar Email"
- Link clicável: `https://seu-dominio.com/verify-email/{token}`
- Aviso: Token expira em 24 horas

### 3. **Verificar Email**

O frontend faz a requisição com o token:

```
POST /api/auth/verify-email
{
  "token": "token_recebido_no_email"
}
```

**Resposta de Sucesso:**

```json
{
  "success": true,
  "message": "Email verified successfully!",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "João",
      "lastName": "Silva",
      "emailVerified": true
    },
    "token": "jwt_token_aqui"
  }
}
```

**Resposta de Erro:**

```json
{
  "success": false,
  "error": "Invalid or expired verification token",
  "code": "TOKEN_EXPIRED"
}
```

## 📧 Endpoints de Email

### `POST /api/auth/register`

Registra novo usuário e envia email de verificação.

**Validações:**

- ✅ Email obrigatório e válido
- ✅ Password: mín 8 caracteres
- ✅ FirstName e LastName obrigatórios
- ✅ Email não pode estar duplicado

### `POST /api/auth/verify-email`

Verifica email com token recebido.

**Validações:**

- ✅ Token obrigatório
- ✅ Token deve ser válido
- ✅ Token não pode estar expirado (24 horas)

### `POST /api/auth/resend-verification-email`

Reenviar email de verificação.

```
POST /api/auth/resend-verification-email
{
  "email": "user@example.com"
}
```

**Resposta:**

```json
{
  "success": true,
  "message": "Verification email sent! Please check your inbox."
}
```

**Por segurança, a resposta é sempre positiva mesmo que:**

- Email não exista
- Email já esteja verificado

### `GET /api/auth/email-status/:email`

Verificar status de verificação de um email.

```
GET /api/auth/email-status/user@example.com
```

**Resposta:**

```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "emailVerified": true,
    "emailVerificationExpires": null
  }
}
```

## 🔗 Fluxo de Frontend

### 1. Página de Registro

```jsx
// Register.jsx
const handleRegister = async (formData) => {
  const response = await api.post("/auth/register", {
    email: formData.email,
    password: formData.password,
    firstName: formData.firstName,
    lastName: formData.lastName,
  });

  // Mostrar mensagem: "Verifique seu email"
  // Redirecionar para página de verificação
};
```

### 2. Página de Verificação

```jsx
// VerifyEmail.jsx
useEffect(() => {
  const token = getTokenFromURL(); // de /verify-email/token

  const verifyEmail = async () => {
    const response = await api.post("/auth/verify-email", {
      token: token,
    });

    // Guardar JWT token
    // Redirecionar para dashboard
  };

  verifyEmail();
}, []);
```

### 3. Resend Email

```jsx
// VerifyEmail.jsx
const handleResend = async () => {
  const response = await api.post("/auth/resend-verification-email", {
    email: userEmail,
  });

  // Mostrar mensagem: "Email enviado novamente"
};
```

## 📨 Template de Email

O sistema envia um email HTML formatado com:

```html
🔐 Confirme seu email - Vendata Olá João, Obrigado por se cadastrar no Vendata!
Para completar seu registro, clique no botão abaixo: [Botão: CONFIRMAR EMAIL] Ou
copie e cole este link: https://vendata.com.br/verify-email/TOKEN_AQUI ⚠️
Importante: Este link expira em 24 horas. Se você não solicitou este email,
ignore-o. © 2024 Vendata
```

## 🔄 Lógica de Token

### Geração de Token

```javascript
// No User model
const verificationToken = crypto.randomBytes(32).toString("hex");
const hashedToken = crypto
  .createHash("sha256")
  .update(verificationToken)
  .digest("hex");

user.emailVerificationToken = hashedToken;
user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
```

### Validação de Token

```javascript
// No backend
const hashedProvidedToken = crypto
  .createHash("sha256")
  .update(providedToken)
  .digest("hex");

const user = await User.findOne({
  emailVerificationToken: hashedProvidedToken,
  emailVerificationExpires: { $gt: new Date() },
});

if (!user) {
  // Token inválido ou expirado
}
```

## 📊 Estado do Banco de Dados

### Campo no User Model

```javascript
{
  email: "user@example.com",
  emailVerified: false,
  emailVerificationToken: "hash_do_token",
  emailVerificationExpires: new Date("2024-02-05T09:00:00.000Z")
}
```

### Após Verificação

```javascript
{
  email: "user@example.com",
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationExpires: null
}
```

## ⚙️ Configuração de Email

### Variáveis de Ambiente Necessárias

Para **Modo Test** (default - emails são logados, não enviados):

```bash
EMAIL_PROVIDER=test
FRONTEND_URL=http://localhost:5173
```

Para **Gmail:**

```bash
EMAIL_PROVIDER=gmail
GMAIL_ADDRESS=seu-email@gmail.com
GMAIL_APP_PASSWORD=sua-app-password
FRONTEND_URL=https://seu-dominio.com
```

Para **SMTP Customizado:**

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.seuserver.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-usuario
SMTP_PASSWORD=sua-senha
FRONTEND_URL=https://seu-dominio.com
```

Para **SendGrid:**

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=sua-api-key
FRONTEND_URL=https://seu-dominio.com
```

## 🧪 Testando Localmente

### Modo Test (Recomendado para Desenvolvimento)

1. Registre um novo usuário:

```bash
curl -X POST http://localhost:3011/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

2. Veja o email nos logs do backend:

```bash
docker-compose logs -f api
```

3. Copie o token e verificar manualmente:

```bash
curl -X POST http://localhost:3011/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "TOKEN_DO_LOG"}'
```

### Enviando Emails Reais

1. Configure variáveis de ambiente (ex: Gmail)
2. Reinicie o backend: `docker-compose restart api`
3. Registre um novo usuário
4. Aguarde o email chegar na caixa de entrada
5. Clique no link ou use o endpoint de verificação

## 📱 Fluxo Completo de Exemplo

```
1. Usuário acessa /register
2. Preenche formulário com email, senha, nome
3. Clica "Registrar"
   └─> POST /api/auth/register
   └─> Backend cria user com emailVerified: false
   └─> Backend envia email com token
   └─> Response: "Verifique seu email"
4. Usuário recebe email
5. Clica link de verificação: /verify-email/TOKEN
6. Frontend faz POST /api/auth/verify-email com TOKEN
7. Backend encontra user pelo token
8. Backend marca emailVerified: true
9. Backend retorna JWT token
10. Frontend guarda token em localStorage
11. Frontend redireciona para /dashboard
12. Usuário pode fazer login normalmente
```

## 🚨 Tratamento de Erros

| Erro                                    | Causa                      | Solução                               |
| --------------------------------------- | -------------------------- | ------------------------------------- |
| "Verification token is required"        | Token não enviado          | Envie o token no body                 |
| "Invalid or expired verification token" | Token inválido ou expirado | Solicite reenvio de email             |
| "Email is already verified"             | Email já foi verificado    | Usuário pode fazer login              |
| "Email is already registered"           | Email duplicado            | Use outro email                       |
| "Failed to send verification email"     | Problema ao enviar         | Configure corretamente EMAIL_PROVIDER |

## 📚 Estrutura de Dados

```javascript
// Email Service Status
{
  initialized: boolean,
  provider: "test" | "gmail" | "smtp" | "sendgrid",
  from: "noreply@vendata.com.br"
}

// Verificação Status
{
  emailVerified: boolean,
  emailVerificationExpires: Date | null,
  emailVerificationToken: string | null  // hash do token
}
```

---

**Última atualização:** 2024
**Versão:** 1.0.0
