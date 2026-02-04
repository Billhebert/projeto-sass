# 🔐 Roles & Permissions API Documentation

**Version:** 1.0  
**Status:** ✅ Ready for Production  
**Capacidade:** Suporta até 50K+ usuários com load balancing

---

## 📋 Sumário

Este documento descreve como usar o sistema de **Roles-Based Access Control (RBAC)** para gerenciar permissões e designar admins na aplicação.

---

## 👥 Roles Disponíveis

### 1. **super_admin**

- Acesso total ao sistema
- Pode fazer qualquer coisa
- Geralmente para fundadores/CTO

**Permissões:** Todas (100+)

### 2. **admin**

- Acesso administrativo completo
- Gerencia usuários, produtos, pedidos
- Pode visualizar analytics
- Pode verificar emails manualmente

**Permissões:**

```json
[
  "user:read",
  "user:list",
  "user:update",
  "admin:read",
  "admin:list",
  "admin:verify_email",
  "admin:resend_email",
  "product:read",
  "product:create",
  "product:update",
  "order:read",
  "analytics:read",
  "analytics:export",
  "system:logs"
]
```

### 3. **moderator**

- Acesso moderado
- Pode editar conteúdo
- Pode visualizar dados
- Não pode deletar usuários

**Permissões:**

```json
[
  "user:read",
  "user:list",
  "user:update",
  "product:read",
  "product:update",
  "order:read",
  "analytics:read"
]
```

### 4. **viewer**

- Apenas visualização
- Acesso a dashboards
- Acesso a relatórios
- Sem poder de edição

**Permissões:**

```json
["user:read", "product:read", "order:read", "analytics:read"]
```

### 5. **user** (padrão)

- Usuário comum
- Acesso apenas ao seu perfil
- Pode visualizar seus pedidos
- Sem acesso administrativo

**Permissões:**

```json
[
  "user:read", // Apenas seu próprio perfil
  "product:read",
  "order:read"
]
```

---

## 🔑 Como Designar Admins

### Método 1: Via Admin Panel

1. Acessar `https://vendata.com.br/admin`
2. Fazer login com seu token admin
3. Ir na aba "Gerenciar Usuários"
4. Encontrar o usuário que quer promover
5. Clicar em "Mudar Role"
6. Selecionar "admin" ou "super_admin"
7. Confirmar

### Método 2: Via API

#### Endpoint: Mudar Role de um Usuário

```http
POST /api/admin/users/{email}/role
Content-Type: application/json
x-admin-token: seu-admin-token

{
  "role": "admin"
}
```

**Exemplo com curl:**

```bash
curl -X POST https://api.vendata.com.br/api/admin/users/joao@example.com/role \
  -H "Content-Type: application/json" \
  -H "x-admin-token: seu-admin-token-aqui" \
  -d '{
    "role": "admin"
  }'

# Resposta esperada:
# {
#   "success": true,
#   "message": "User role changed from 'user' to 'admin'",
#   "data": {
#     "email": "joao@example.com",
#     "role": "admin",
#     "oldRole": "user"
#   }
# }
```

### Método 3: Via MongoDB Diretamente

**⚠️ Apenas para emergências!**

```javascript
// Conectar ao MongoDB
mongosh -u admin -p sua-senha --authenticationDatabase admin

// Usar database
use vendata_prod

// Mudar role
db.users.updateOne(
  { email: "joao@example.com" },
  { $set: { role: "admin" } }
)

// Verificar
db.users.findOne({ email: "joao@example.com" }, { email: 1, role: 1 })
```

---

## 🎯 Casos de Uso

### Cenário 1: Promover primeiro admin

```bash
# Seu usuário é admin por padrão quando criado
# Para confirmar:
curl -X GET https://api.vendata.com.br/api/admin/users/seu-email/role \
  -H "x-admin-token: seu-admin-token"

# Resposta:
# {
#   "success": true,
#   "data": {
#     "email": "seu-email@example.com",
#     "role": "admin"
#   }
# }
```

### Cenário 2: Promover moderador

```bash
# Maria será moderadora (pode editar conteúdo)
curl -X POST https://api.vendata.com.br/api/admin/users/maria@example.com/role \
  -H "Content-Type: application/json" \
  -H "x-admin-token: seu-admin-token" \
  -d '{"role": "moderator"}'
```

### Cenário 3: Rebaixar admin para user

```bash
# João saiu da empresa, rebaixar para usuário comum
curl -X POST https://api.vendata.com.br/api/admin/users/joao@example.com/role \
  -H "Content-Type: application/json" \
  -H "x-admin-token: seu-admin-token" \
  -d '{"role": "user"}'
```

### Cenário 4: Promover múltiplos usuários de uma vez

```bash
curl -X POST https://api.vendata.com.br/api/admin/users/bulk-role-update \
  -H "Content-Type: application/json" \
  -H "x-admin-token: seu-admin-token" \
  -d '{
    "userEmails": [
      "maria@example.com",
      "pedro@example.com",
      "ana@example.com"
    ],
    "newRole": "moderator"
  }'

# Resposta:
# {
#   "success": true,
#   "message": "Updated 3 user(s) role to 'moderator'",
#   "data": {
#     "modifiedCount": 3,
#     "newRole": "moderator"
#   }
# }
```

---

## 📊 Endpoints de Gerenciamento

### 1. Mudar Role de um Usuário

```http
POST /api/admin/users/{email}/role
```

**Headers:**

```
x-admin-token: seu-admin-token
Content-Type: application/json
```

**Body:**

```json
{
  "role": "admin|moderator|viewer|user|super_admin"
}
```

**Respostas:**

```json
{
  "success": true,
  "message": "User role changed from 'user' to 'admin'",
  "data": {
    "email": "user@example.com",
    "role": "admin",
    "oldRole": "user"
  }
}
```

---

### 2. Ver Role e Permissões de um Usuário

```http
GET /api/admin/users/{email}/role
```

**Headers:**

```
x-admin-token: seu-admin-token
```

**Resposta:**

```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "firstName": "João",
    "lastName": "Silva",
    "role": "admin",
    "permissions": ["user:read", "product:create", ...]
  }
}
```

---

### 3. Listar Todos os Usuários

```http
GET /api/admin/users?page=1&limit=20&role=admin
```

**Headers:**

```
x-admin-token: seu-admin-token
```

**Query Parameters:**

- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 20)
- `role` (opcional): Filtrar por role

**Resposta:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "email": "joao@example.com",
        "firstName": "João",
        "lastName": "Silva",
        "role": "admin",
        "emailVerified": true,
        "createdAt": "2026-02-04T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

### 4. Listar Todos os Roles Disponíveis

```http
GET /api/admin/roles
```

**Headers:**

```
x-admin-token: seu-admin-token
```

**Resposta:**

```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "value": "super_admin",
        "label": "Super Admin",
        "description": "Acesso total ao sistema. Pode fazer qualquer coisa.",
        "permissions": [
          "user:read",
          "user:create",
          "user:update",
          "user:delete",
          ...
        ]
      },
      {
        "value": "admin",
        "label": "Admin",
        "description": "Acesso administrativo. Gerencia usuários, produtos, pedidos e análises.",
        "permissions": [...]
      }
    ]
  }
}
```

---

### 5. Ver Estatísticas de Roles

```http
GET /api/admin/role-stats
```

**Headers:**

```
x-admin-token: seu-admin-token
```

**Resposta:**

```json
{
  "success": true,
  "data": {
    "total": 5000,
    "byRole": {
      "user": {
        "count": 4850,
        "percentage": "97.00"
      },
      "admin": {
        "count": 100,
        "percentage": "2.00"
      },
      "moderator": {
        "count": 40,
        "percentage": "0.80"
      },
      "viewer": {
        "count": 10,
        "percentage": "0.20"
      }
    }
  }
}
```

---

### 6. Atualizar Roles em Massa

```http
POST /api/admin/users/bulk-role-update
```

**Headers:**

```
x-admin-token: seu-admin-token
Content-Type: application/json
```

**Body:**

```json
{
  "userEmails": ["maria@example.com", "pedro@example.com", "ana@example.com"],
  "newRole": "moderator"
}
```

**Resposta:**

```json
{
  "success": true,
  "message": "Updated 3 user(s) role to 'moderator'",
  "data": {
    "modifiedCount": 3,
    "newRole": "moderator"
  }
}
```

---

## 🛡️ Boas Práticas de Segurança

### ✅ O QUE FAZER

1. **Usar super_admin com cuidado**
   - Apenas para fundadores
   - Nunca compartilhar credenciais

2. **Auditar mudanças de role**
   - Revisar logs regularmente
   - Quem fez a mudança?
   - Quando foi feito?

3. **Revisar admins regularmente**
   - Remover acessos desnecessários
   - Rebaixar quando não precisam mais

4. **Usar senhas fortes**
   - Admin token com 32+ caracteres
   - Armazenar em lugar seguro

5. **Ativar 2FA**
   - Para contas admin
   - Proteção adicional

### ❌ O QUE NÃO FAZER

1. ❌ Não compartilhar admin token
2. ❌ Não usar senhas fracas
3. ❌ Não mudar roles sem auditoria
4. ❌ Não deixar admins demitidos com acesso
5. ❌ Não usar super_admin para rotina

---

## 📊 Permissões Detalhadas

### User Management

```
user:read       - Ler dados de usuários
user:create     - Criar novos usuários
user:update     - Atualizar dados de usuários
user:delete     - Deletar usuários
user:list       - Listar todos os usuários
```

### Admin Management

```
admin:read                - Ler dados de admin
admin:create              - Criar novos admins
admin:update              - Atualizar admins
admin:delete              - Deletar admins
admin:list                - Listar admins
admin:verify_email        - Verificar email manualmente
admin:resend_email        - Reenviar email de verificação
```

### Product Management

```
product:read    - Ler produtos
product:create  - Criar produtos
product:update  - Editar produtos
product:delete  - Deletar produtos
```

### Order Management

```
order:read      - Ler pedidos
order:create    - Criar pedidos
order:update    - Editar pedidos
```

### Analytics

```
analytics:read   - Visualizar análises
analytics:export - Exportar dados
```

### System

```
system:config   - Configurar sistema
system:logs     - Ver logs
system:backup   - Fazer backup
```

---

## 🔄 Fluxo de Integração com Frontend

### Em Admin Panel:

```javascript
// Componente de mudança de role
const changeRole = async (email, newRole) => {
  const response = await api.post(
    `/admin/users/${email}/role`,
    { role: newRole },
    {
      headers: {
        "x-admin-token": localStorage.getItem("adminToken"),
      },
    },
  );

  if (response.data.success) {
    toast.success("Role alterado com sucesso!");
    // Atualizar lista de usuários
    fetchUsers();
  }
};
```

---

## 📈 Escalabilidade com Roles

### Distribuição Recomendada para 5K Usuários

```json
{
  "total_users": 5000,
  "distribution": {
    "user": "4750 (95%)",
    "moderator": "150 (3%)",
    "admin": "90 (1.8%)",
    "viewer": "10 (0.2%)",
    "super_admin": "1-2 (0.02%)"
  }
}
```

### Load Balancing com Roles

```
- Não há impacto no load balancing
- Permissões checadas localmente
- Redis cachearia permissões do user (futuro)
- Escalável horizontalmente
```

---

## 🐛 Troubleshooting

### Problema: "Unauthorized - Admin token required"

```bash
# Solução 1: Verificar token
echo $ADMIN_TOKEN

# Solução 2: Verificar header
curl -v -X GET https://api.vendata.com.br/api/admin/roles \
  -H "x-admin-token: seu-token"

# Solução 3: Checar no banco
mongosh -u admin -p senha
use vendata_prod
db.users.findOne({ role: "admin" })
```

### Problema: "User not found"

```bash
# Verificar se usuário existe
mongosh -u admin -p senha
use vendata_prod
db.users.findOne({ email: "user@example.com" })
```

### Problema: "Invalid role"

```bash
# Roles válidos: user, admin, moderator, viewer, super_admin
curl -X GET https://api.vendata.com.br/api/admin/roles \
  -H "x-admin-token: seu-token"
```

---

## 📝 Logs de Auditoria

Todas as mudanças de role são logadas:

```json
{
  "action": "ADMIN_ROLE_CHANGED",
  "email": "joao@example.com",
  "oldRole": "user",
  "newRole": "admin",
  "timestamp": "2026-02-04T10:00:00.000Z"
}
```

Ver logs:

```bash
docker logs vendata-api-prod | grep "ADMIN_ROLE_CHANGED"
```

---

## 🚀 Próximas Melhorias (Roadmap)

- [ ] Custom permissions por usuário
- [ ] Expiration de roles (acesso temporário)
- [ ] Approvals workflow para mudanças de role
- [ ] Audit trail visual no admin panel
- [ ] Role templates (templates predefinidos)
- [ ] Integração com LDAP/OAuth para SSO

---

**Status:** ✅ Pronto para Produção com 5K+ Usuários

**Próximo passo:** Promova seu primeiro admin usando um dos métodos acima!
