# Mongo Express - Interface Web para MongoDB

## Acesso

**URL:** http://147.79.107.33:8081

**Login:** admin  
**Senha:** SecureAdminToken2024Vendata

## Para acessar remotamente

No seu navegador, acesse:

```
http://147.79.107.33:8081
```

Faça login com:

- **Username:** admin
- **Password:** SecureAdminToken2024Vendata

## Para criar DNS (mongodb.vendata.com.br)

No seu provedor de DNS, adicione:

```
Tipo: A
Nome: mongodb
Valor: 147.79.107.33
TTL: 3600
```

Depois de propagar, você poderá acessar:

```
https://mongodb.vendata.com.br
```

## Banco de Dados

- **Host:** vendata-mongo (docker)
- **Porta:** 27017
- **Usuário:** meAdmin
- **Senha:** SecureMongo2024Vendata
- **Banco:** projeto-sass

## Para acessar via MongoDB Compass

Connection String:

```
mongodb://meAdmin:SecureMongo2024Vendata@147.79.107.33:27017/projeto-sass?authSource=admin
```

## Usuários do MongoDB

| Usuário | Senha                  | Permissões                |
| ------- | ---------------------- | ------------------------- |
| admin   | SecureMongo2024Vendata | root                      |
| meAdmin | SecureMongo2024Vendata | root (para Mongo Express) |
