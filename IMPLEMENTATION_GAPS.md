# GAPS DE IMPLEMENTAÇÃO - RESUMO EXECUTIVO

## Gerado em: 30 Janeiro 2026

---

## 1. ENDPOINTS CRÍTICOS FALTANDO

### 1.1 PAYMENTS (Não Existe Rota)

**Status:** ❌ NÃO IMPLEMENTADO

**Problema:**
- Não existe `/api/payments` dedicada
- Pagamentos apenas como sub-objetos em Orders
- Impossível gerenciar refunds, pesquisar por method, etc

**Endpoints Necessários:**
```
GET    /api/payments/:accountId              - List payments
GET    /api/payments/:accountId/:paymentId   - Get details
POST   /api/payments/:accountId/:paymentId/refund - Refund
GET    /api/payments/:accountId/search       - Search with filters
```

**Impacto:** CRÍTICO - Gestão financeira incompleta
**Esforço:** 8 horas
**Prioridade:** 1

---

### 1.2 ORDER UPDATE/CANCEL

**Status:** ❌ FALTANDO

**Problema:**
- Só pode LISTAR orders (GET)
- Não pode atualizar status
- Não pode fazer ações em orders

**Endpoints Necessários:**
```
POST   /api/orders/:accountId/:orderId       - Update/action
PUT    /api/orders/:accountId/:orderId       - Modify
DELETE /api/orders/:accountId/:orderId       - Cancel
```

**Impacto:** CRÍTICO - Essencial para workflow de vendas
**Esforço:** 6 horas
**Prioridade:** 2

---

## 2. FILTROS AUSENTES (Alto Impacto)

### 2.1 Date Range Filters

**Problema:**
```
ATUAL: GET /api/orders/:accountId?status=paid
ESPERADO: GET /api/orders/:accountId
  ?date_created.from=2024-01-01
  &date_created.to=2024-01-31
```

**Afeta:** Orders, Shipments, Claims, Payments
**Impacto:** ALTA - Impossível gerar relatórios por período
**Esforço:** 6-8 horas (total em todos endpoints)

---

### 2.2 Multiple Status Filter

**Problema:**
```
ATUAL: GET /api/orders?status=paid (apenas 1)
ESPERADO: GET /api/orders?status=paid,shipped,cancelled
```

**Afeta:** Orders, Claims, Shipments
**Impacto:** MÉDIA-ALTA - Filtragem inadequada
**Esforço:** 3-4 horas

---

### 2.3 Buyer/Seller Filter

**Problema:**
Não existe filtro por buyer_id ou seller_id

**Exemplo:**
```
GET /api/orders?buyer_id=123456
GET /api/orders?seller_id=789456
```

**Impacto:** MÉDIA - Relatórios por cliente
**Esforço:** 2-3 horas

---

## 3. CAMPOS FALTANDO EM RESPOSTAS

### 3.1 Order Response - CRÍTICOS

```javascript
// FALTAM ESTES:

// Preço bruto (sem descontos aplicados)
gross_price: 150.00,

// Descontos aplicados detalhados
discounts: [
  {
    id: "COUPON123",
    type: "coupon",
    value: 50.00,
    description: "10% off"
  }
],

// Taxa de câmbio para conversão
base_exchange_rate: 5.20,

// Campo customizado do seller
seller_custom_field: "Custom Order ID",

// Impacto: CRÍTICO para:
// - Cálculo correto de lucro
// - Histórico de descontos
// - Conversão de moedas (Global Selling)
// - Rastreamento customizado
```

**Esforço:** 4 horas
**Prioridade:** 1

---

### 3.2 Shipment Response - MÉDIOS

```javascript
// Faltam estes campos:
tracking_events: [
  {
    date: "2024-01-16T08:00:00Z",
    type: "shipped",
    description: "Item enviado",
    location: "São Paulo"
  }
],
return_details: {
  reason: "Item damaged",
  status: "awaiting_return",
  created_at: "2024-01-20T10:00:00Z"
}
```

**Esforço:** 2-3 horas
**Prioridade:** 2

---

## 4. MODELOS FALTANDO

### 4.1 Payment Model

**Status:** ❌ NÃO EXISTE

**Necessário:**
```javascript
const paymentSchema = new mongoose.Schema({
  mlPaymentId: String (required, unique),
  orderId: String,
  status: {
    enum: ['approved', 'pending', 'rejected', 'cancelled', 'in_mediation']
  },
  amount: Number,
  currency: String,
  method: String,
  installments: Number,
  dateCreated: Date,
  dateApproved: Date,
  dateRefunded: Date,
  refundDetails: {
    amount: Number,
    date: Date,
    reason: String
  },
  // ... outros campos
})
```

**Esforço:** 3-4 horas
**Prioridade:** 1

---

### 4.2 Refund Model

**Status:** ⚠️ PARCIAL (em Returns)

**Melhorias:**
```javascript
// Modelo dedicado para refunds
const refundSchema = new mongoose.Schema({
  paymentId: String,
  orderId: String,
  amount: Number,
  reason: String,
  status: {
    enum: ['pending', 'approved', 'rejected']
  },
  processedAt: Date,
  // ...
})
```

**Esforço:** 2-3 horas
**Prioridade:** 2

---

## 5. FILTROS IMPLEMENTAÇÃO

### 5.1 Exemplo: Date Range Filter

```javascript
// ANTES (Atual):
router.get('/:accountId', async (req, res) => {
  const { limit = 20, offset = 0, status } = req.query;
  
  const query = { accountId, userId };
  if (status) query.status = status;
  
  const orders = await Order.find(query)
    .limit(limit).skip(offset);
});

// DEPOIS (Necessário):
router.get('/:accountId', async (req, res) => {
  const {
    limit = 20,
    offset = 0,
    status,
    date_created_from,
    date_created_to,
    buyer_id,
    sort = '-dateCreated'
  } = req.query;
  
  const query = { accountId, userId };
  
  if (status) {
    // Suportar múltiplos status
    if (status.includes(',')) {
      query.status = { $in: status.split(',') };
    } else {
      query.status = status;
    }
  }
  
  if (date_created_from || date_created_to) {
    query.dateCreated = {};
    if (date_created_from) {
      query.dateCreated.$gte = new Date(date_created_from);
    }
    if (date_created_to) {
      query.dateCreated.$lte = new Date(date_created_to);
    }
  }
  
  if (buyer_id) {
    query['buyer.id'] = buyer_id;
  }
  
  // Validação
  if (query.dateCreated) {
    const { $gte, $lte } = query.dateCreated;
    if ($gte && $lte && $gte > $lte) {
      return res.status(400).json({
        error: 'date_created_from must be before date_created_to'
      });
    }
  }
  
  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .sort(sort)
    .limit(Math.min(parseInt(limit), 100))
    .skip(parseInt(offset));
  
  res.json({
    success: true,
    data: {
      orders: orders.map(o => o.getSummary()),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      filters: {
        status,
        dateCreated: { from: date_created_from, to: date_created_to },
        buyerId: buyer_id
      }
    }
  });
});
```

**Template para Replicar:** Usar este padrão em todos endpoints

---

## 6. CAMPOS IMPLEMENTAÇÃO

### 6.1 Adicionar gross_price e discounts ao Order Model

```javascript
// No Order Schema, adicionar:

// Preço bruto sem descontos
grossPrice: {
  type: Number,
  default: 0
},

// Descontos aplicados
discounts: [
  {
    id: String,
    type: {
      type: String,
      enum: ['coupon', 'promotion', 'shipping', 'seller'],
      default: 'promotion'
    },
    description: String,
    value: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    appliedAt: Date
  }
],

// Taxa de câmbio
baseExchangeRate: {
  type: Number,
  default: 1
},

// Campo customizado do seller
sellerCustomField: String,

// Imposto detalhado
taxes: {
  amount: Number,
  currencyId: String,
  percentage: Number,
  region: String,
  taxId: String
}
```

### 6.2 No helper `saveOrders()`, popular esses campos:

```javascript
async function saveOrders(accountId, userId, mlOrders) {
  for (const mlOrder of mlOrders) {
    const orderItems = mlOrder.order_items || [];
    
    // Calcular gross_price (soma sem descontos)
    const grossPrice = orderItems.reduce((sum, item) => {
      return sum + (item.full_unit_price * item.quantity);
    }, 0);
    
    // Processar descontos
    const discounts = [];
    if (mlOrder.coupon?.amount) {
      discounts.push({
        type: 'coupon',
        value: mlOrder.coupon.amount,
        description: mlOrder.coupon.code || 'Coupon applied'
      });
    }
    
    // Diferença entre gross e total é desconto
    const autoDiscount = grossPrice - (mlOrder.total_amount || 0);
    if (autoDiscount > 0) {
      discounts.push({
        type: 'promotion',
        value: autoDiscount,
        description: 'Automatic promotion'
      });
    }
    
    const orderData = {
      // ... campos existentes ...
      
      // Novos campos:
      grossPrice: grossPrice,
      discounts: discounts,
      baseExchangeRate: mlOrder.base_exchange_rate || 1,
      sellerCustomField: mlOrder.seller_custom_field 
