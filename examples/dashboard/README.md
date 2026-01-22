# Dashboard - Documentação

## Sumário

Uma dashboard profissional e responsiva de vendas e faturamento com:

- **5 Cards principais** com KPIs: Vendas, Custo & Imposto, Tarifa, Frete, Margem
- **Mini-blocos** com subtotais por tipo de frete
- **Tabela de dados** com 14 colunas, paginação, ordenação, busca e export CSV
- **Gráfico Donut** com distribuição de custos (vanilla JS)
- **Painel lateral** com filtros dinâmicos
- **Design responsivo** (desktop, tablet, mobile)
- **Skeletons** para estados de loading
- **Acessibilidade** com aria-labels e keyboard navigation

---

## Estrutura de Arquivos

```
projeto-sass/
├── src/
│   ├── styles/
│   │   ├── _variables.scss      # Design tokens (cores, fontes, sombras)
│   │   ├── _layout.scss         # Layout principal, topbar, grid
│   │   ├── _cards.scss          # Componentes dos cards de KPI
│   │   ├── _sidebar.scss        # Filtros, gráfico, estilos do painel
│   │   ├── _table.scss          # Tabela, paginação, responsividade
│   │   └── dashboard.scss       # Main (imports)
│   └── scripts/
│       └── dashboard.js         # Lógica da dashboard (vanilla JS)
├── examples/
│   ├── login.html               # Página de login (redirecionador)
│   └── dashboard/
│       └── index.html           # Dashboard principal
├── dist/
│   └── styles/
│       └── dashboard.css        # CSS compilado (auto-gerado)
└── README.md
```

---

## Componentes Principais

### 1. Topbar
- Logo/Brand
- Avatar do usuário
- Botão de logout (redirecionador)

### 2. Cards de KPI (5 principais)
Cada card possui:
- **Stripe colorida** no topo (identificação visual)
- **Título + ícone de info** (tooltip)
- **Subtítulo** (contexto, ex: "Faturamento ML")
- **Valor principal em destaque** (grande fonte, monospace)
- **Mini-blocos opcionais** (subtotais por categoria: Places/Coleta, Flex, Full, ME1)
- **Hover / Focus micro-interações**
- **Skeleton loading** durante fetch simulado

**Cards:**
1. **Vendas Aprovadas** — R$ 6.954,98 + minis (Places, Flex, Full, ME1)
2. **Custo & Imposto** — R$ 3.799,77 + minis (Custo, Imposto)
3. **Tarifa de Venda** — R$ 1.266,52
4. **Frete Total** — R$ 679,93
5. **Margem de Contribuição** — R$ 1.285,73 + mini (MC %)

### 3. Painel Lateral (Desktop) / Abaixo (Mobile)

#### Filtros
- **Data Início** (date input)
- **Data Fim** (date input)
- **Título / MLB** (text search)
- **SKU** (text search)
- **Botões**: Aplicar, Limpar
- **Botão Dev**: Simular Loading (para testes)

#### Gráfico
- **Donut Chart customizado** (SVG vanilla JS, sem Chart.js)
- **Legenda vertical** com labels, valores e cores
- **Labels**: Frete, Tarifa, Margem, Custo, Imposto
- **Distribuição**: percentual dos valores

### 4. Tabela Principal
**14 colunas:**
1. Anúncio (truncado, com tooltip)
2. Conta
3. SKU
4. Data
5. Frete (Full/Flex/Places)
6. Valor Unit.
7. Qtd.
8. Faturamento ML
9. Custo (colorido)
10. Imposto (colorido)
11. Tarifa (colorido)
12. Frete Comprador (hidden em mobile)
13. Frete Vendedor (hidden em tablet)
14. Margem (colorido, bold)
15. MC % (hidden em mobile)

**Funcionalidades:**
- **Paginação**: 50 linhas por página (configurável)
- **Ordenação**: click no cabeçalho (asc/desc, visual de seta)
- **Filtros**: aplicados client-side em tempo real
- **Export CSV**: botão para baixar dados filtrados
- **Responsividade**: colunas de baixa prioridade hidden em breakpoints estreitos
- **Scroll horizontal**: table min-width garante scroll em mobile

---

## Paleta de Cores

```css
--primary:        #5D4DB3 (roxo, accent)
--frete:          #2F9BD6 (azul, frete)
--frete-light:    #4AA3D8
--tarifa:         #F4C85A (amarelo)
--margem:         #33A37A (verde)
--margem-light:   #7FC29B
--imposto:        #EE7F66 (salmão)
--imposto-light:  #F19D87
--bg:             #f5f5f5
--card:           #ffffff
--text-dark:      #333333
--text-light:     #666666
--muted:          #999999
--muted-2:        #cccccc
```

---

## Breakpoints Responsivos

| Breakpoint | Descrição | Mudanças |
|-----------|-----------|----------|
| `>= 1100px` | **Desktop** | 2 colunas (main + side); Cards span 6-12; Side right |
| `800-1099px` | **Tablet** | 1 coluna (main + side below); Cards grid 6 colunas; Side full-width |
| `<= 600px` | **Mobile** | Cards empilhados (1fr); Filtros empilhados; Colunas low-priority hidden |

---

## Especificação de API (Integração Futura)

Substituir `DEMO_DATA` por chamadas reais aos endpoints:

### `GET /api/dashboard/summary`

**Response:**
```json
{
  "vendas": {
    "total": 6954.98,
    "minis": [
      { "label": "Places/Coleta", "value": 59.16, "type": "flex" },
      { "label": "Flex", "value": 1205.82, "type": "flex" },
      { "label": "Full", "value": 4890.00, "type": "full" },
      { "label": "ME1", "value": 800.00, "type": "me" }
    ]
  },
  "custo": {
    "total": 3799.77,
    "custo": 3530.70,
    "imposto": 269.07,
    "minis": [
      { "label": "Custo", "value": 3530.70, "type": "cost" },
      { "label": "Imposto", "value": 269.07, "type": "tax" }
    ]
  },
  "tarifa": { "total": 1266.52 },
  "frete": { "total": 679.93 },
  "margem": { "total": 1285.73, "pct": 18.49 }
}
```

### `GET /api/dashboard/chart`

**Response:**
```json
{
  "labels": ["Frete", "Tarifa", "Margem", "Custo", "Imposto"],
  "values": [8.7, 18.2, 18.5, 50.8, 3.8],
  "colors": ["#4aa3d8", "#F4C85A", "#33A37A", "#333333", "#EE7F66"]
}
```

### `GET /api/dashboard/rows?start=2026-01-01&end=2026-01-31&page=1&pageSize=50&title=&sku=&sort=anuncio&dir=asc`

**Response:**
```json
{
  "total": 123,
  "page": 1,
  "pageSize": 50,
  "rows": [
    {
      "id": 1,
      "anuncio": "Produto Premium 1",
      "conta": "Conta 1",
      "sku": "SKU-00001",
      "data": "2026-01-21",
      "frete": "Full",
      "valor": 58.30,
      "qtd": 1,
      "faturamento": 58.30,
      "custo": 34.00,
      "imposto": 2.33,
      "tarifa": 13.45,
      "freteComprador": 0.00,
      "freteVendedor": 5.20,
      "margem": 8.52,
      "mcPct": 14.61
    }
    // ... mais 49 linhas
  ]
}
```

---

## Comportamentos JS Implementados

| Função | Descrição |
|--------|-----------|
| `app.init()` | Inicializa a dashboard ao carregar |
| `app.renderCards()` | Popula cards com dados (ou skeleton se loading) |
| `app.renderChart()` | Desenha SVG donut e legenda |
| `app.renderTable()` | Popula tabela com página atual |
| `app.nextPage()` / `app.prevPage()` | Navegação de páginas |
| `app.sort(field)` | Ordena tabela por coluna (asc/desc toggle) |
| `app.applyFilters()` | Aplica filtros (date, text) |
| `app.clearFilters()` | Limpa todos os filtros |
| `app.exportCSV()` | Gera e baixa CSV com dados filtrados |
| `app.simulateLoading()` | Mostra skeletons por 2s (dev) |
| `logout()` | Redireciona para login.html |

---

## Acessibilidade

- ✅ **aria-labels** em botões e inputs
- ✅ **Data-tooltip** para ícones de info
- ✅ **Contraste WCAG 4.5:1** em textos importantes
- ✅ **Keyboard navigation**: Tab, Enter, Esc
- ✅ **Focus visível** em botões e links
- ✅ **Labels associados** em inputs
- ✅ **Semantic HTML** (tables, headers, sections)

---

## Build e Preview

### Compilar SASS

```bash
# Uma vez
npm install sass
npx sass src/styles/dashboard.scss dist/styles/dashboard.css --style=expanded

# Watch (contínuo)
npx sass --watch src/styles:dist/styles
```

### Servidor Local

```bash
# Python
python -m http.server 8000

# Node
npx http-server .

# Abrir no navegador
http://localhost:8000/examples/login.html
```

**Fluxo de teste:**
1. Abra `login.html`
2. Clique em "Entrar"
3. Redirecionado para `dashboard/index.html`

---

## Checklist de QA

### Visual
- [x] Cards alinhados em grid (desktop 6-12 cols, tablet 6 cols, mobile 1 col)
- [x] Stripe colorida em cada card
- [x] Mini-blocos com alinhamento correto
- [x] Pictogramas SVG em background (discretos)
- [x] Sombras sutis em cards

### Responsividade
- [x] Desktop (>= 1100px): 2 colunas (main + side)
- [x] Tablet (800-1099px): cards 6 cols, side abaixo
- [x] Mobile (<= 600px): cards 1 col, filtros empilhados, tabela scroll
- [x] Tabela: colunas hidden conforme breakpoint

### Interações
- [x] Filtros funcionam (text + date)
- [x] Ordenação por clique (asc/desc visual)
- [x] Paginação (prev/next, disabled state)
- [x] Export CSV (gera arquivo)
- [x] Skeletons no simular loading

### Performance
- [x] Sem console errors
- [x] Tabela renderiza rápido (50 linhas)
- [x] Gráfico SVG smooth (donut)

### Accessibility
- [x] Keyboard tab navigation
- [x] Focus visível
- [x] Contraste OK
- [x] Inputs com labels

---

## Notas de Integração

1. **Dados Demo** — Substitua `DEMO_DATA` por chamadas reais aos endpoints `/api/dashboard/*`
2. **Auth** — Verifique session/token antes de renderizar (ou redirecione para login)
3. **Error Handling** — Adicione toast/banner para erros de rede
4. **Suporte a Usuários Múltiplos** — Passe user ID aos endpoints
5. **Timezone** — Verifique formato de data (atual: DD/MM/YYYY)

---

## Versão & Changelog

**v1.0.0** (2026-01-22)
- Dashboard inicial com 5 cards, tabela, gráfico, filtros
- Paginação, ordenação, export CSV
- Skeleton loading states
- Responsivo (desktop, tablet, mobile)

---

## Perguntas Frequentes

**P: Por que não usar Chart.js?**
A: Para reduzir dependências. O gráfico donut é customizado em SVG vanilla JS.

**P: Como conectar a um backend real?**
A: Substitua `fetchSummary()`, `fetchChart()`, `fetchRows()` por `fetch('/api/dashboard/*')`.

**P: Posso customizar as cores?**
A: Sim! Edite `:root` em `_variables.scss` (ex: `--primary: #...; --tarifa: #...;`).

**P: Qual o limite de linhas na tabela?**
A: Server-side: depende da paginação no backend. Client-side demo: 123 linhas em blocos de 50.

---

**Desenvolvido por:** OpenCode  
**Data:** 2026-01-22  
**Licença:** MIT
