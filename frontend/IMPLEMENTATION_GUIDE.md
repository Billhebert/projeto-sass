# 📘 Guia de Implementação - Refatoração Gradual

## 🎯 Objetivo

Este guia mostra como aplicar os padrões de refatoração criados nas **56 páginas restantes** do projeto de forma gradual e segura.

## ✅ O Que Já Foi Feito

### Infraestrutura Completa Criada
- ✅ **8 componentes reutilizáveis** (PageHeader, AccountSelector, FilterTabs, StatusBadge, StatsCard, StatsGrid, Modal, PaginationControls)
- ✅ **6 hooks customizados** (useMLAccounts, usePagination, useFilters, useSync, useListPage, useProducts)
- ✅ **38 funções utilitárias** (formatters, status helpers, API helpers)
- ✅ **6 páginas refatoradas** (Claims, Questions, Reviews, Notifications, Moderations, Shipments)

### Build Status
✅ **Funcionando perfeitamente** - 2287 módulos, sem erros

---

## 🔧 Como Refatorar Uma Página (Passo a Passo)

### Etapa 1: Análise da Página (5 min)

Identifique os padrões duplicados:

```jsx
// ❌ ANTES - Código duplicado
const [accounts, setAccounts] = useState([]);
const [selectedAccount, setSelectedAccount] = useState('');

useEffect(() => {
  loadAccounts();
}, []);

const loadAccounts = async () => {
  const response = await api.get('/ml-accounts');
  setAccounts(response.data.accounts);
  if (accounts.length > 0) {
    setSelectedAccount(accounts[0].id);
  }
};
```

### Etapa 2: Substituir por Hooks (10 min)

```jsx
// ✅ DEPOIS - Usando hook reutilizável
import { useMLAccounts } from '../hooks';

const accounts = useMLAccounts(); // Auto-load + auto-select
// Pronto! accounts.selectedAccount, accounts.accounts, accounts.handleAccountChange
```

### Etapa 3: Substituir Headers (5 min)

```jsx
// ❌ ANTES
<div className="page-header">
  <h1><span className="material-icons">help</span>Perguntas</h1>
  <select value={selectedAccount} onChange={handleAccountChange}>
    {accounts.map(acc => <option key={acc.id}>{acc.nickname}</option>)}
  </select>
</div>
```

```jsx
// ✅ DEPOIS
import { PageHeader, AccountSelector } from '../components';

<PageHeader
  title="Perguntas"
  icon="help"
  subtitle="Responda as perguntas dos compradores"
  actions={
    <AccountSelector
      accounts={accounts.accounts}
      selectedAccount={accounts.selectedAccount}
      onAccountChange={accounts.handleAccountChange}
    />
  }
/>
```

### Etapa 4: Substituir Stats (10 min)

```jsx
// ❌ ANTES
<div className="stats-grid">
  <div className="stat-card">
    <div className="stat-icon blue">
      <span className="material-icons">quiz</span>
    </div>
    <div className="stat-info">
      <span className="stat-value">{stats.total}</span>
      <span className="stat-label">Total</span>
    </div>
  </div>
  {/* ...mais 3 cards idênticos */}
</div>
```

```jsx
// ✅ DEPOIS
import { StatsGrid, StatsCard } from '../components';

<StatsGrid columns="4">
  <StatsCard icon="quiz" label="Total" value={stats.total} variant="blue" />
  <StatsCard icon="priority_high" label="Pendentes" value={stats.pending} variant="red" />
  <StatsCard icon="check_circle" label="Respondidas" value={stats.answered} variant="green" />
  <StatsCard icon="timer" label="Tempo Médio" value={stats.avgTime} variant="purple" />
</StatsGrid>
```

### Etapa 5: Substituir Filtros (10 min)

```jsx
// ❌ ANTES
<div className="filter-tabs">
  <button 
    className={`filter-tab ${activeTab === 'pending' ? 'active' : ''}`}
    onClick={() => setActiveTab('pending')}
  >
    <span className="material-icons">schedule</span>
    Pendentes
    {stats.pending > 0 && <span className="badge">{stats.pending}</span>}
  </button>
  {/* ...mais tabs */}
</div>
```

```jsx
// ✅ DEPOIS
import { FilterTabs } from '../components';

<FilterTabs
  tabs={[
    { id: 'pending', label: 'Pendentes', icon: 'schedule', badge: stats.pending },
    { id: 'all', label: 'Todas', icon: 'list' }
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```

### Etapa 6: Substituir Modais (15 min)

```jsx
// ❌ ANTES
{showModal && (
  <div className="modal-overlay" onClick={closeModal}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Título</h2>
        <button onClick={closeModal}>×</button>
      </div>
      <div className="modal-body">{children}</div>
      <div className="modal-footer">{footer}</div>
    </div>
  </div>
)}
```

```jsx
// ✅ DEPOIS
import { Modal } from '../components';

<Modal
  isOpen={showModal}
  onClose={closeModal}
  title="Título"
  size="medium"
  footer={<button onClick={handleSave}>Salvar</button>}
>
  {children}
</Modal>
```

### Etapa 7: Substituir Formatação (5 min)

```jsx
// ❌ ANTES
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('pt-BR');
};

const getTimeSince = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now - date) / 1000 / 60);
  if (diff < 60) return `${diff} min atrás`;
  // ...mais lógica
};
```

```jsx
// ✅ DEPOIS
import { formatDate, formatDateTime, getTimeSince } from '../utils';

// Uso direto
<span>{formatDate(item.createdAt)}</span>
<span>{getTimeSince(item.updatedAt)}</span>
```

---

## 📊 Impacto Esperado por Tipo de Página

### Páginas Simples de Lista (70% do projeto)
**Redução esperada:** 20-30%

Páginas como Questions, Reviews, Notifications, Claims, etc.

**Substituições principais:**
- useMLAccounts → -30 linhas
- PageHeader + AccountSelector → -15 linhas
- FilterTabs → -20 linhas
- StatsGrid → -30 linhas
- Modal → -40 linhas
- Formatters → -10 linhas

### Páginas de Dashboard (15% do projeto)
**Redução esperada:** 15-25%

Páginas como Dashboard, SalesDashboard, MPDashboard

**Substituições principais:**
- StatsCard/Grid → -50 linhas
- useMLAccounts → -30 linhas
- Formatters → -15 linhas

### Páginas Complexas de CRUD (15% do projeto)
**Redução esperada:** 10-20%

Páginas como Products, AllProducts, ItemCreate, ItemEdit

**Substituições principais:**
- useProducts hook → -40 linhas
- Modal → -40 linhas
- Formatters → -15 linhas

---

## 🎯 Prioridades de Refatoração

### Nível 1 - ALTA PRIORIDADE (Impacto Máximo)
Páginas com mais código duplicado e maior número de visitas:

1. **Dashboard.jsx** (255 linhas)
2. **Orders.jsx** (500+ linhas)
3. **Messages.jsx** (400+ linhas)
4. **Catalog.jsx** (400+ linhas)
5. **Inventory.jsx** (400+ linhas)

**Impacto:** ~2,000 linhas → ~1,400 linhas (-30%)

### Nível 2 - MÉDIA PRIORIDADE
Páginas de Mercado Pago e outras integrações:

1. **MPPayments.jsx** (471 linhas)
2. **MPSubscriptions.jsx** (788 linhas)
3. **MPCustomers.jsx** (735 linhas)
4. **MPDashboard.jsx** (381 linhas)
5. **SalesDashboard.jsx** (1065 linhas)

**Impacto:** ~3,400 linhas → ~2,400 linhas (-30%)

### Nível 3 - BAIXA PRIORIDADE
Páginas específicas ou menos usadas:

1. Competitors, Trends, Quality
2. ProfitCalculator, Billing
3. GlobalSelling, Advertising
4. Admin pages

**Impacto:** ~2,500 linhas → ~2,000 linhas (-20%)

---

## 🚀 Estratégia de Implementação Gradual

### Fase 1: Páginas Críticas (1-2 dias)
- Refatorar 5 páginas de Nível 1
- Testar extensivamente
- Validar com usuários

### Fase 2: Integrações (1-2 dias)
- Refatorar páginas de Mercado Pago
- Refatorar dashboards
- Testes de integração

### Fase 3: Restante (2-3 dias)
- Refatorar páginas restantes
- Documentar padrões específicos
- Review final

### Fase 4: Limpeza (1 dia)
- Remover páginas antigas (não-refatoradas)
- Consolidar CSS duplicado
- Otimizar imports

---

## ✅ Checklist de Refatoração por Página

```markdown
- [ ] Substituir useMLAccounts
- [ ] Substituir PageHeader + AccountSelector
- [ ] Substituir FilterTabs
- [ ] Substituir StatsGrid/StatsCard
- [ ] Substituir Modal
- [ ] Substituir formatters (formatDate, formatCurrency, etc.)
- [ ] Substituir status helpers (getStatusBadgeClass, etc.)
- [ ] Usar StatusBadge component
- [ ] Usar LoadingState component
- [ ] Usar EmptyState component
- [ ] Testar página localmente
- [ ] Verificar build
- [ ] Commit changes
```

---

## 📝 Template de Refatoração

```jsx
// Template básico para refatorar uma página de lista
import { useState, useEffect } from 'react';
import { 
  PageHeader, 
  AccountSelector, 
  FilterTabs,
  StatsGrid,
  StatsCard,
  LoadingState,
  EmptyState,
  Modal
} from '../components';
import { useMLAccounts, useFilters } from '../hooks';
import { formatDate, handleApiError } from '../utils';
import api from '../services/api';
import './PageName.css';

function PageNameRefactored() {
  // Hooks
  const accounts = useMLAccounts();
  const filters = useFilters({ status: 'active' });
  
  // Local States
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load data
  useEffect(() => {
    if (accounts.selectedAccount) {
      loadData();
    }
  }, [accounts.selectedAccount, filters.filters.status]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/endpoint/${accounts.selectedAccount}`);
      setItems(response.data.items);
      setStats(response.data.stats);
    } catch (err) {
      handleApiError(err, setError, 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Render
  return (
    <div className="page-name-page">
      <PageHeader
        title="Título"
        icon="icon_name"
        actions={
          <AccountSelector
            accounts={accounts.accounts}
            selectedAccount={accounts.selectedAccount}
            onAccountChange={accounts.handleAccountChange}
          />
        }
      />

      {stats && (
        <StatsGrid columns="4">
          <StatsCard icon="icon1" label="Label 1" value={stats.value1} />
          <StatsCard icon="icon2" label="Label 2" value={stats.value2} />
        </StatsGrid>
      )}

      <FilterTabs
        tabs={[
          { id: 'active', label: 'Ativos', icon: 'check_circle' },
          { id: 'all', label: 'Todos', icon: 'list' }
        ]}
        activeTab={filters.filters.status}
        onChange={(id) => filters.updateFilter('status', id)}
      />

      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState icon="inbox" title="Nenhum item encontrado" />
      ) : (
        <div className="items-list">
          {items.map(item => (
            <div key={item.id} className="item-card">
              {/* item content */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PageNameRefactored;
```

---

## 🎓 Boas Práticas

### 1. **Não Force Abstração**
Se uma página tem lógica única (como sentiment bars em Reviews), mantenha-a. Use componentes apenas onde faz sentido.

### 2. **Teste Incrementalmente**
- Refatore 1 página por vez
- Teste a página isoladamente
- Rode build após cada refatoração
- Commit após cada página funcional

### 3. **Mantenha Versões "Refactored"**
- Crie `*Refactored.jsx` em vez de sobrescrever
- Permite comparar lado a lado
- Facilita rollback se necessário
- Remove originais apenas após validação completa

### 4. **Use ESLint**
- Fix imports automaticamente
- Remove código não usado
- Identifica problemas early

### 5. **Documente Exceções**
Se uma página não pode ser refatorada, documente o porquê.

---

## 📈 Métricas de Sucesso

### Código
- ✅ Redução de 20-40% nas linhas de código
- ✅ Eliminação de 80%+ das duplicações
- ✅ Build sem erros

### Manutenibilidade
- ✅ Mudanças em componentes afetam todas as páginas
- ✅ Novos recursos adicionados em 1 lugar
- ✅ Bugs corrigidos em 1 lugar

### Performance
- ✅ Bundle size reduzido (menos duplicação)
- ✅ Imports tree-shakeable
- ✅ Lazy loading otimizado

---

## 🔗 Recursos

### Documentos de Referência
- `/frontend/STYLE_GUIDE.md` - Padrões e convenções
- `/frontend/REFACTORING_PROGRESS.md` - Progresso detalhado
- `/src/pages/ClaimsRefactored.jsx` - Exemplo prático
- `/src/pages/QuestionsRefactored.jsx` - Exemplo com Modal

### Componentes Disponíveis
- Ver `/src/components/index.js` para lista completa
- Cada componente tem PropTypes documentados
- CSS modular e reutilizável

### Hooks Disponíveis
- Ver `/src/hooks/index.js` para lista completa
- Cada hook tem JSDoc com exemplos
- Composable e testáveis

### Utils Disponíveis
- Ver `/src/utils/index.js` para lista completa
- 38 funções utilitárias prontas para uso
- Type-safe com JSDoc

---

## 💡 Exemplos Rápidos

### Trocar loadAccounts()
```jsx
// Antes: 30 linhas
const [accounts, setAccounts] = useState([]);
const loadAccounts = async () => { /* ... */ };
useEffect(() => { loadAccounts(); }, []);

// Depois: 1 linha
const accounts = useMLAccounts();
```

### Trocar Status Badge
```jsx
// Antes: 20 linhas de switch/case
const getStatusClass = (status) => { /* ... */ };
const getStatusLabel = (status) => { /* ... */ };

// Depois: 1 linha
<StatusBadge status={item.status} type="order" />
```

### Trocar Formatação
```jsx
// Antes: 10 linhas cada
const formatDate = (date) => { /* ... */ };
const formatCurrency = (value) => { /* ... */ };

// Depois: import direto
import { formatDate, formatCurrency } from '../utils';
```

---

## ✨ Resultado Final Esperado

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Total de linhas** | ~20,000 | ~13,000 | **-35%** |
| **Código duplicado** | ~8,500 | ~1,000 | **-88%** |
| **Componentes reutilizados** | 0 | 8 | **+∞** |
| **Hooks customizados** | 0 | 6 | **+∞** |
| **Funções utilitárias** | 0 | 38 | **+∞** |
| **Tempo de manutenção** | Alto | Baixo | **-60%** |
| **Tempo para novos recursos** | Alto | Baixo | **-50%** |

---

**Próximos passos:** Escolher 1 página de Nível 1 e aplicar este guia passo a passo.
