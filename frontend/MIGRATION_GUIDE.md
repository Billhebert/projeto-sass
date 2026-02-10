# Guia de Migração Rápida

## 🚀 Quick Start - Como usar as melhorias

### 1. Instalação

Todas as dependências já estão instaladas. Se você clonou o projeto recentemente:

```bash
cd frontend
npm install
```

### 2. Desenvolvimento

```bash
npm run dev
```

Acesse: `http://localhost:5173`

### 3. Build de Produção

```bash
npm run build
```

O build otimizado estará em `frontend/dist/`

---

## 📝 Migrando Componentes Existentes

### Passo 1: Substituir API Calls por React Query

**Antes:**

```javascript
function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/orders")
      .then((res) => {
        setOrders(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
```

**Depois:**

```javascript
import { useOrders } from "../hooks/useApi";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";

function Orders() {
  const { data: orders, isLoading, error } = useOrders(accountId);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <div>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
```

**Benefícios:**

- ✅ 15 linhas → 6 linhas
- ✅ Cache automático
- ✅ Refetch automático
- ✅ Loading/error states consistentes

---

### Passo 2: Adicionar Design Tokens

**Antes:**

```css
.card {
  padding: 24px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

**Depois:**

```css
.card {
  padding: var(--spacing-6);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-base);
}
```

**Ou com Tailwind:**

```jsx
<div className="p-6 rounded-md bg-white border border-gray-200 shadow-sm">
```

---

### Passo 3: Padronizar Breakpoints

**Antes:**

```css
.container {
  padding: 16px;
}

@media (max-width: 767px) {
  .container {
    padding: 12px;
  }
}

@media (min-width: 768px) {
  .container {
    padding: 24px;
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 32px;
  }
}
```

**Depois:**

```css
.container {
  padding: 1rem;
}

@media (max-width: 767px) {
  .container {
    padding: var(--spacing-3);
  }
}

@media (min-width: 768px) {
  .container {
    padding: var(--spacing-6);
  }
}

@media (min-width: 1024px) {
  .container {
    padding: var(--spacing-8);
  }
}
```

**Ou com Tailwind:**

```jsx
<div className="p-4 md:p-6 lg:p-8">
```

---

### Passo 4: Usar Hook de Responsividade

**Antes:**

```javascript
function Header() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return <header>{isMobile ? <MobileMenu /> : <DesktopMenu />}</header>;
}
```

**Depois:**

```javascript
import { useResponsive } from "../hooks/useResponsive";

function Header() {
  const { isMobile } = useResponsive();

  return <header>{isMobile ? <MobileMenu /> : <DesktopMenu />}</header>;
}
```

---

## 🆕 Criando Novos Componentes

### Template de Componente

```javascript
// src/components/MyComponent.jsx
import { useState } from "react";
import PropTypes from "prop-types";
import "./MyComponent.css";

/**
 * MyComponent - Descrição do componente
 * @param {Object} props - Props do componente
 */
function MyComponent({ title, data, onAction }) {
  // 1. Hooks customizados
  const { user } = useAuth();

  // 2. Estados locais
  const [isOpen, setIsOpen] = useState(false);

  // 3. Handlers
  const handleClick = () => {
    setIsOpen(!isOpen);
    onAction?.();
  };

  // 4. Early returns
  if (!data) return null;

  // 5. Render
  return (
    <div className="my-component">
      <h2>{title}</h2>
      <button onClick={handleClick}>Toggle</button>
      {isOpen && <div>Content</div>}
    </div>
  );
}

// PropTypes
MyComponent.propTypes = {
  title: PropTypes.string.isRequired,
  data: PropTypes.array,
  onAction: PropTypes.func,
};

// Default Props
MyComponent.defaultProps = {
  data: [],
};

export default MyComponent;
```

### Template de CSS

```css
/* MyComponent.css */

/* Container */
.my-component {
  padding: var(--spacing-4);
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

/* Title */
.my-component h2 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text);
  margin-bottom: var(--spacing-4);
}

/* Responsive */
@media (max-width: 767px) {
  .my-component {
    padding: var(--spacing-3);
  }

  .my-component h2 {
    font-size: var(--text-lg);
  }
}
```

---

## 🎣 Criando Custom Hooks

### Hook para API

```javascript
// src/hooks/useApi.js

export function useMyData(id, options = {}) {
  return useQuery({
    queryKey: ["myData", id],
    queryFn: async () => {
      const response = await api.get(`/my-data/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    ...options,
  });
}

export function useUpdateMyData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/my-data/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalida cache para refetch
      queryClient.invalidateQueries(["myData", variables.id]);
    },
  });
}
```

### Hook Customizado

```javascript
// src/hooks/useMyFeature.js

export function useMyFeature() {
  const [state, setState] = useState(initialState);

  const doSomething = useCallback(() => {
    // lógica aqui
  }, []);

  useEffect(() => {
    // side effects
  }, []);

  return {
    state,
    doSomething,
  };
}
```

---

## 🧪 Testes (Vitest)

### Testando Componentes

```javascript
// src/components/MyComponent.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MyComponent from "./MyComponent";

describe("MyComponent", () => {
  it("renders with title", () => {
    render(<MyComponent title="Test" data={[]} />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("calls onAction when button clicked", () => {
    const handleAction = vi.fn();
    render(<MyComponent title="Test" data={[]} onAction={handleAction} />);

    fireEvent.click(screen.getByText("Toggle"));
    expect(handleAction).toHaveBeenCalledOnce();
  });
});
```

### Testando Hooks

```javascript
// src/hooks/useMyFeature.test.js
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useMyFeature } from "./useMyFeature";

describe("useMyFeature", () => {
  it("returns initial state", () => {
    const { result } = renderHook(() => useMyFeature());
    expect(result.current.state).toBe(initialState);
  });

  it("updates state on action", () => {
    const { result } = renderHook(() => useMyFeature());

    act(() => {
      result.current.doSomething();
    });

    expect(result.current.state).toBe(newState);
  });
});
```

---

## 📦 Estrutura de Páginas

### Nova Página com Lazy Loading

**1. Criar o componente:**

```javascript
// src/pages/MyPage.jsx
import { useMyData } from "../hooks/useApi";
import LoadingState from "../components/LoadingState";

function MyPage() {
  const { data, isLoading } = useMyData();

  if (isLoading) return <LoadingState />;

  return (
    <div className="my-page">
      <h1>My Page</h1>
      {/* content */}
    </div>
  );
}

export default MyPage;
```

**2. Adicionar CSS:**

```css
/* src/pages/MyPage.css */
.my-page {
  padding: var(--spacing-6);
}

.my-page h1 {
  font-size: var(--text-3xl);
  margin-bottom: var(--spacing-6);
}
```

**3. Adicionar lazy loading no App.jsx:**

```javascript
// src/App.jsx
const MyPage = lazy(() => import("./pages/MyPage"));

// Em <Routes>
<Route path="/my-page" element={<MyPage />} />;
```

**4. Adicionar no menu (Sidebar.jsx):**

```javascript
{
  title: "Seção",
  key: "section",
  items: [
    { path: "/my-page", label: "Minha Página", icon: "star" },
  ],
}
```

---

## 🎨 Classes CSS Utilities

```javascript
import { cn, variants, bem } from '../utils/classnames';

// Combinar classes
<div className={cn('button', isActive && 'button-active')}>

// Variantes
<button className={variants('btn', { size: 'lg', variant: 'primary' })}>
// Resulta em: 'btn btn-lg btn-primary'

// BEM
<div className={bem('card', 'title', { large: true })}>
// Resulta em: 'card__title card__title--large'
```

---

## 🚨 Troubleshooting

### Build Error: Module not found

**Problema:** Lazy loading não encontra módulo

**Solução:**

```javascript
// ❌ Errado
const Page = lazy(() => import("./pages/Page"));

// ✅ Correto - caminho relativo ao App.jsx
const Page = lazy(() => import("./pages/Page"));
```

### React Query não funciona

**Problema:** Hooks do React Query não funcionam

**Solução:** Verificar se QueryClientProvider está no main.jsx:

```javascript
// main.jsx
import { QueryClientProvider } from "@tanstack/react-query";

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>;
```

### Tailwind classes não aplicam

**Problema:** Classes do Tailwind não funcionam

**Solução:**

1. Verificar `index.css` tem as diretivas:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

2. Verificar `tailwind.config.js` tem o content correto:

```javascript
content: ["./index.html", "./src/**/*.{js,jsx}"];
```

---

## 📚 Recursos Úteis

### Documentação

- [React Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vitest](https://vitest.dev/)
- [React Router](https://reactrouter.com/)

### Arquivos de Referência

- `frontend/BEST_PRACTICES.md` - Guia completo de boas práticas
- `frontend/REFACTORING_REPORT.md` - Relatório detalhado
- `frontend/src/styles/tokens.js` - Design tokens
- `frontend/src/hooks/useApi.js` - Exemplos de hooks

### Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Preview do build
npm run preview

# Testes
npm run test

# Linting
npm run lint

# Storybook
npm run storybook
```

---

## ✅ Checklist de Migração

Ao migrar um componente, verifique:

- [ ] Substituiu API calls por React Query hooks
- [ ] Usa design tokens (var(--)) em vez de valores hardcoded
- [ ] Usa breakpoints padronizados
- [ ] Componente tem < 200 linhas
- [ ] Tem PropTypes definidos
- [ ] CSS usa tokens e Tailwind quando apropriado
- [ ] Loading e error states são tratados
- [ ] É responsivo (mobile, tablet, desktop)
- [ ] Usa hooks customizados para lógica reutilizável
- [ ] Está documentado com comentários JSDoc

---

**Última atualização:** 10 de Fevereiro de 2026
