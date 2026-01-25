# Arquivos a Implementar - Mercado Livre Integration

## FASE 1: Autenticação (src/scripts/mercado-livre/)

### 1. auth.js - Classe principal de autenticação
- Gerar URL de autorização
- Trocar código por tokens
- Renovar tokens expirados
- Buscar info do usuário logado

### 2. secure-storage.js - Armazenamento seguro de tokens
- Salvar contas conectadas
- Criptografar tokens
- Atualizar tokens quando expiram
- Listar todas as contas
- Remover conta

### 3. api-client.js - Cliente HTTP para API
- Requisições com Authorization header
- Retry automático com exponential backoff
- Timeout de 15 segundos
- Métodos convenientes (getUser, getItems, getOrders, etc)

## FASE 2: Sincronização (src/scripts/mercado-livre/)

### 4. products.js - Gerenciar produtos
- Sincronizar produtos do ML
- Buscar detalhes de produto
- Atualizar preço
- Atualizar quantidade em estoque
- Mapear SKU local com ID do ML

### 5. orders.js - Gerenciar vendas
- Sincronizar últimas vendas
- Buscar detalhes de venda
- Filtrar por período
- Calcular métricas
- Atualizar status

### 6. shipments.js - Gerenciar envios
- Sincronizar envios
- Buscar tracking
- Marcar como enviado
- Atualizar status

### 7. payments.js - Gerenciar pagamentos
- Buscar saldo disponível
- Histórico de pagamentos
- Datas de disponibilização

### 8. metrics.js - Coletar métricas
- Reputação do vendedor
- Taxa de cancelamento
- Taxa de devolução
- Velocidade de resposta
- Qualidade das publicações

## FASE 3: Agregação (src/scripts/multi-account/)

### 9. sync-manager.js - Gerenciador de sincronização
- Sincronizar todas as contas
- Renovar tokens quando necessário
- Salvar dados sincronizados
- Rastrear status de cada sincronização
- Retry em caso de erro

### 10. account-manager.js - Gerenciador de contas
- Listar contas conectadas
- Conectar nova conta (OAuth)
- Desconectar conta
- Selecionar conta ativa
- Deletar dados de conta

### 11. data-aggregator.js - Agregador de dados
- Combinar dados de múltiplas contas
- Calcular totais
- Comparar performance
- Gerar relatórios consolidados

## FASE 4: UI (examples/)

### 12. auth/mercado-livre-callback.html
- Página que recebe código de autorização
- Troca código por token
- Redireciona para dashboard

### 13. settings/ml-accounts.html
- Listar contas conectadas
- Botão para conectar nova
- Mostrar status de cada conta
- Opção para desconectar

### 14. dashboard/ml-widget.html
- Widget com resumo do ML
- Visualizar múltiplas contas
- Selector de conta
- Métricas agregadas

## FASE 5: Webhooks (backend/)

### 15. webhooks/mercado-livre.js (Node.js/Express)
- Receber notificações do ML
- Verificar assinatura
- Processar eventos (orders, items, shipments)
- Atualizar dados em tempo real
- Notificar frontend via WebSocket

## Dependências Externas

✓ fetch() - API nativa (suportada em todos os navegadores modernos)
✓ localStorage - API nativa
✓ crypto.subtle - API nativa (criptografia)
✓ WebSocket - API nativa (para notificações tempo real)

❌ Nenhuma dependência npm necessária para o frontend!

## Ordem de Implementação

1. **Dia 1-2**: auth.js + secure-storage.js
2. **Dia 3**: api-client.js + mercado-livre-callback.html
3. **Dia 4-5**: products.js + orders.js + shipments.js
4. **Dia 6**: sync-manager.js + account-manager.js
5. **Dia 7**: Integrar no dashboard (ML-widget)
6. **Dia 8**: Backend webhooks
7. **Dia 9-10**: Testes + ajustes finais

## Testes Necessários

```
✓ OAuth flow com conta real
✓ Sincronização de múltiplas contas
✓ Renovação de token
✓ Tratamento de erros (401, 403, 429)
✓ Performance com 50+ produtos
✓ WebSocket para notificações
✓ Recuperação de conexão perdida
```
