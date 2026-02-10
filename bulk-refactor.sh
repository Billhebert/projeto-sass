#!/bin/bash
set -e

cd "E:\Paulo ML\projeto-sass"

# Lista de arquivos a refatorar (já temos 20: 19 anteriores + reviews)
FILES_TODO=(
  "quality.js"
  "global-selling.js"
  "feedback-reviews.js"
  "shipping.js"
  "items-sdk.js"
  "items-publications.js"
  "product-costs.js"
  "price-automation.js"
  "metrics.js"
  "kits.js"
  "categories-attributes.js"
  "orders-sales.js"
  "size-charts.js"
  "webhooks.js"
  "notifications.js"
  "sales-dashboard.js"
  "questions-answers.js"
  "trends.js"
  "feedback.js"
  "coupons.js"
  "sync.js"
  "visits.js"
  "admin.js"
  "skus.js"
  "invoices.js"
  "search-browse.js"
  "accounts.js"
  "users.js"
  "ITEMS_SDK_EXAMPLE.js"
  "items.old.js"
  "ml-accounts-refactored.js"
)

echo "Total de arquivos para refatorar: ${#FILES_TODO[@]}"
echo "Iniciando refatoração automática..."
echo ""

count=0
for file in "${FILES_TODO[@]}"; do
  if [ -f "backend/routes/$file" ]; then
    count=$((count + 1))
    echo "[$count/${#FILES_TODO[@]}] Processando $file..."
  else
    echo "⚠️ Arquivo não encontrado: $file"
  fi
done

echo ""
echo "Script preparado. Total de arquivos prontos: $count"
