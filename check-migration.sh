#!/bin/bash

# Script de Verificação de Migração para SDK
# Verifica quais rotas ainda usam axios direto vs SDK

echo "=================================="
echo "  Análise de Migração para SDK"
echo "=================================="
echo ""

echo "📊 Status Atual:"
echo ""

# Contar arquivos de rotas
TOTAL_ROUTES=$(find backend/routes -name "*.js" -not -name "*test*" -not -name "*example*" | wc -l)
echo "Total de arquivos de rotas: $TOTAL_ROUTES"

# Contar rotas que usam axios com ML API
AXIOS_ML_ROUTES=$(grep -l "axios.*api\.mercadolibre\.com\|axios.*api\.mercadopago\.com" backend/routes/**/*.js backend/routes/*.js 2>/dev/null | wc -l)
echo "Rotas usando axios com ML API: $AXIOS_ML_ROUTES"

# Contar rotas que usam SDK
SDK_ROUTES=$(grep -l "sdk-manager\|sdkManager" backend/routes/**/*.js backend/routes/*.js 2>/dev/null | wc -l)
echo "Rotas usando SDK Manager: $SDK_ROUTES"

echo ""
echo "📈 Progresso:"
PERCENT=$((SDK_ROUTES * 100 / TOTAL_ROUTES))
echo "Progresso da migração: $PERCENT%"

# Barra de progresso
FILLED=$((PERCENT / 2))
EMPTY=$((50 - FILLED))
printf "["
printf "%${FILLED}s" | tr ' ' '='
printf "%${EMPTY}s" | tr ' ' '-'
printf "] $PERCENT%%\n"

echo ""
echo "📁 Rotas que PRECISAM migrar (usando axios):"
echo ""
grep -l "axios.*api\.mercadolibre\.com\|axios.*api\.mercadopago\.com" backend/routes/**/*.js backend/routes/*.js 2>/dev/null | while read file; do
    # Contar chamadas axios no arquivo
    AXIOS_CALLS=$(grep -c "axios\." "$file" 2>/dev/null || echo 0)
    echo "  - $file ($AXIOS_CALLS chamadas axios)"
done

echo ""
echo "✅ Rotas JÁ MIGRADAS (usando SDK):"
echo ""
grep -l "sdk-manager\|sdkManager" backend/routes/**/*.js backend/routes/*.js 2>/dev/null | while read file; do
    echo "  ✓ $file"
done

echo ""
echo "=================================="
echo "  Recursos da SDK Disponíveis"
echo "=================================="
echo ""
echo "A SDK possui 90+ classes de recursos cobrindo:"
echo ""
echo "  🛍️  Mercado Livre:"
echo "    - Items (Produtos)"
echo "    - Orders (Pedidos)"
echo "    - Questions (Perguntas)"
echo "    - Messages (Mensagens)"
echo "    - Shipments (Envios)"
echo "    - Categories (Categorias)"
echo "    - Reviews (Avaliações)"
echo "    - Claims (Reclamações)"
echo "    - Returns (Devoluções)"
echo "    - Billing (Faturamento)"
echo "    - Visits (Visitas)"
echo "    - Trends (Tendências)"
echo "    - Ads (Anúncios)"
echo "    - ... e 40+ outros recursos"
echo ""
echo "  💳 Mercado Pago:"
echo "    - Payments (Pagamentos)"
echo "    - Customers (Clientes)"
echo "    - Subscriptions (Assinaturas)"
echo "    - Orders (Pedidos MP)"
echo "    - Cards (Cartões)"
echo "    - Disputes (Disputas)"
echo "    - ... e 30+ outros recursos"
echo ""
echo "  🌎 Global Selling:"
echo "    - Cross-border listings"
echo "    - International shipping"
echo "    - Currency conversion"
echo ""
echo "=================================="
echo "  Próximos Passos"
echo "=================================="
echo ""
echo "1. Revisar o guia: MIGRACAO_SDK.md"
echo "2. Usar items-sdk.js como referência"
echo "3. Migrar rotas de alta prioridade primeiro"
echo "4. Testar cada rota após migração"
echo "5. Atualizar server.js para usar novas rotas"
echo ""
echo "Para começar a migração:"
echo "  cd backend"
echo "  cp routes/items.js routes/items.old.js"
echo "  cp routes/items-sdk.js routes/items.js"
echo "  npm test"
echo ""
