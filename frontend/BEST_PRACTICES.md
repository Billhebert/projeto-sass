# Frontend Best Practices & Style Guide

## 📁 Estrutura de Arquivos

### Organização de Componentes

```
src/
├── components/         # Componentes reutilizáveis
│   ├── Button/
│   │   ├── Button.jsx
│   │   ├── Button.css
│   │   ├── Button.test.jsx
│   │   └── index.js
│   └── ...
├── pages/             # Páginas/rotas
├── hooks/             # Custom hooks
├── services/          # Serviços de API
├── store/             # State management (Zustand)
├── utils/             # Utilitários
├── styles/            # Estilos globais e tokens
└── ...
```

## 🎨 CSS & Styling

### 1. Use Design Tokens

**SEMPRE** use os tokens definidos em `styles/tokens.js` e `index.css`:

```css
/* ❌ Evitar valores hardcoded */
.button {
  color: #3b82f6;
  padding: 16px;
  border-radius: 8px;
}

/* ✅ Usar design tokens */
.button {
  color: var(--primary-500);
  padding: var(--spacing-4);
  border-radius: var(--radius-md);
}
```

### 2. Breakpoints Padronizados

Use os breakpoints definidos em `styles/breakpoints.js`:

```css
/* ❌ Evitar breakpoints aleatórios */
@media (max-width: 767px) {
}
@media (max-width: 768px) {
}
@media (min-width: 1025px) {
}

/* ✅ Usar breakpoints padronizados */
@media (max-width: 767px) {
} /* mobile */
@media (min-width: 768px) and (max-width: 1023px) {
} /* tablet */
@media (min-width: 1024px) {
} /* desktop */
```

### 3. Mobile-First Approach

Escreva CSS mobile-first e adicione media queries para telas maiores:

```css
/* ✅ Mobile-first */
.container {
  padding: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .container {
    padding: 2rem;
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 3rem;
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### 4. Nomenclatura BEM (Opcional)

Para componentes complexos, considere usar BEM:

```css
/* Block */
.card {
}

/* Element */
.card__header {
}
.card__body {
}
.card__footer {
}

/* Modifier */
.card--large {
}
.card--primary {
}
```

### 5. Tailwind CSS Integration

Você pode misturar CSS customizado com Tailwind utilities:

```jsx
// ✅ Tailwind para utilitários simples
<div className="flex items-center gap-4 p-4">
  <Button />
</div>

// ✅ CSS customizado para componentes complexos
<div className="dashboard-stats">
  <StatCard />
</div>
```

## ⚛️ React Best Practices

### 1. Use Lazy Loading para Rotas

**SEMPRE** lazy load páginas não-críticas:

```jsx
// ✅ Lazy loading
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Orders = lazy(() => import("./pages/Orders"));

// Wrap com Suspense
<Suspense fallback={<LoadingState />}>
  <Routes>
    <Route path="/" element={<Dashboard />} />
  </Routes>
</Suspense>;
```

### 2. Use React Query para API Calls

**NUNCA** faça API calls diretamente nos componentes:

```jsx
// ❌ Evitar
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  api.get("/orders").then((res) => {
    setData(res.data);
    setLoading(false);
  });
}, []);

// ✅ Usar React Query hooks
import { useOrders } from "../hooks/useApi";

const { data, isLoading } = useOrders(accountId);
```

### 3. Custom Hooks para Lógica Reutilizável

Extraia lógica complexa para custom hooks:

```jsx
// ✅ Custom hook
function useOrderFilters() {
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState("date");

  const filteredOrders = useMemo(() => {
    // lógica de filtro
  }, [orders, filters, sortBy]);

  return { filteredOrders, filters, setFilters, sortBy, setSortBy };
}

// Uso no componente
function OrdersPage() {
  const { filteredOrders, filters, setFilters } = useOrderFilters();
  // ...
}
```

### 4. PropTypes para Validação

**SEMPRE** adicione PropTypes aos componentes:

```jsx
import PropTypes from "prop-types";

function Button({ variant, size, children, onClick, disabled }) {
  return <button>...</button>;
}

Button.propTypes = {
  variant: PropTypes.oneOf(["primary", "secondary", "danger"]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
};

Button.defaultProps = {
  variant: "primary",
  size: "md",
  disabled: false,
};
```

### 5. Componentes Pequenos e Focados

Componentes devem ter **uma** responsabilidade:

```jsx
// ❌ Componente muito grande (700+ linhas)
function Dashboard() {
  // 50 states
  // 30 useEffects
  // lógica de API
  // renderização complexa
}

// ✅ Componentes modulares
function Dashboard() {
  return (
    <>
      <DashboardHeader />
      <DashboardStats />
      <DashboardCharts />
      <DashboardAlerts />
      <DashboardRecentOrders />
    </>
  );
}
```

## ♿ Acessibilidade

### 1. Roles e Labels ARIA

```jsx
// ✅ ARIA labels
<button
  aria-label="Fechar modal"
  aria-pressed={isActive}
>
  <span aria-hidden="true">×</span>
</button>

<div role="region" aria-label="Estatísticas do dashboard">
  <DashboardStats />
</div>
```

### 2. Navegação por Teclado

```jsx
// ✅ Suporte a teclado
function Dropdown({ items, onSelect }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(item);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => onSelect(item)}
    >
      {item.label}
    </div>
  );
}
```

### 3. Contraste e Textos Alternativos

```jsx
// ✅ Alt text para imagens
<img src={product.image} alt={`Foto do produto ${product.name}`} />

// ✅ Loading state com texto
<div aria-live="polite" aria-busy={isLoading}>
  {isLoading ? 'Carregando...' : <Content />}
</div>
```

## 📱 Responsividade

### 1. Use useResponsive Hook

```jsx
import { useResponsive } from "../hooks/useResponsive";

function Header() {
  const { isMobile, isDesktop } = useResponsive();

  return <header>{isMobile ? <MobileMenu /> : <DesktopMenu />}</header>;
}
```

### 2. Grid e Flexbox Responsivos

```css
/* ✅ Grid responsivo */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
}
```

## 🧪 Testing

### 1. Testes Unitários

```jsx
import { render, screen } from "@testing-library/react";
import Button from "./Button";

describe("Button", () => {
  it("renders with correct text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    screen.getByText("Click").click();
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

## 🚀 Performance

### 1. Memoização

```jsx
// ✅ useMemo para cálculos pesados
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.price - b.price);
}, [items]);

// ✅ useCallback para funções
const handleSubmit = useCallback((data) => {
  api.post("/orders", data);
}, []);
```

### 2. Lazy Loading de Imagens

```jsx
// ✅ Loading lazy
<img src={product.image} alt={product.name} loading="lazy" />
```

### 3. Virtualization para Listas Longas

Para listas com 100+ itens, use virtualização:

```jsx
import { FixedSizeList } from "react-window";

function OrdersList({ orders }) {
  return (
    <FixedSizeList height={600} itemCount={orders.length} itemSize={80}>
      {({ index, style }) => (
        <div style={style}>
          <OrderCard order={orders[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

## 📝 Code Style

### 1. Imports Organizados

```jsx
// ✅ Ordem de imports
// 1. React e bibliotecas externas
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 2. Componentes internos
import Button from "../components/Button";
import Modal from "../components/Modal";

// 3. Hooks
import { useOrders } from "../hooks/useApi";
import { useResponsive } from "../hooks/useResponsive";

// 4. Utils e services
import api from "../services/api";
import { formatDate } from "../utils/date";

// 5. Estilos
import "./OrdersPage.css";
```

### 2. Destruct Props

```jsx
// ❌ Evitar
function Button(props) {
  return (
    <button className={props.className} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

// ✅ Destruct no parâmetro
function Button({ className, onClick, children }) {
  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  );
}
```

### 3. Early Returns

```jsx
// ✅ Early returns
function OrderCard({ order }) {
  if (!order) return null;
  if (order.status === "cancelled") return <CancelledOrder />;

  return <ActiveOrder order={order} />;
}
```

## 🔒 Segurança

### 1. Sanitização de HTML

```jsx
// ❌ Evitar dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />;

// ✅ Sanitizar antes de renderizar
import DOMPurify from "dompurify";

const sanitizedHtml = DOMPurify.sanitize(userInput);
<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
```

### 2. Validação de Inputs

```jsx
// ✅ Validação de formulários
import { z } from "zod";

const orderSchema = z.object({
  quantity: z.number().min(1).max(100),
  price: z.number().positive(),
  email: z.string().email(),
});

function OrderForm() {
  const handleSubmit = (data) => {
    const result = orderSchema.safeParse(data);
    if (!result.success) {
      // handle errors
    }
  };
}
```

## 📚 Recursos

- [React Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Vitest Docs](https://vitest.dev/)
- [React Router Docs](https://reactrouter.com/)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)
