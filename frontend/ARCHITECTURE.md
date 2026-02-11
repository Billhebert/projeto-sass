# Arquitetura do Frontend Refatorado

## 📁 Estrutura de Pastas

```
src-refactored/
├── components/
│   ├── ui/                    # Componentes primitivos (Button, Input, Card, etc.)
│   ├── layout/                # Layouts (Header, Sidebar, Footer, Page)
│   └── forms/                 # Form components reutilizáveis
├── features/                  # Features organizadas por domínio
│   ├── auth/                  # Autenticação e OAuth
│   │   ├── components/        # Componentes específicos de auth
│   │   ├── hooks/             # useAuth, useLogin, etc.
│   │   ├── services/          # authService
│   │   ├── store/             # authStore (Zustand)
│   │   └── types/             # tipos específicos
│   ├── dashboard/             # Dashboard principal
│   ├── ml-accounts/           # Contas do Mercado Livre
│   ├── orders/                # Pedidos
│   ├── items/                 # Produtos/Items
│   ├── catalog/               # Catálogo
│   ├── questions/             # Perguntas
│   └── ...                    # Outros módulos
├── hooks/                     # Hooks globais reutilizáveis
│   ├── useApi.ts              # React Query wrapper
│   ├── useLocalStorage.ts     # localStorage hook
│   ├── useDebounce.ts         # debounce hook
│   └── ...
├── services/                  # Serviços globais
│   ├── api-client.ts          # Cliente HTTP (Axios)
│   ├── cache.ts               # Cache service
│   └── storage.ts             # Storage abstraction
├── store/                     # State management global (Zustand)
│   ├── auth.store.ts          # Auth state
│   ├── ui.store.ts            # UI state (sidebar, theme, etc.)
│   └── index.ts               # Store exports
├── types/                     # TypeScript types globais
│   ├── api.types.ts           # API response types
│   ├── models.types.ts        # Domain models
│   └── utils.types.ts         # Utility types
├── utils/                     # Utility functions
│   ├── format.ts              # Formatters (date, money, etc.)
│   ├── validation.ts          # Validators
│   └── helpers.ts             # Helper functions
├── config/                    # Configurações
│   ├── routes.ts              # Route definitions
│   ├── constants.ts           # App constants
│   └── env.ts                 # Environment vars
├── styles/                    # Estilos globais
│   ├── tokens.ts              # Design tokens
│   ├── global.css             # CSS global
│   └── themes.ts              # Theme definitions
├── assets/                    # Assets estáticos
│   ├── icons/
│   ├── images/
│   └── fonts/
├── App.tsx                    # Root component
└── main.tsx                   # Entry point
```

## 🏗️ Princípios de Arquitetura

### 1. **Feature-Based Structure**
- Cada feature/módulo é autocontido com seus próprios components, hooks, services
- Facilita manutenção e escalabilidade
- Permite lazy loading por feature

### 2. **Separation of Concerns**
- **UI Components**: Apenas apresentação, sem lógica de negócio
- **Hooks**: Lógica reutilizável e side effects
- **Services**: Comunicação com API e serviços externos
- **Store**: State management global
- **Utils**: Funções puras e helpers

### 3. **Type Safety**
- TypeScript em todos os arquivos
- Tipos compartilhados em `/types`
- Tipos específicos de feature dentro da feature

### 4. **Component Composition**
- Componentes pequenos e reutilizáveis
- Composition over inheritance
- Props drilling evitado com context/store quando necessário

## 🎨 Design System

### Tokens
- **Colors**: Primary (ML Yellow), Secondary (ML Blue), Neutral, Success, Warning, Error, Info
- **Spacing**: 4px grid system (1-24)
- **Typography**: Font families, sizes, weights, line heights
- **Border Radius**: sm, base, md, lg, xl, 2xl, full
- **Shadows**: sm, base, md, lg, xl
- **Z-Index**: Predefinidos para layers
- **Transitions**: fast, base, slow

### Componentes UI Base
- **Button**: Variantes (primary, secondary, outline, ghost, danger), sizes (sm, md, lg)
- **Input**: Com label, error, helper text, icons
- **Card**: Com header, content, footer
- **Select**: Dropdown customizado
- **Modal**: Dialog acessível
- **Toast**: Notificações
- **Spinner**: Loading states
- **Badge**: Status indicators
- **Table**: Data tables responsivas
- **Form**: Form components

## 🔄 State Management

### React Query
- **Queries**: Fetch e cache de dados
- **Mutations**: Operações de escrita
- **Optimistic Updates**: Para melhor UX
- **Cache Invalidation**: Estratégia consistente

### Zustand
- **Auth Store**: User, tokens, permissions
- **UI Store**: Sidebar state, theme, modals
- **App Store**: Configurações gerais

## 📡 API Layer

### API Client
- Singleton Axios instance
- Request/Response interceptors
- Auto token attachment
- Error normalization
- Logging padronizado

### Services por Feature
```typescript
// Exemplo: ml-accounts.service.ts
export const mlAccountsService = {
  getAll: () => apiClient.get('/ml-accounts'),
  getById: (id: string) => apiClient.get(`/ml-accounts/${id}`),
  create: (data) => apiClient.post('/ml-accounts', data),
  update: (id: string, data) => apiClient.put(`/ml-accounts/${id}`, data),
  delete: (id: string) => apiClient.delete(`/ml-accounts/${id}`),
};
```

## 🪝 Hooks Pattern

### Custom Hooks
```typescript
// useMLAccounts.ts - React Query wrapper
export const useMLAccounts = () => {
  return useQuery({
    queryKey: ['ml-accounts'],
    queryFn: mlAccountsService.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// usePagination.ts - Reusable pagination
export const usePagination = (totalItems: number, itemsPerPage: number) => {
  const [currentPage, setCurrentPage] = useState(1);
  // ... pagination logic
  return { currentPage, totalPages, goToPage, nextPage, prevPage };
};
```

## ♿ Acessibilidade

- Semantic HTML
- ARIA labels e roles
- Keyboard navigation
- Focus management
- Screen reader support
- Color contrast (WCAG AA)

## ⚡ Performance

- **Code Splitting**: Lazy loading por rota
- **Memoization**: useMemo, useCallback, React.memo
- **Virtual Lists**: Para listas grandes
- **Image Optimization**: Lazy loading, webp
- **Bundle Analysis**: Vite bundle analyzer

## 🧪 Testing

- **Unit Tests**: Vitest + Testing Library
- **Integration Tests**: Testing Library
- **E2E Tests**: Cypress
- **Coverage**: >80% target

## 📚 Documentação

- **Storybook**: Para componentes UI
- **JSDoc**: Para funções complexas
- **README**: Por feature
- **Architecture Decision Records (ADRs)**

## 🚀 Migração Gradual

1. **Fase 1**: Setup base (TypeScript, estrutura, design system) ✅
2. **Fase 2**: Componentes UI base ✅
3. **Fase 3**: API Layer e services ✅
4. **Fase 4**: Auth feature (Login, OAuth)
5. **Fase 5**: Dashboard feature
6. **Fase 6**: ML Accounts feature
7. **Fase 7**: Orders, Items, Catalog
8. **Fase 8**: Demais features
9. **Fase 9**: Performance optimization
10. **Fase 10**: Accessibility audit

## 📦 Próximos Passos

1. ✅ Criar tsconfig.json
2. ✅ Criar estrutura de pastas
3. ✅ Criar design tokens
4. ✅ Criar componentes UI base (Button, Input, Card)
5. ✅ Criar API client
6. ⏳ Criar auth service
7. ⏳ Criar auth store (Zustand)
8. ⏳ Criar hooks de autenticação
9. ⏳ Migrar páginas de Login e OAuth
10. ⏳ Continuar com outras features...

---

**Status Atual**: ✅ Fase 1-3 completas (33% do setup base)

**Próximo**: Vou criar o módulo de autenticação completo como exemplo de feature bem estruturada.
