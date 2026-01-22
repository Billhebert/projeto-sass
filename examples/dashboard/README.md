# Dashboard Profissional - Demonstração

Esta é uma implementação completa de um dashboard profissional e responsivo, construído com HTML5, SCSS modular e JavaScript vanilla. O projeto serve como demonstração de boas práticas de front-end e pode ser facilmente integrado com APIs reais.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Instalação e Configuração](#instalação-e-configuração)
- [Como Visualizar](#como-visualizar)
- [Compilação SCSS](#compilação-scss)
- [Integração com API](#integração-com-api)
- [Personalização](#personalização)
- [Suporte a Navegadores](#suporte-a-navegadores)
- [Acessibilidade](#acessibilidade)

## 🎯 Visão Geral

O dashboard demonstra uma aplicação moderna de visualização de dados com:

- **6 Cards Estatísticos** com mini-blocos, tendências e ícones
- **Gráfico Donut Interativo** (Chart.js) com legenda customizada
- **Tabela de Dados** com paginação, ordenação e tooltips
- **Painel de Filtros** por status, categoria e período
- **Exportação CSV** dos dados filtrados
- **Design Responsivo** com breakpoints claros
- **Página de Login** demonstrativa com redirecionamento

## ✨ Funcionalidades

### Cards Estatísticos

- 6 cards com métricas principais
- Faixa colorida fina no topo de cada card
- Ícone pictográfico em baixa opacidade
- Mini-blocos com subtotais
- Indicadores de tendência (↑/↓) com percentuais
- Grid responsivo (empilha em mobile)

### Tabela de Dados

- **15 registros de demonstração** com dados realistas
- **Paginação**: 10 itens por página com navegação
- **Ordenação**: clique nos cabeçalhos para ordenar (↑/↓)
- **Tooltips**: textos longos com truncamento e tooltip ao hover
- **Responsividade**: 
  - Colunas menos importantes são ocultas em mobile
  - Scroll horizontal com barra customizada
  - Header sticky para melhor navegação
- **Exportação CSV**: exporta dados filtrados com encoding UTF-8
- **Loading skeleton**: animação de carregamento inicial

### Painel de Filtros

- Filtro por **Status** (Entregue, Em Trânsito, Processando, Cancelado)
- Filtro por **Categoria** (Eletrônicos, Moda, Casa, Esportes, Livros)
- Filtro por **Período** (data início e fim)
- Botão "Limpar" para resetar todos os filtros
- Aplicação instantânea com feedback visual

### Gráfico Chart.js

- Gráfico donut com 5 categorias de produtos
- Animação suave no carregamento
- Legenda customizada com percentuais
- Cores coordenadas com o design system
- Tooltips informativos

### Acessibilidade

- Roles ARIA apropriados
- Labels descritivos
- Navegação por teclado
- Focus visível em todos os elementos interativos
- Tooltips acessíveis via atributos data

## 📁 Estrutura de Arquivos

```
projeto-sass/
├── examples/
│   ├── login.html                    # Página de login demonstrativa
│   └── dashboard/
│       ├── index.html                # Dashboard principal
│       └── README.md                 # Esta documentação
├── src/
│   ├── styles/
│   │   └── dashboard.scss            # SCSS modular com design system
│   └── scripts/
│       └── dashboard.js              # JavaScript vanilla (20KB)
└── dist/
    └── styles/
        └── dashboard.css             # CSS compilado (pronto para uso)
```

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js e npm instalados (para compilação SCSS)
- Navegador moderno (Chrome, Firefox, Safari, Edge)

### Passos

1. Clone o repositório (se ainda não tiver):
```bash
git clone https://github.com/Billhebert/projeto-sass.git
cd projeto-sass
```

2. Instale as dependências (apenas sass):
```bash
npm install
```

3. O CSS já está compilado em `dist/styles/dashboard.css`, mas você pode recompilar:
```bash
npm run compile-dashboard
# ou manualmente:
npx sass src/styles/dashboard.scss dist/styles/dashboard.css --no-source-map --style=expanded
```

## 👀 Como Visualizar

### Opção 1: Abrir Diretamente no Navegador

1. Navegue até o diretório do projeto
2. Abra o arquivo `examples/login.html` no navegador
3. Clique em "Entrar" para ser redirecionado ao dashboard

**Nota**: Alguns navegadores podem bloquear recursos locais. Nesse caso, use um servidor HTTP.

### Opção 2: Servidor HTTP Local (Recomendado)

#### Usando Python 3:
```bash
cd projeto-sass
python3 -m http.server 8000
```
Acesse: `http://localhost:8000/examples/login.html`

#### Usando Node.js (http-server):
```bash
npx http-server -p 8000
```
Acesse: `http://localhost:8000/examples/login.html`

#### Usando PHP:
```bash
php -S localhost:8000
```
Acesse: `http://localhost:8000/examples/login.html`

## 🎨 Compilação SCSS

### Comando Manual

Para recompilar o SCSS sempre que fizer alterações:

```bash
npx sass src/styles/dashboard.scss dist/styles/dashboard.css --no-source-map --style=expanded
```

### Watch Mode (Desenvolvimento)

Para recompilar automaticamente ao editar:

```bash
npx sass --watch src/styles/dashboard.scss:dist/styles/dashboard.css --no-source-map --style=expanded
```

### Adicionar ao package.json (Opcional)

Se quiser adicionar scripts npm, edite `package.json`:

```json
{
  "scripts": {
    "compile-dashboard": "sass src/styles/dashboard.scss dist/styles/dashboard.css --no-source-map --style=expanded",
    "watch-dashboard": "sass --watch src/styles/dashboard.scss:dist/styles/dashboard.css --no-source-map --style=expanded"
  }
}
```

Depois execute:
```bash
npm run compile-dashboard
npm run watch-dashboard
```

## 🔌 Integração com API

O código JavaScript está preparado para fácil integração com APIs reais. Veja os pontos de integração:

### 1. Substituir Dados Demo

No arquivo `src/scripts/dashboard.js`, localize o objeto `DEMO_DATA` e substitua por chamadas API:

```javascript
// Exemplo: Buscar estatísticas
async function fetchStats() {
  const response = await fetch('/api/dashboard/stats');
  const data = await response.json();
  return data;
}

// Exemplo: Buscar pedidos com filtros
async function fetchOrders(page, filters) {
  const params = new URLSearchParams({
    page,
    limit: state.rowsPerPage,
    status: filters.status,
    category: filters.category,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo
  });
  
  const response = await fetch(`/api/orders?${params}`);
  const data = await response.json();
  return data;
}

// Exemplo: Buscar dados do gráfico
async function fetchChartData() {
  const response = await fetch('/api/dashboard/categories');
  const data = await response.json();
  return data;
}
```

### 2. Atualizar initializeApp()

```javascript
async function initializeApp() {
  showLoadingState();
  
  try {
    // Buscar dados em paralelo
    const [stats, orders, chartData] = await Promise.all([
      fetchStats(),
      fetchOrders(1, state.filters),
      fetchChartData()
    ]);
    
    // Atualizar state com dados reais
    state.filteredData = orders.data;
    DEMO_DATA.stats = stats;
    DEMO_DATA.chartData = chartData;
    
    // Renderizar
    renderStatsCards();
    renderChart();
    renderTable();
    initializeFilters();
    initializeEventListeners();
    
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    showErrorState();
  } finally {
    hideLoadingState();
  }
}
```

### 3. Formato Esperado da API

#### Estatísticas (GET /api/dashboard/stats)
```json
[
  {
    "id": "revenue",
    "label": "Receita Total",
    "value": "R$ 284.500",
    "icon": "💰",
    "trend": { "direction": "up", "value": "12.5%" },
    "variant": "primary",
    "miniBlocks": [
      { "label": "Hoje", "value": "R$ 8.4k" },
      { "label": "Mês", "value": "R$ 142k" }
    ]
  }
]
```

#### Pedidos (GET /api/orders)
```json
{
  "data": [
    {
      "id": "ORD-2024-1847",
      "customer": "Maria Silva",
      "product": "Smartphone Galaxy",
      "date": "2024-01-22",
      "amount": "R$ 4.299,00",
      "status": "Entregue",
      "category": "Eletrônicos"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 10
}
```

#### Categorias (GET /api/dashboard/categories)
```json
{
  "labels": ["Eletrônicos", "Moda", "Casa", "Esportes", "Livros"],
  "datasets": [{
    "data": [35, 25, 20, 12, 8],
    "backgroundColor": ["#667eea", "#48bb78", "#ed8936", "#f56565", "#9f7aea"]
  }]
}
```

## 🎨 Personalização

### Design System (Variáveis SCSS)

Todas as cores, espaçamentos e breakpoints estão definidos no início do arquivo `src/styles/dashboard.scss`:

```scss
// Cores
$primary-600: #667eea;
$success-500: #48bb78;
$warning-500: #ed8936;
// ... mais cores

// Tipografia
$font-family: 'Inter', sans-serif;
$font-size-base: 1rem;
// ... mais tamanhos

// Espaçamentos
$space-4: 1rem;
$space-6: 1.5rem;
// ... mais espaçamentos

// Breakpoints
$breakpoint-md: 768px;
$breakpoint-lg: 1024px;
// ... mais breakpoints
```

### Alterar Cores

Para mudar o esquema de cores, edite as variáveis no SCSS e recompile:

```scss
// Exemplo: Tema azul para verde
$primary-600: #10b981;  // verde
$primary-700: #059669;
```

### Adicionar Chart.js como Dependência

Se preferir instalar Chart.js via npm em vez de CDN:

```bash
npm install chart.js
```

Depois, em `examples/dashboard/index.html`, substitua:
```html
<!-- Remover CDN -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

<!-- Adicionar bundle local -->
<script src="../../node_modules/chart.js/dist/chart.umd.js"></script>
```

## 🌐 Suporte a Navegadores

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Funcionalidades modernas usadas:
- CSS Grid
- CSS Custom Properties
- ES6+ JavaScript (Arrow Functions, Template Literals, Async/Await)
- Fetch API

## ♿ Acessibilidade

O dashboard segue as diretrizes WCAG 2.1 nível AA:

- **Semântica HTML5**: uso correto de `<header>`, `<main>`, `<section>`, `<aside>`
- **ARIA**: roles, labels e atributos apropriados
- **Contraste**: todas as combinações de cores atendem AA
- **Navegação por teclado**: todos os elementos interativos são acessíveis via Tab
- **Focus visível**: outline claro em elementos focados
- **Tooltips**: implementados de forma acessível
- **Formulários**: labels associados, required e aria-required
- **Tabela**: roles table, header sticky

## 📝 Notas Técnicas

### Performance

- CSS compilado tem ~25KB (minificado seria ~18KB)
- JavaScript tem ~20KB (sem minificação)
- Chart.js via CDN (~200KB, carregado de CDN global)
- Zero dependências além de sass (dev) e Chart.js (runtime)

### Estados de Loading

O dashboard mostra skeleton screens durante o carregamento inicial (800ms simulado). Para produção, ajuste o timeout conforme o tempo real da API.

### Paginação

Implementada no lado do cliente. Para grandes datasets, implemente paginação server-side ajustando as chamadas de API.

## 🤝 Contribuindo

Para contribuir com melhorias:

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit suas mudanças: `git commit -m 'Add: minha feature'`
4. Push para a branch: `git push origin feature/minha-feature`
5. Abra um Pull Request

## 📄 Licença

Este projeto é distribuído sob a licença ISC. Veja o arquivo LICENSE para mais detalhes.

## 📧 Suporte

Para dúvidas ou problemas:
- Abra uma issue no GitHub
- Entre em contato com o mantenedor

---

**Desenvolvido com ❤️ como demonstração de dashboard profissional e responsivo.**
