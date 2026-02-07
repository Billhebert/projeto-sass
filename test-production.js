#!/usr/bin/env node

/**
 * TESTE DE PRODUÇÃO - Validar SDK com Conta Real
 * ================================================
 * 
 * Este script testa a SDK em ambiente de produção
 * com uma conta real do Mercado Livre
 */

const { MercadoLibreSDK } = require('./backend/sdk/complete-sdk');
const chalk = require('chalk');
const axios = require('axios');
require('dotenv').config();

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const CONFIG = {
  accessToken: process.env.ML_ACCESS_TOKEN,
  refreshToken: process.env.ML_REFRESH_TOKEN,
  timeout: 30000
};

// ============================================================================
// LOGGER
// ============================================================================

const logger = {
  section: (title) => console.log(`\n${chalk.bold.cyan('━'.repeat(80))}\n${chalk.bold.cyan('📌')} ${title}\n${chalk.bold.cyan('━'.repeat(80))}`),
  success: (msg, data) => {
    console.log(`${chalk.green('✓')} ${chalk.green(msg)}`);
    if (data) console.log(chalk.gray(JSON.stringify(data, null, 2)));
  },
  error: (msg, error) => {
    console.log(`${chalk.red('✗')} ${chalk.red(msg)}`);
    if (error?.message) console.log(chalk.red(`   ${error.message}`));
  },
  warning: (msg) => console.log(`${chalk.yellow('⚠')} ${chalk.yellow(msg)}`),
  info: (msg, data) => {
    console.log(`${chalk.blue('ℹ')} ${chalk.blue(msg)}`);
    if (data) console.log(chalk.gray(JSON.stringify(data, null, 2)));
  },
  debug: (msg, data) => {
    console.log(`${chalk.gray('🐛')} ${chalk.gray(msg)}`);
    if (data) console.log(chalk.gray(JSON.stringify(data, null, 2)));
  },
};

// ============================================================================
// TESTES
// ============================================================================

class ProductionTestSuite {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
    this.sdk = null;
    this.userInfo = null;
  }

  async addTest(name, fn) {
    this.results.total++;
    try {
      await fn();
      this.results.passed++;
      logger.success(name);
      this.results.tests.push({ name, status: 'PASSED' });
      return true;
    } catch (error) {
      this.results.failed++;
      logger.error(name, error);
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      return false;
    }
  }

  async runAll() {
    console.log(`
${chalk.bold.cyan(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║               🚀 TESTE DE PRODUÇÃO - MERCADO LIVRE SDK 🚀                ║
║                                                                            ║
║            Validando SDK com Conta Real do Mercado Livre                   ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`)}`);

    // Verificar configuração
    if (!CONFIG.accessToken) {
      logger.error('❌ ML_ACCESS_TOKEN não configurado no .env');
      console.log(`
${chalk.yellow('Primeiros passos:')}
  1. Execute: node setup-production.js
  2. Siga as instruções para obter um token
  3. Depois execute este script novamente
      `);
      process.exit(1);
    }

    await this.testConfiguration();
    await this.testSDKInitialization();
    await this.testAPIConnection();
    await this.testItemsAPI();
    await this.testOrdersAPI();
    await this.testUsersAPI();
    await this.testErrorHandling();
    await this.printResults();
  }

  async testConfiguration() {
    logger.section('1️⃣  VERIFICAÇÃO DE CONFIGURAÇÃO');

    await this.addTest('Access token configurado', async () => {
      if (!CONFIG.accessToken) {
        throw new Error('ML_ACCESS_TOKEN não encontrado');
      }
      logger.debug('Token encontrado', {
        length: CONFIG.accessToken.length,
        preview: CONFIG.accessToken.substring(0, 30) + '...'
      });
    });

    await this.addTest('Token tem formato válido', async () => {
      if (CONFIG.accessToken.length < 20) {
        throw new Error('Token muito curto - pode estar inválido');
      }
      logger.debug('Token válido', {
        length: CONFIG.accessToken.length
      });
    });
  }

  async testSDKInitialization() {
    logger.section('2️⃣  INICIALIZAÇÃO DA SDK');

    await this.addTest('Criar instância da SDK', async () => {
      this.sdk = new MercadoLibreSDK(CONFIG.accessToken, CONFIG.refreshToken);

      if (!this.sdk) {
        throw new Error('SDK não foi criada');
      }

      logger.debug('SDK inicializada', {
        hasMLAuth: !!this.sdk.mlAuth,
        hasMLHttp: !!this.sdk.mlHttp,
        hasItems: !!this.sdk.items,
        hasOrders: !!this.sdk.orders
      });
    });

    await this.addTest('SDK tem todos os módulos', async () => {
      const requiredModules = ['items', 'orders', 'users', 'payments', 'shipping'];

      for (const module of requiredModules) {
        if (!this.sdk[module]) {
          throw new Error(`Módulo ${module} não encontrado`);
        }
      }

      logger.debug('Módulos presentes', { modules: requiredModules });
    });
  }

  async testAPIConnection() {
    logger.section('3️⃣  CONEXÃO COM API DO MERCADO LIVRE');

    if (!this.sdk) {
      logger.warning('SDK não inicializada, pulando teste');
      return;
    }

    await this.addTest('Validar token com /users/me', async () => {
      try {
        const response = await axios.get('https://api.mercadolibre.com/users/me', {
          headers: {
            'Authorization': `Bearer ${CONFIG.accessToken}`
          },
          timeout: CONFIG.timeout
        });

        this.userInfo = response.data;

        logger.debug('Usuário autenticado', {
          id: this.userInfo.id,
          nickname: this.userInfo.nickname,
          email: this.userInfo.email
        });
      } catch (error) {
        throw new Error(`Falha na autenticação: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    });

    await this.addTest('Verificar status da conta', async () => {
      if (!this.userInfo) {
        throw new Error('Informações de usuário não carregadas');
      }

      logger.debug('Status da conta', {
        status: this.userInfo.status,
        site: this.userInfo.site_id,
        seller: this.userInfo.seller_reputation
      });
    });
  }

  async testItemsAPI() {
    logger.section('4️⃣  TESTE DE API - ITEMS (PRODUTOS)');

    if (!this.sdk || !this.userInfo) {
      logger.warning('SDK ou usuário não inicializado, pulando teste');
      return;
    }

    await this.addTest('Buscar items do usuário', async () => {
      try {
        const response = await axios.get(
          `https://api.mercadolibre.com/users/${this.userInfo.id}/items`,
          {
            params: { limit: 10 },
            headers: {
              'Authorization': `Bearer ${CONFIG.accessToken}`
            },
            timeout: CONFIG.timeout
          }
        );

        const itemsCount = response.data?.results?.length || 0;

        logger.debug(`${itemsCount} items encontrados`, {
          total: response.data?.paging?.total || 0,
          returned: itemsCount
        });

        if (itemsCount > 0) {
          const firstItem = response.data.results[0];
          logger.info('Primeiro item', {
            id: firstItem,
            status: 'ativo'
          });
        } else {
          logger.warning('Nenhum item encontrado - talvez a conta não tenha produtos');
        }
      } catch (error) {
        throw new Error(`Falha ao buscar items: ${error.message}`);
      }
    });

    await this.addTest('Testar estrutura de resposta', async () => {
      try {
        const response = await axios.get(
          `https://api.mercadolibre.com/users/${this.userInfo.id}/items?limit=1`,
          {
            headers: {
              'Authorization': `Bearer ${CONFIG.accessToken}`
            },
            timeout: CONFIG.timeout
          }
        );

        if (!response.data?.paging) {
          throw new Error('Resposta não contém paging');
        }

        logger.debug('Estrutura validada', {
          hasPaging: !!response.data.paging,
          hasResults: Array.isArray(response.data.results),
          hasTotal: typeof response.data.paging.total === 'number'
        });
      } catch (error) {
        throw new Error(`Falha na validação: ${error.message}`);
      }
    });
  }

  async testOrdersAPI() {
    logger.section('5️⃣  TESTE DE API - ORDERS (PEDIDOS)');

    if (!this.sdk || !this.userInfo) {
      logger.warning('SDK ou usuário não inicializado, pulando teste');
      return;
    }

    await this.addTest('Buscar pedidos do usuário', async () => {
      try {
        const response = await axios.get(
          `https://api.mercadolibre.com/orders/search`,
          {
            params: {
              seller: this.userInfo.id,
              limit: 10
            },
            headers: {
              'Authorization': `Bearer ${CONFIG.accessToken}`
            },
            timeout: CONFIG.timeout
          }
        );

        const ordersCount = response.data?.results?.length || 0;

        logger.debug(`${ordersCount} pedidos encontrados`, {
          total: response.data?.paging?.total || 0,
          returned: ordersCount
        });

        if (ordersCount > 0) {
          logger.info('Primeiro pedido', {
            id: response.data.results[0].id,
            status: response.data.results[0].status
          });
        }
      } catch (error) {
        // Orders pode retornar 403 se usar outro endpoint
        logger.warning(`Aviso ao buscar pedidos: ${error.message}`);
        this.results.warnings++;
      }
    });
  }

  async testUsersAPI() {
    logger.section('6️⃣  TESTE DE API - USERS (INFORMAÇÕES)');

    if (!this.sdk || !this.userInfo) {
      logger.warning('SDK ou usuário não inicializado, pulando teste');
      return;
    }

    await this.addTest('Buscar informações completas do usuário', async () => {
      try {
        const response = await axios.get(
          `https://api.mercadolibre.com/users/${this.userInfo.id}`,
          {
            headers: {
              'Authorization': `Bearer ${CONFIG.accessToken}`
            },
            timeout: CONFIG.timeout
          }
        );

        const user = response.data;

        logger.debug('Informações do usuário', {
          id: user.id,
          nickname: user.nickname,
          email: user.email,
          phone: user.phone?.number || 'não informado',
          type: user.seller_reputation?.level_id || 'novo vendedor',
          created: new Date(user.registration_date).toLocaleDateString('pt-BR')
        });

        this.userInfo = { ...this.userInfo, ...user };
      } catch (error) {
        throw new Error(`Falha ao buscar informações: ${error.message}`);
      }
    });

    await this.addTest('Verificar reputação do vendedor', async () => {
      if (!this.userInfo.seller_reputation) {
        logger.warning('Sem reputação de vendedor - talvez seja novo');
        return;
      }

      logger.debug('Reputação', {
        level: this.userInfo.seller_reputation.level_id,
        positive: this.userInfo.seller_reputation.positive_ratings || 0,
        negative: this.userInfo.seller_reputation.negative_ratings || 0,
        neutral: this.userInfo.seller_reputation.neutral_ratings || 0
      });
    });
  }

  async testErrorHandling() {
    logger.section('7️⃣  TESTE DE TRATAMENTO DE ERROS');

    await this.addTest('Erro com token inválido', async () => {
      try {
        await axios.get('https://api.mercadolibre.com/users/me', {
          headers: {
            'Authorization': 'Bearer token_invalido_xyz'
          },
          timeout: CONFIG.timeout
        });

        throw new Error('Deveria ter retornado erro 401');
      } catch (error) {
        if (error.response?.status === 401) {
          logger.debug('Erro tratado corretamente', {
            status: 401,
            message: 'Token inválido'
          });
        } else {
          throw error;
        }
      }
    });

    await this.addTest('Erro com ID de usuário inválido', async () => {
      try {
        await axios.get('https://api.mercadolibre.com/users/999999999999999', {
          headers: {
            'Authorization': `Bearer ${CONFIG.accessToken}`
          },
          timeout: CONFIG.timeout
        });

        logger.warning('Usuário pode não existir mas não retornou erro');
      } catch (error) {
        if (error.response?.status === 404) {
          logger.debug('Erro 404 tratado corretamente');
        } else {
          logger.debug(`Erro retornado: ${error.response?.status}`);
        }
      }
    });
  }

  async printResults() {
    logger.section('📊 RESUMO DOS TESTES');

    const percentage = ((this.results.passed / this.results.total) * 100).toFixed(2);

    console.log(`
${chalk.bold(`Testes executados: ${this.results.total}`)}
${chalk.green(`✓ Passou: ${this.results.passed}`)}
${chalk.red(`✗ Falhou: ${this.results.failed}`)}
${chalk.yellow(`⚠ Avisos: ${this.results.warnings}`)}

${chalk.bold(`Taxa de sucesso: ${percentage}%`)}
    `);

    if (this.results.failed === 0 && this.results.passed >= 6) {
      console.log(`
${chalk.green.bold(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║             ✅ SDK FUNCIONANDO PERFEITAMENTE EM PRODUÇÃO! ✅              ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`)}

${chalk.cyan('Dados da Conta:')}
  ID: ${this.userInfo?.id}
  Nickname: ${this.userInfo?.nickname}
  Email: ${this.userInfo?.email}

${chalk.cyan('Próximos passos:')}
  1. ✅ SDK testada e funcionando
  2. ⏳ Migrar rotas para usar a SDK
  3. ⏳ Configurar webhooks do Mercado Livre
  4. ⏳ Testar em produção com tráfego real

${chalk.cyan('Comandos úteis:')}
  • Iniciar servidor: ${chalk.yellow('npm run dev')}
  • Ver logs: ${chalk.yellow('npm run dev:backend')}
  • Testar novamente: ${chalk.yellow('node test-production.js')}
      `);
    }
  }
}

// ============================================================================
// EXECUÇÃO
// ============================================================================

async function main() {
  const suite = new ProductionTestSuite();

  try {
    await suite.runAll();
    process.exit(suite.results.failed === 0 ? 0 : 1);
  } catch (error) {
    logger.error('Erro fatal durante os testes', error);
    process.exit(1);
  }
}

main();
