# Guia de Visualização do Banco de Dados

Este guia explica como acessar e usar as ferramentas de visualização do banco de dados do projeto.

## 📊 MongoDB Express (Visualizador MongoDB)

**O que é:** Interface web para gerenciar e visualizar o banco de dados MongoDB.

**Acesso:**

- URL: `http://localhost:8081`
- Username: `admin`
- Password: `admin123`

**Funcionalidades:**

- ✅ Visualizar todas as coleções (tabelas)
- ✅ Ver documentos (registros) dentro de cada coleção
- ✅ Criar, editar e deletar documentos
- ✅ Executar queries MongoDB
- ✅ Gerenciar índices
- ✅ Exportar/Importar dados

**Como Usar:**

1. **Ver Coleções:**
   - Na sidebar esquerda, clique em "projeto-sass" (database)
   - Selecione a coleção que deseja visualizar (ex: users, orders, etc)

2. **Ver Documentos:**
   - Clique na coleção desejada
   - Verá lista de todos os documentos
   - Clique em um documento para expandir e ver todos os campos

3. **Editar Documento:**
   - Clique no ícone de editar (lápis) ao lado de um documento
   - Modifique os dados desejados
   - Clique "Update"

4. **Criar Novo Documento:**
   - Dentro de uma coleção, clique em "+ ADD DOCUMENT"
   - Insira os dados em formato JSON
   - Clique "Add"

5. **Deletar Documento:**
   - Clique no ícone de lixeira ao lado do documento
   - Confirme a exclusão

## 🐘 PgAdmin (Visualizador PostgreSQL - Opcional)

**O que é:** Interface web para gerenciar bancos de dados PostgreSQL (para uso futuro).

**Acesso:**

- URL: `http://localhost:5050`
- Username: `admin@vendata.com.br`
- Password: `admin123`

**Nota:** Este serviço está configurado no docker-compose para uso futuro, mas atualmente o projeto usa MongoDB.

## 🚀 Iniciando os Serviços

```bash
# Clonar repositório
git clone <repo-url>
cd projeto-sass

# Iniciar todos os containers
docker-compose up -d

# Aguardar alguns segundos para todos os serviços iniciarem

# Acessar MongoDB Express
open http://localhost:8081

# Ver logs de um serviço específico
docker-compose logs -f mongo-express

# Parar todos os serviços
docker-compose down
```

## 📋 Coleções Principais

### users

Contém informações de usuários do sistema:

- `_id`: ID único do usuário
- `email`: Email do usuário
- `firstName`, `lastName`: Nome do usuário
- `emailVerified`: Se o email foi verificado
- `createdAt`: Data de criação
- `updatedAt`: Data de atualização

### mlaccounts

Contém contas Mercado Livre vinculadas:

- `mlUserId`: ID do usuário no Mercado Livre
- `nickname`: Nome da conta no ML
- `accessToken`: Token para acessar API do ML
- `refreshToken`: Token para renovar accessToken
- `status`: Status da conexão (active/paused/error/expired)

### orders

Contém pedidos sincronizados:

- `mlOrderId`: ID do pedido no Mercado Livre
- `accountId`: Conta vinculada
- `status`: Status do pedido
- `buyer`: Informações do comprador
- `items`: Itens do pedido
- `totalAmount`: Valor total
- `dateCreated`: Data do pedido

### products

Contém produtos do catálogo:

- `mlItemId`: ID do produto no ML
- `title`: Título do produto
- `categoryId`: Categoria
- `price`: Preço atual
- `stock`: Quantidade em estoque
- `status`: Status (active/paused/banned)

## 🔍 Queries Úteis

### Ver todos os usuários verificados

```javascript
db.users.find({ emailVerified: true });
```

### Ver todas as contas Mercado Livre ativas

```javascript
db.mlaccounts.find({ status: "active" });
```

### Ver pedidos de um usuário

```javascript
db.orders.find({ userId: "seu-id-aqui" });
```

### Ver pedidos pagos (dos últimos 30 dias)

```javascript
db.orders.find({
  status: "paid",
  dateCreated: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
});
```

### Contar documentos em uma coleção

```javascript
db.users.countDocuments();
```

## ⚠️ Segurança

**Credenciais Padrão (Desenvolvimento):**

- MongoDB Express: admin/admin123
- PgAdmin: admin@vendata.com.br/admin123
- MongoDB Database: admin/changeme

⚠️ **IMPORTANTE:** Em produção, mude todas as senhas padrão!

## 🔗 Conexão Direta ao MongoDB

Se preferir usar ferramentas externas como MongoDB Compass ou Robo 3T:

```
Connection String: mongodb://admin:changeme@localhost:27017/projeto-sass?authSource=admin
```

**Configuração:**

- Host: localhost
- Port: 27017
- Username: admin
- Password: changeme
- Database: projeto-sass
- Auth Source: admin

## 🐛 Solução de Problemas

### MongoDB Express não conecta

1. Verifique se o container mongo está rodando: `docker-compose ps`
2. Verifique os logs: `docker-compose logs mongo-express`
3. Reinicie o serviço: `docker-compose restart mongo-express`

### Não consigo acessar http://localhost:8081

1. Verifique a porta: `docker-compose logs mongo-express | grep -i port`
2. Espere 30 segundos após iniciar para o serviço estar pronto
3. Limpe cache do navegador (Ctrl+Shift+Delete)

### Esqueci a senha

Edite o `docker-compose.yml` e altere:

- `ME_CONFIG_BASICAUTH_PASSWORD: novo_password`
  Depois reinicie: `docker-compose restart mongo-express`

## 📚 Documentação Adicional

- [MongoDB Express GitHub](https://github.com/mongo-express/mongo-express)
- [MongoDB Query Language](https://docs.mongodb.com/manual/reference/method/db.collection.find/)
- [PgAdmin Documentation](https://www.pgadmin.org/docs/)

---

**Última atualização:** 2024
**Versão:** 1.0.0
