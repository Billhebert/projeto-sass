# 🎨 Guia de Estilo - Frontend SASS ML

## 📋 Índice
1. [Convenções de Código](#convenções-de-código)
2. [Estrutura de Arquivos](#estrutura-de-arquivos)
3. [Componentes](#componentes)
4. [Hooks](#hooks)
5. [Utilitários](#utilitários)
6. [CSS e Estilos](#css-e-estilos)
7. [Nomenclatura](#nomenclatura)
8. [Boas Práticas](#boas-práticas)

---

## Convenções de Código

### Imports
Organize imports na seguinte ordem:
```jsx
// 1. React e bibliotecas externas
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// 2. Componentes
import { StatsCard, Modal } from '../components';

// 3. Hooks
import { useMLAccounts, usePagination } from '../hooks';

// 4. Utils
import { formatDate, handleApiError } from '../utils';

// 5. Services
import api from '../services/api';

// 6. Stores
import { useAuthStore } from '../store/authStore';

// 7. Estilos
import './MyComponent.css';
```

### Estrutura de Componente
```jsx
/**
 * MyComponent - Descrição breve
 * Explicação mais detalhada do propósito
 */
function MyComponent({ prop1, prop2 }) {
  // 1. Hooks (sempre no topo)
  const [state, setState] = useState();
  const customHook = useCustomHook();
  
  // 2. Effects
  useEffect(() => {
    // ...
  }, []);
  
  // 3. Funções
  const handleClick = () => {
    // ...
  };
  
  // 4. Render
  return (
    <div className="my-component">
      {/* JSX */}
    </div>
  );
}

// PropTypes
MyComponent.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
};

export default MyComponent;
```

---

## Estrutura de Arquivos

### Organização de Pastas
```
src/
├── components/          # Componentes reutilizáveis
│   ├── common/          # Básicos (Button, Input)
│   ├── data-display/    # StatsCard, DataTable
│   ├── feedback/        # Modal, Toast, EmptyState
│   ├── navigation/      # FilterTabs, Pagination
│   └── index.js         # Exportações centralizadas
│
├── pages/               # Páginas da aplicação
│   ├── auth/            # Login, Register
│   ├── products/        # Products, Items
│   ├── support/         # Claims, Questions
│   └── ...
│
├── hooks/               # Hooks customizados
│   ├── usePagination.js
│   ├── useFilters.js
│   └── index.js
│
├── utils/               # Funções utilitárias
│   ├── formatters.js    # Formatação
│   ├── status.js        # Status/badges
│   ├── api-helpers.js   # Helpers de API
│   └── index.js
│
├── services/            # Serviços (API, cache)
├── store/               # State management (Zustand)
└── styles/              # CSS global e tokens
```

---

## Componentes

### Quando Criar um Componente

**CRIE** um componente quando:
- ✅ O código é usado em 2+ lugares
- ✅ O componente tem lógica complexa isolável
- ✅ Melhora a legibilidade do código
- ✅ É testável independentemente

**NÃO crie** um componente quando:
- ❌ É usado apenas uma vez
- ❌ É muito simples (< 10 linhas)
- ❌ Não tem lógica reutilizável

### Props e Defaults
```jsx
// ✅ BOM: Props com valores padrão
function Button({ 
  variant = "primary", 
  size = "medium",
  disabled = false,
  children 
}) {
  // ...
}

// ❌ EVITE: Muitas props obrigatórias
function Button({ variant, size, disabled, onClick, className, id }) {
  // Difícil de usar
}
```

### Componentes Controlados vs Não-Controlados
```jsx
// ✅ Componente controlado (recomendado para forms)
function Input({ value, onChange }) {
  return <input value={value} onChange={onChange} />;
}

// ✅ Componente não-controlado (para casos simples)
function Input({ defaultValue }) {
  return <input defaultValue={defaultValue} />;
}
```

---

## Hooks

### Regras de Hooks
1. **Sempre no topo** do componente
2. **Nunca condicionais** (if, loop)
3. **Nomes começam com "use"**

### Quando Criar um Hook

**CRIE** um hook quando:
- ✅ Lógica stateful é reutilizada em 2+ componentes
- ✅ Combina múltiplos hooks nativos
- ✅ Encapsula lógica de side-effects
- ✅ Gerencia estado complexo

**Use os hooks existentes:**
- `useMLAccounts` - Gerenciamento de contas ML
- `usePagination` - Paginação
- `useFilters` - Filtros e busca
- `useSync` - Sincronização
- `useListPage` - Páginas de lista completas

### Exemplo de Hook Customizado
```jsx
/**
 * useDebounce - Debounce de valores
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};
```

---

## Utilitários

### Use as Funções Centralizadas

```jsx
// ✅ BOM: Use utils centralizados
import { formatDate, formatCurrency } from '../utils';

const date = formatDate(order.createdAt);
const price = formatCurrency(product.price);

// ❌ EVITE: Duplicar formatação
const date = new Date(order.createdAt).toLocaleDateString('pt-BR');
const price = `R$ ${product.price.toFixed(2)}`;
```

### Formatters Disponíveis
```jsx
formatDate(date)              // "10/02/2026"
formatDateTime(date)          // "10/02/2026 15:30:00"
formatCurrency(100.50)        // "R$ 100,50"
formatNumber(1000)            // "1.000"
formatPercent(15.5)           // "15,5%"
getTimeSince(date)            // "5 min atrás"
truncateText(text, 50)        // Trunca em 50 chars
pluralize(count, 'item')      // "item" ou "itens"
formatCount(5, 'produto')     // "5 produtos"
```

### Status Utilities
```jsx
import { getStatusBadgeClass, getStatusLabel } from '../utils';

// Em vez de duplicar mapas de status
const badgeClass = getStatusBadgeClass('active', 'product');
const label = getStatusLabel('opened', 'claim');
```

---

## CSS e Estilos

### Estratégia: **Tailwind First**

#### Use Tailwind para:
- ✅ Utilities (margin, padding, flex, grid)
- ✅ Cores do design system
- ✅ Espaçamentos padronizados
- ✅ Layouts responsivos

```jsx
// ✅ BOM: Tailwind utilities
<div className="flex items-center gap-4 p-6 bg-white rounded-lg">
  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
    Click
  </button>
</div>
```

#### Use CSS Modules para:
- ✅ Componentes com muitos estados
- ✅ Animações complexas
- ✅ Estilos que mudam dinamicamente
- ✅ Componentes com variantes complexas

```jsx
// MyComponent.jsx
import styles from './MyComponent.module.css';

<div className={styles.container}>
  <button className={styles.primaryButton}>Click</button>
</div>
```

#### Use CSS Global para:
- ✅ Tokens de design (variáveis CSS)
- ✅ Reset/normalize
- ✅ Fontes e ícones
- ❌ Não use para estilos de componentes

### Variáveis CSS (Design Tokens)
Use as variáveis já definidas em `index.css`:
```css
/* Cores */
var(--primary-600)
var(--success-600)
var(--danger-600)
var(--warning-600)
var(--gray-900)

/* Espaçamento */
var(--spacing-1) /* 0.25rem */
var(--spacing-4) /* 1rem */
var(--spacing-8) /* 2rem */

/* Tipografia */
var(--text-sm)   /* 0.875rem */
var(--text-base) /* 1rem */
var(--text-lg)   /* 1.125rem */
```

### Responsividade
```css
/* Mobile first */
.component {
  padding: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .component {
    padding: 1.5rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .component {
    padding: 2rem;
  }
}
```

### Dark Mode
```css
/* Suporte automático via media query */
@media (prefers-color-scheme: dark) {
  .component {
    background: var(--gray-800);
    color: white;
  }
}
```

---

## Nomenclatura

### Arquivos
```
PascalCase  → Componentes (Button.jsx, StatsCard.jsx)
camelCase   → Hooks (usePagination.js)
camelCase   → Utils (formatters.js, api-helpers.js)
kebab-case  → CSS (stats-card.css, page-header.css)
```

### Variáveis e Funções
```jsx
// ✅ BOM: Nomes descritivos
const selectedAccount = "123";
const handleAccountChange = () => {};
const isLoading = false;

// ❌ EVITE: Nomes genéricos
const data = "123";
const handle = () => {};
const flag = false;
```

### Event Handlers
```jsx
// ✅ BOM: Prefixo "handle"
const handleClick = () => {};
const handleSubmit = () => {};
const handleAccountChange = () => {};

// ❌ EVITE: Nomes confusos
const onClick = () => {};  // Parece prop
const submit = () => {};   // Muito genérico
```

### Boolean States
```jsx
// ✅ BOM: Prefixos is/has/should
const isLoading = false;
const hasError = false;
const shouldShow = true;

// ❌ EVITE: Nomes ambíguos
const loading = false;  // Poderia ser string
const error = false;    // Poderia ser erro
```

---

## Boas Práticas

### 1. DRY (Don't Repeat Yourself)
```jsx
// ✅ BOM: Reutilizar componentes
import { StatsCard } from '../components';

<StatsCard icon="📦" label="Total" value={100} />
<StatsCard icon="✅" label="Ativos" value={80} />

// ❌ EVITE: Duplicar JSX
<div className="stat-card">
  <div className="stat-icon">📦</div>
  <div className="stat-value">100</div>
  <div className="stat-label">Total</div>
</div>
```

### 2. KISS (Keep It Simple, Stupid)
```jsx
// ✅ BOM: Simples e direto
const isActive = status === 'active';

// ❌ EVITE: Complexidade desnecessária
const isActive = ['active', 'enabled'].some(s => 
  status.toLowerCase().trim() === s
);
```

### 3. Early Returns
```jsx
// ✅ BOM: Early return para casos especiais
function Component({ data }) {
  if (!data) return <EmptyState />;
  if (data.error) return <ErrorState />;
  
  return <div>{data.content}</div>;
}

// ❌ EVITE: Aninhamento excessivo
function Component({ data }) {
  return (
    <div>
      {data ? (
        data.error ? (
          <ErrorState />
        ) : (
          <div>{data.content}</div>
        )
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
```

### 4. Composição sobre Herança
```jsx
// ✅ BOM: Composição
function PageLayout({ header, content, footer }) {
  return (
    <div>
      <header>{header}</header>
      <main>{content}</main>
      <footer>{footer}</footer>
    </div>
  );
}

// Use:
<PageLayout 
  header={<PageHeader />}
  content={<MyContent />}
  footer={<Footer />}
/>
```

### 5. Prop Drilling? Use Context ou Zustand
```jsx
// ✅ BOM: Zustand para estado global
import { useAuthStore } from '../store/authStore';

function Component() {
  const { user, logout } = useAuthStore();
  // ...
}

// ❌ EVITE: Prop drilling profundo
<GrandParent user={user}>
  <Parent user={user}>
    <Child user={user}>
      <GrandChild user={user} />
    </Child>
  </Parent>
</GrandParent>
```

### 6. Error Handling
```jsx
// ✅ BOM: Tratamento consistente de erros
import { handleApiError } from '../utils/api-helpers';

try {
  const response = await api.get('/data');
  setData(response.data);
} catch (err) {
  handleApiError(err, 'Erro ao carregar dados');
}

// ❌ EVITE: Erro silencioso
try {
  const response = await api.get('/data');
  setData(response.data);
} catch (err) {
  console.log(err); // Usuário não vê o erro
}
```

### 7. Loading States
```jsx
// ✅ BOM: Feedback visual de carregamento
{loading ? (
  <LoadingState message="Carregando..." />
) : (
  <DataList items={items} />
)}

// ❌ EVITE: Sem feedback
<DataList items={items} />
```

### 8. Acessibilidade
```jsx
// ✅ BOM: Elementos acessíveis
<button
  onClick={handleClick}
  aria-label="Fechar modal"
  disabled={loading}
>
  <span className="material-icons" aria-hidden="true">close</span>
</button>

// ❌ EVITE: Divs clicáveis
<div onClick={handleClick}>
  <span className="material-icons">close</span>
</div>
```

---

## Checklist para Novo Componente

Antes de criar um componente novo, verifique:

- [ ] Este código é usado em 2+ lugares?
- [ ] Já existe um componente similar em `/components`?
- [ ] O componente tem responsabilidade única?
- [ ] Props têm valores padrão quando apropriado?
- [ ] PropTypes estão definidos?
- [ ] Comentário de documentação no topo?
- [ ] Estilos seguem estratégia "Tailwind First"?
- [ ] Componente é acessível (ARIA, keyboard)?
- [ ] Funciona em mobile?
- [ ] Suporta dark mode (se aplicável)?

---

## Recursos Úteis

### Componentes Disponíveis
Veja `/frontend/src/components/` para lista completa de componentes reutilizáveis.

### Hooks Disponíveis
Veja `/frontend/src/hooks/` para lista completa de hooks customizados.

### Utilitários Disponíveis
Veja `/frontend/src/utils/` para lista completa de funções utilitárias.

### Documentação
- `REFACTORING_PROGRESS.md` - Progresso da refatoração
- `BEST_PRACTICES.md` - Melhores práticas gerais
- `MIGRATION_GUIDE.md` - Guia de migração

---

**Última atualização:** Fevereiro 2026  
**Versão:** 1.0
