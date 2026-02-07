#!/usr/bin/env node

/**
 * 🔐 MERCADO LIVRE - EXTRATOR COMPLETO DE CONTA
 * 
 * Extrai TODOS os dados de uma conta Mercado Livre
 * Gera JSON completo para análise
 * 
 * USO:
 *   $ node extract-ml-data.js [--token ACCESS_TOKEN] [--output file.json]
 * 
 * VARIÁVEIS DE AMBIENTE:
 *   ML_ACCESS_TOKEN - Token de acesso
 *   ML_REFRESH_TOKEN - Token de refresh (opcional)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  ml_api: 'https://api.mercadolibre.com',
  mp_api: 'https://api.mercadopago.com',
  timeout: 15000,
  output: process.env.ML_OUTPUT_FILE || 'ml-account-data.json'
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// ════════════════════════════════════════════════════════════════════════════
// FUNÇÕES UTILITÁRIAS
// ════════════════════════════════════════════════════════════════════════════

function print(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function success(msg) {
  print(`✓ ${msg}`, 'green');
}

function error(msg) {
  print(`✗ ${msg}`, 'red');
}

function warning(msg) {
  print(`⚠ ${msg}`, 'yellow');
}

function info(msg) {
  print(`▶ ${msg}`, 'blue');
}

function status(msg) {
  print(`  ${msg}`, 'cyan');
}

// Fazer requisição HTTPS
function makeRequest(method, url, headers = {}, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'User-Agent': 'MercadoLibre-Extractor/1.0',
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: CONFIG.timeout
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Requisição à API ML
async function callML(endpoint, token, method = 'GET', data = null) {
  const url = `${CONFIG.ml_api}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${token}`
  };

  try {
    const response = await makeRequest(method, url, headers, data);
    
    if (response.status >= 400) {
      throw new Error(`API error: ${response.status} - ${JSON.stringify(response.data)}`);
    }

    return response.data;
  } catch (err) {
    throw new Error(`ML API Error (${endpoint}): ${err.message}`);
  }
}

// Requisição à API Mercado Pago
async function callMP(endpoint, token, method = 'GET', data = null) {
  const url = `${CONFIG.mp_api}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${token}`
  };

  try {
    const response = await makeRequest(method, url, headers, data);
    
    if (response.status >= 400) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.data;
  } catch (err) {
    throw new Error(`MP API Error (${endpoint}): ${err.message}`);
  }
}

// Ler arquivo .env
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      const env = {};

      lines.forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          env[match[1].trim()] = match[2].trim();
        }
      });

      return env;
    }
  } catch (err) {
    // Ignore
  }
  return {};
}

// Prompt interativo
function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  console.clear();
  
  print('═══════════════════════════════════════════════════════════', 'blue');
  print('🔐 MERCADO LIVRE - EXTRATOR COMPLETO', 'blue');
  print('═══════════════════════════════════════════════════════════\n', 'blue');

  // ──────────────────────────────────────────────────────────────────────
  // 1. OBTER TOKEN
  // ──────────────────────────────────────────────────────────────────────

  let token = process.argv[process.argv.indexOf('--token') + 1];
  let envVars = loadEnv();

  if (!token) {
    token = process.env.ML_ACCESS_TOKEN || envVars.ML_ACCESS_TOKEN;
  }

  if (!token) {
    info('Token não encontrado no .env ou variáveis de ambiente');
    token = await prompt('💭 Digite seu access token: ');
  }

  if (!token || token.trim() === '') {
    error('Token é obrigatório!');
    process.exit(1);
  }

  info('Validando token...\n');

  // ──────────────────────────────────────────────────────────────────────
  // 2. VALIDAR TOKEN E OBTER USUÁRIO
  // ──────────────────────────────────────────────────────────────────────

  let userData;
  try {
    userData = await callML('/users/me', token);
    success(`Token válido para: ${userData.nickname} (ID: ${userData.id})\n`);
  } catch (err) {
    error(`Falha na validação: ${err.message}`);
    process.exit(1);
  }

  const userId = userData.id;
  const userNickname = userData.nickname;

  // ──────────────────────────────────────────────────────────────────────
  // 3. ESTRUTURA DE DADOS
  // ──────────────────────────────────────────────────────────────────────

  const accountData = {
    exportDate: new Date().toISOString(),
    account: userData,
    items: [],
    orders: [],
    sales: [],
    payments: [],
    shipments: [],
    statistics: {},
    summary: {
      totalItems: 0,
      totalOrders: 0,
      totalSales: 0,
      totalPayments: 0,
      totalShipments: 0,
      userId,
      userNickname
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // 4. EXTRAIR ITENS
  // ──────────────────────────────────────────────────────────────────────

  info('Extraindo itens...');
  try {
    const itemsSearch = await callML(`/users/${userId}/items/search?limit=100`, token);
    const itemIds = itemsSearch.results || [];

    status(`Encontrados ${itemIds.length} itens`);

    for (let i = 0; i < itemIds.length; i++) {
      try {
        const itemDetail = await callML(`/items/${itemIds[i]}`, token);
        accountData.items.push(itemDetail);

        if ((i + 1) % 10 === 0) {
          status(`  [${i + 1}/${itemIds.length}] itens processados`);
        }
      } catch (err) {
        warning(`  Erro ao extrair item ${itemIds[i]}: ${err.message}`);
      }
    }

    accountData.summary.totalItems = accountData.items.length;
    success(`${accountData.items.length} itens extraídos\n`);
  } catch (err) {
    warning(`Erro ao extrair itens: ${err.message}\n`);
  }

  // ──────────────────────────────────────────────────────────────────────
  // 5. EXTRAIR PEDIDOS
  // ──────────────────────────────────────────────────────────────────────

  info('Extraindo pedidos...');
  try {
    const ordersSearch = await callML(`/orders/search?seller=${userId}&limit=100`, token);
    const orderIds = (ordersSearch.results || []).map(o => o.id).filter(Boolean);

    status(`Encontrados ${orderIds.length} pedidos`);

    for (let i = 0; i < orderIds.length; i++) {
      try {
        const orderDetail = await callML(`/orders/${orderIds[i]}`, token);
        accountData.orders.push(orderDetail);

        if ((i + 1) % 10 === 0) {
          status(`  [${i + 1}/${orderIds.length}] pedidos processados`);
        }
      } catch (err) {
        warning(`  Erro ao extrair pedido ${orderIds[i]}: ${err.message}`);
      }
    }

    accountData.summary.totalOrders = accountData.orders.length;
    success(`${accountData.orders.length} pedidos extraídos\n`);
  } catch (err) {
    warning(`Erro ao extrair pedidos: ${err.message}\n`);
  }

  // ──────────────────────────────────────────────────────────────────────
  // 6. EXTRAIR VENDAS
  // ──────────────────────────────────────────────────────────────────────

  info('Extraindo histórico de vendas...');
  try {
    const salesSearch = await callML(`/users/${userId}/orders/search?limit=100`, token);
    const saleIds = (salesSearch.results || []).map(s => s.id).filter(Boolean);

    status(`Encontrados ${saleIds.length} vendas`);

    for (let i = 0; i < Math.min(saleIds.length, 50); i++) {
      try {
        const saleDetail = await callML(`/merchant_orders/${saleIds[i]}`, token);
        accountData.sales.push(saleDetail);

        if ((i + 1) % 10 === 0) {
          status(`  [${i + 1}/${saleIds.length}] vendas processadas`);
        }
      } catch (err) {
        warning(`  Erro ao extrair venda ${saleIds[i]}: ${err.message}`);
      }
    }

    accountData.summary.totalSales = accountData.sales.length;
    success(`${accountData.sales.length} vendas extraídas\n`);
  } catch (err) {
    warning(`Erro ao extrair vendas: ${err.message}\n`);
  }

  // ──────────────────────────────────────────────────────────────────────
  // 7. EXTRAIR PAGAMENTOS (Mercado Pago)
  // ──────────────────────────────────────────────────────────────────────

  info('Extraindo pagamentos...');
  try {
    const paymentsSearch = await callMP(`/v1/payments/search?limit=100&sort=date_created&criteria=desc`, token);
    const paymentIds = (paymentsSearch.results || []).map(p => p.id).filter(Boolean);

    status(`Encontrados ${paymentIds.length} pagamentos`);

    for (let i = 0; i < Math.min(paymentIds.length, 50); i++) {
      try {
        const paymentDetail = await callMP(`/v1/payments/${paymentIds[i]}`, token);
        accountData.payments.push(paymentDetail);

        if ((i + 1) % 10 === 0) {
          status(`  [${i + 1}/${paymentIds.length}] pagamentos processados`);
        }
      } catch (err) {
        warning(`  Erro ao extrair pagamento ${paymentIds[i]}: ${err.message}`);
      }
    }

    accountData.summary.totalPayments = accountData.payments.length;
    success(`${accountData.payments.length} pagamentos extraídos\n`);
  } catch (err) {
    warning(`Erro ao extrair pagamentos: ${err.message}\n`);
  }

  // ──────────────────────────────────────────────────────────────────────
  // 8. EXTRAIR SHIPMENTS
  // ──────────────────────────────────────────────────────────────────────

  info('Extraindo shipments...');
  try {
    const shipmentsSearch = await callML(`/users/${userId}/shipments/search?limit=100`, token);
    const shipmentIds = (shipmentsSearch.results || []).map(s => s.id).filter(Boolean);

    status(`Encontrados ${shipmentIds.length} shipments`);

    for (let i = 0; i < Math.min(shipmentIds.length, 50); i++) {
      try {
        const shipmentDetail = await callML(`/shipments/${shipmentIds[i]}`, token);
        accountData.shipments.push(shipmentDetail);

        if ((i + 1) % 10 === 0) {
          status(`  [${i + 1}/${shipmentIds.length}] shipments processados`);
        }
      } catch (err) {
        warning(`  Erro ao extrair shipment ${shipmentIds[i]}: ${err.message}`);
      }
    }

    accountData.summary.totalShipments = accountData.shipments.length;
    success(`${accountData.shipments.length} shipments extraídos\n`);
  } catch (err) {
    warning(`Erro ao extrair shipments: ${err.message}\n`);
  }

  // ──────────────────────────────────────────────────────────────────────
  // 9. EXTRAIR ESTATÍSTICAS
  // ──────────────────────────────────────────────────────────────────────

  info('Extraindo estatísticas...');
  try {
    const reputation = await callML(`/users/${userData.id}/reputation`, token);
    accountData.statistics.reputation = reputation;
    success('Reputação extraída');
  } catch (err) {
    warning(`Erro ao extrair reputação: ${err.message}`);
  }

  try {
    const visits = await callML(`/users/${userData.id}/user_visits/month`, token);
    accountData.statistics.visits = visits;
    success('Visitas extraídas');
  } catch (err) {
    warning(`Erro ao extrair visitas: ${err.message}`);
  }

  console.log();

  // ──────────────────────────────────────────────────────────────────────
  // 10. SALVAR ARQUIVO
  // ──────────────────────────────────────────────────────────────────────

  info('Salvando arquivo...');
  try {
    const outputPath = path.join(process.cwd(), CONFIG.output);
    fs.writeFileSync(outputPath, JSON.stringify(accountData, null, 2));
    success(`Arquivo salvo em: ${outputPath}\n`);
  } catch (err) {
    error(`Erro ao salvar arquivo: ${err.message}`);
    process.exit(1);
  }

  // ──────────────────────────────────────────────────────────────────────
  // 11. RESUMO FINAL
  // ──────────────────────────────────────────────────────────────────────

  print('═══════════════════════════════════════════════════════════', 'green');
  print('✓ EXTRAÇÃO COMPLETA!', 'green');
  print('═══════════════════════════════════════════════════════════\n', 'green');

  print('📊 RESUMO DOS DADOS EXTRAÍDOS:', 'cyan');
  status(`Itens: ${accountData.summary.totalItems}`);
  status(`Pedidos: ${accountData.summary.totalOrders}`);
  status(`Vendas: ${accountData.summary.totalSales}`);
  status(`Pagamentos: ${accountData.summary.totalPayments}`);
  status(`Shipments: ${accountData.summary.totalShipments}`);
  console.log();

  print('📋 COMO USAR O ARQUIVO:', 'cyan');
  status(`Ver tudo: jq '.' ${CONFIG.output}`);
  status(`Ver itens: jq '.items' ${CONFIG.output}`);
  status(`Ver pedidos: jq '.orders' ${CONFIG.output}`);
  status(`Ver resumo: jq '.summary' ${CONFIG.output}`);
  console.log();

  print('═══════════════════════════════════════════════════════════\n', 'green');
}

// Executar
main().catch(err => {
  error(`Erro fatal: ${err.message}`);
  process.exit(1);
});
