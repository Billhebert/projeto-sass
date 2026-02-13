# 🛍️ Vendata - Plataforma SaaS para Vendedores do Mercado Livre

![Status](https://img.shields.io/badge/status-production--ready-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

Plataforma completa para gerenciamento de vendas no Mercado Livre com integração de 100% das funcionalidades da API oficial.

## 📋 Índice

- [Características](#características)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Deploy](#deploy)
- [Funcionalidades](#funcionalidades)
- [SDK do Mercado Livre](#sdk-do-mercado-livre)
- [Screenshots](#screenshots)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

## ✨ Características

- ✅ **100% do SDK do Mercado Livre** (~299 métodos, 30 recursos)
- ✅ **Multi-tenant** com suporte a múltiplas contas ML por usuário
- ✅ **OAuth 2.0** integrado com Mercado Livre
- ✅ **Dashboard completo** com analytics e métricas
- ✅ **Gerenciamento de produtos, pedidos, envios**
- ✅ **Automação de preços e promoções**
- ✅ **Sistema de notificações e alertas**
- ✅ **Documentos fiscais e billing**
- ✅ **Gráficos interativos** com Recharts
- ✅ **Design responsivo** com Tailwind CSS
- ✅ **TypeScript** end-to-end

## 🛠️ Tecnologias

### Backend
- **NestJS** - Framework Node.js escalável
- **Prisma** - ORM moderno para PostgreSQL
- **TypeScript** - Type safety
- **JWT** - Autenticação segura
- **Socket.io** - WebSockets (opcional)

### Frontend
- **Next.js 14** - React framework
- **React Query** - State management
- **Tailwind CSS** - Styling
- **Recharts** - Gráficos
- **Axios** - HTTP client

### Database
- **PostgreSQL** - Banco de dados relacional

### DevOps
- **PM2** - Process manager
- **Nginx** - Reverse proxy
- **Let's Encrypt** - SSL certificates

## 🏗️ Arquitetura

```
projeto-sass/
├── apps/
│   ├── api/                      # Backend NestJS
│   │   ├── src/
│   │   │   ├── auth/            # Autenticação JWT
│   │   │   ├── mercadolivre/    # Integração ML (1347 linhas)
│   │   │   ├── users/           # Gestão de usuários
│   │   │   ├── organizations/   # Multi-tenant
│   │   │   └── dashboard/       # Analytics
│   │   └── prisma/              # Schema do banco
│   │
│   └── web/                      # Frontend Next.js
│       ├── src/
│       │   ├── app/             # Pages (28 rotas)
│       │   │   ├── dashboard/   # Dashboard principal
│       │   │   ├── admin/       # Painel admin
│       │   │   └── auth/        # Login/Register
│       │   ├── components/      # Componentes reutilizáveis
│       │   └── lib/             # Utilities
│       └── public/              # Assets estáticos
│
├── packages/
│   └── sdk-mercadolivre/        # SDK customizado do ML
│       └── src/resources/       # 30 recursos, ~299 métodos
│
├── ecosystem.config.json         # Configuração PM2
├── nginx.conf                    # Configuração Nginx
├── deploy.sh                     # Script de deploy
└── DEPLOY.md                     # Guia de instalação
```

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### 1. Clonar repositório
```bash
git clone <seu-repositorio>
cd projeto-sass
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente

**apps/api/.env**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/vendata"
JWT_SECRET="sua_chave_secreta"
ML_CLIENT_ID="1706187223829083"
ML_CLIENT_SECRET="vjEgzPD85Ehwe6aefX3TGij4xGdRV0jG"
ML_REDIRECT_URI="https://vendata.com.br/auth/callback"
```

**apps/web/.env.local**
```env
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### 4. Executar migrações
```bash
npm run prisma:migrate:dev --workspace=apps/api
```

### 5. Iniciar em desenvolvimento

Terminal 1 - API:
```bash
npm run dev --workspace=apps/api
```

Terminal 2 - Frontend:
```bash
npm run dev --workspace=apps/web
```

Acesse:
- Frontend: http://localhost:3001
- API: http://localhost:3000
- API Docs: http://localhost:3000/api

## 🚀 Deploy

Para deploy em produção, siga o guia completo em [DEPLOY.md](./DEPLOY.md)

**Quick deploy:**
```bash
sudo ./deploy.sh production
```

## 🎯 Funcionalidades

### Dashboard Principal
- Overview de vendas e métricas
- Gráficos de performance
- Top produtos
- Alertas e notificações

### Produtos
- Listagem com filtros e busca
- Pausar/Ativar produtos
- Deletar com confirmação
- Ver no Mercado Livre

### Precificação
- Sugestões de preços do ML
- Aplicar preços com um clique
- Histórico de alterações
- Automação de preços

### Promoções
- Criar promoções
- Ativar/Pausar
- Gerenciar descontos
- Acompanhar performance

### Pedidos
- Lista de pedidos
- Filtros por status
- Detalhes completos
- Link para ML

### Envios
- Status de envios
- Baixar etiquetas
- Marcar como pronto
- Histórico de rastreamento

### Perguntas
- Responder perguntas
- Filtrar por status
- Histórico completo

### Reclamações
- Ver detalhes
- Enviar mensagens
- Resolver disputas

### Billing
- Receita bruta/líquida
- Taxas do ML
- Documentos fiscais
- Histórico de transações

### Analytics
- Gráficos interativos
- Métricas de conversão
- Top performers
- Tendências

### Administração
- Gerenciar usuários
- Organizações
- Contas ML conectadas
- Permissões

## 📚 SDK do Mercado Livre

O projeto inclui um SDK completo com 30 recursos e ~299 métodos:

### Recursos Implementados

1. **Billing** (22 métodos) - Notas fiscais, documentos
2. **Catalog** (18 métodos) - Produtos, categorias
3. **Pricing** (14 métodos) - Sugestões, automação
4. **Promotions** (7 métodos) - Ofertas, descontos
5. **Advertising** (8 métodos) - Product Ads
6. **Questions** (3 métodos) - Perguntas/respostas
7. **Orders** (8 métodos) - Pedidos, pagamentos
8. **Shipments** (12 métodos) - Envios, etiquetas
9. **Claims** (6 métodos) - Mediações
10. **Reports** (7 métodos) - Relatórios
11. **Trends** (5 métodos) - Tendências
12. **Reputation** (7 métodos) - Reputação
13. **Visits** (3 métodos) - Visitas
14. **Fulfillment** (10 métodos) - Full
15. **Search** (8 métodos) - Busca
16. **Currencies** (4 métodos) - Conversão
17. **Categories** (6 métodos) - Categorias
18. **Locations** (5 métodos) - Localização
19. **User** (8 métodos) - Dados do usuário
20. **OAuth** (4 métodos) - Autenticação
21. **Messages** (5 métodos) - Mensagens
22. **Feedback** (4 métodos) - Avaliações
23. **[+7 outros recursos]**

### Exemplo de Uso

```typescript
import { MercadoLivreSDK } from '@/packages/sdk-mercadolivre';

const sdk = new MercadoLivreSDK(accessToken);

// Listar produtos
const products = await sdk.items.getByUserId(userId);

// Atualizar preço
await sdk.items.update(itemId, { price: 99.90 });

// Criar promoção
await sdk.promotions.create({
  name: 'Black Friday',
  discount: 20,
  items: [itemId]
});
```

## 📸 Screenshots

### Dashboard
![Dashboard](./docs/screenshots/dashboard.png)

### Produtos
![Produtos](./docs/screenshots/products.png)

### Analytics
![Analytics](./docs/screenshots/analytics.png)

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👥 Autores

- **Seu Nome** - *Desenvolvimento inicial*

## 📞 Suporte

- Email: suporte@vendata.com.br
- Website: https://vendata.com.br
- Documentação: https://docs.vendata.com.br

## 🙏 Agradecimentos

- Mercado Livre pela API completa
- Comunidade NestJS e Next.js
- Todos os contribuidores

---

**Feito com ❤️ para vendedores do Mercado Livre**

🚀 **Ready for Production!**
