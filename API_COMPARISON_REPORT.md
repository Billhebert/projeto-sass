# ANÁLISE COMPARATIVA: API Mercado Livre vs Implementação em Projeto SASS

## RESUMO EXECUTIVO

Análise detalhada da implementação de endpoints do projeto SASS contra as especificações da API de Mercado Livre para:
- Mercado Livre Orders/Gerenciamento de Vendas
- Global Selling Orders (Cross-Border Trade)
- MercadoPago Orders

**Data da Análise:** 30 Janeiro 2026

---

## 1. ENDPOINTS IMPLEMENTADOS vs FALTANTES

### 1.1 ORDERS (Pedidos)

#### ✅ IMPLEMENTADOS

```
GET    /api/orders                          - List all orders for user
GET    /api/orders/:accountId               - List orders for specific account
GET    /api/orders/:accountId/:orderId      - Get order details
GET    /api/orders/:accountId/stats         - Get order statistics
GET    /api/orders/:accountId/:orderId/billing - Get billing info
POST   /api/orders/:accountId/sync          - Sync orders from ML
```

**Arquivo:** `backend/routes/orders.js` (617 linhas)

#### ❌ FALTANTES

```
POST   /api/orders/:accountId/:orderId      - Update order status
POST   /api/orders/:accountId/:orderId/action - Execute order action
PUT    /api/orders/:accountId/:orderId      - Modify order
DELETE /api/orders/:accountId/:orderId      - Cancel order
```

**Impacto:** Alta prioridade - Gerenciamento completo de status de pedidos

---

### 1.2 PACKS (Carrinho de Compras)

#### ✅ IMPLEMENTADOS

```
GET    /api/packs/:accountId                - List packs for seller
GET    /api/packs/:accountId/:packId        - Get pack details
GET    /api/packs/:accountId/:packId/orders - Get orders in pack
GET    /api/packs/:accountId/:packId/shipment - Get pack shipment info
GET    /api/packs/:accountId/:packId/invoice - Get invoice for pack
```

**Arquivo:** `backend/routes/packs.js` (399 linhas)

#### ❌ FALTANTES

```
POST   /api/packs/:accountId/split          - Split pack (separate orders)
GET    /api/packs/:accountId/:packId/payments - Get pack payment details
POST   /api/packs/:accountId/:packId/actions - Perform pack actions
```

**Impacto:** Média prioridade - Funcionalidades avançadas de packs

---

### 1.3 SHIPMENTS (Envios)

#### ✅ IMPLEMENTADOS

```
GET    /api/shipments                       - List all shipments
GET    /api/shipments/:accountId            - List shipments for account
GET    /api/shipments/:accountId/pending    - List pending shipments
GET    /api/shipments/:accountId/stats      - Get shipment statistics
GET    /api/shipments/:accountId/:shipmentId - Get shipment details
GET    /api/shipments/:accountId/:shipmentId/tracking - Get tracking info
GET    /api/shipments/:accountId/:shipmentId/label - Get shipping label
PUT    /api/shipments/:accountId/:shipmentId - Update shipment status
POST   /api/shipments/:accountId/sync       - Sync shipments
```

**Arquivo:** `backend/routes/shipments.js` (691 linhas)

#### ❌ FALTANTES

```
POST   /api/shipments/:accountId/:shipmentId/return - Create return shipment
PUT    /api/shipments/:accountId/:shipmentId/tracking - Update tracking
DELETE /api/shipments/:accountId/:shipmentId - Cancel shipment
GET    /api/shipments/:accountId/:shipmentId/rates - Get shipping rates
```

**Impacto:** Média-Alta prioridade - Gerenciamento completo de devoluções

---

### 1.4 PAYMENTS (Pagamentos)

#### ✅ IMPLEMENTADOS

```
Parcialmente integrados em:
- GET /api/orders/:accountId/:orderId (payments array)
- GET /api/orders/:accountId/stats (revenue calculation)
```

#### ❌ FALTANTES (CRÍTICO)

```
GET    /api/payments/:accountId                    - List all payments
GET    /api/payments/:accountId/:paymentId        - Get payment details
POST   /api/payments/:accountId/:paymentId/refund - Process refund
GET    /api/payments/:accountId/search             - Search payments by:
         - date_created (from/to)
         - status (pending, approved, rejected)
         - payment_method_id
         - type
POST   /api/payments/:accountId/settlement        - Get settlement info
```

**Impacto:** CRÍTICA - Não existe rota dedicada para pagamentos

---

### 1.5 FEEDBACK/REVIEWS

#### ✅ IMPLEMENTADOS

```
GET    /api/feedback/:accountId/orders/:orderId   - Get feedback for order
POST   /api/feedback/:accountId/orders/:orderId   - Create feedback
GET    /api/feedback/:accountId/seller             - Get seller feedback
GET    /api/feedback/:accountId/received           - Get received feedback
POST   /api/feedback/:accountId/:feedbackId/reply - Reply to feedback
GET    /api/feedback/:accountId/stats              - Get feedback statistics
```

**Arquivo:** `backend/routes/feedback.js` (346 linhas)

#### ❌ FALTANTES

```
GET    /api/feedback/:accountId/pending            - List pending feedbacks
GET    /api/feedback/:accountId/buyer/:buyerId    - Get buyer feedback (usado antes)
PUT    /api/feedback/:accountId/:feedbackId       - Edit feedback
DELETE /api/feedback/:accountId/:feedbackId       - Delete feedback
GET    /api/feedback/:accountId/summary            - Reputation summary
```

**Impacto:** Média prioridade

---

### 1.6 RETURNS/DEVOLUÇÕES

#### ✅ IMPLEMENTADOS

```
GET    /api/returns/:accountId                           - List all returns
GET    /api/returns/:accountId/:claimId                  - Get return details
GET    /api/returns/:accountId/order/:orderId            - Get returns for order
POST   /api/returns/:accountId/:claimId/messages         - Send message
GET    /api/returns/:accountId/:claimId/shipping-label  - Get return label
GET    /api/returns/:accountId/stats/summary             - Get return stats
POST   /api/returns/:accountId/post-purchase/:claimId/review - Submit review
POST   /api/returns/:accountId/:claimId/evidence         - Upload evidence
GET    /api/returns/:accountId/:claimId/evidences        - Get evidences
GET    /api/returns/:accountId/:claimId/timeline         - Get timeline
POST   /api/returns/:accountId/:claimId/refund           - Process refund
GET    /api/returns/:accountId/:claimId/tracking         - Get tracking
```

**Arquivo:** `backend/routes/returns.js` (670 linhas)

#### ❌ FALTANTES

```
POST   /api/returns/:accountId                    - Create return
PUT    /api/returns/:accountId/:claimId           - Update return status
POST   /api/returns/:accountId/:claimId/label     - Generate new label
GET    /api/returns/:accountId/:claimId/options   - Get return options
```

**Impacto:** Baixa prioridade

---

### 1.7 CLAIMS/MEDIATIONS

#### ✅ IMPLEMENTADOS

```
GET    /api/claims                               - List all claims
GET    /api/claims/:accountId                    - List claims for account
GET    /api/claims/:accountId/open                - List open claims
GET    /api/claims/:accountId/stats               - Get claim statistics
GET    /api/claims/:accountId/:claimId            - Get claim details
POST   /api/claims/:accountId/:claimId/message    - Send message
POST   /api/claims/:accountId/sync                - Sync claims
GET    /api/claims/:accountId/:claimId/exchange   - Get exchange details
POST   /api/claims/:accountId/:claimId/exchange/accept - Accept exchange
POST   /api/claims/:accountId/:claimId/exchange/reject - Reject exchange
GET    /api/claims/:accountId/:claimId/evidences  - Get evidences
POST   /api/claims/:accountId/:claimId/evidences  - Upload evidence
POST   /api/claims/:accountId/:claimId/resolve    - Resolve claim
GET    /api/claims/:accountId/:claimId/available-actions - Get available actions
GET    /api/claims/:accountId/:claimId/timeline   - Get claim timeline
```

**Arquivo:** `backend/routes/claims.js` (1082 linhas)

#### ❌ FALTANTES

```
GET    /api/claims/:accountId/filters             - Get available filters
POST   /api/claims/:accountId/:claimId/escalate   - Escalate claim
GET    /api/claims/:accountId/:claimId/compensation - Get compensation offer
```

**Impacto:** Baixa prioridade

---

### 1.8 INVOICES (Notas Fiscais)

#### ✅ IMPLEMENTADOS

```
GET    /api/invoices/:accountId                  - List invoices
GET    /api/invoices/:accountId/:invoiceId       - Get invoice details
GET    /api/invoices/:accountId/order/:orderId   - Get invoice for order
POST   /api/invoices/:accountId/order/:orderId   - Create invoice
```
