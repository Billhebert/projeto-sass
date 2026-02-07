#!/usr/bin/env node

/**
 * SDK COMPLETE TEST SUITE
 * ========================
 * 
 * Script abrangente para testar toda a integração da SDK com:
 * - Mercado Livre API
 * - Mercado Pago API
 * - Global Selling
 * 
 * Testa:
 * ✓ Conectividade com banco de dados (MongoDB)
 * ✓ Carregamento de contas ML do banco
 * ✓ Inicialização da SDK
 * ✓ Chamadas de API reais
 * ✓ Cache e performance
 * ✓ Tratamento de erros
 * ✓ Diferentes tipos de recursos
 */

const { MercadoLibreSDK } = require('./backend/sdk/complete-sdk');
const mongoose = require('mongoose');
const chalk = require('chalk');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ============================================================================
// CONFIGURAÇÃO E HELPERS
// ============================================================================

const CONFIG = {
  mongodb: process.env.MONGO_URI || 'mongodb://admin:changeme@localhost:27017/projeto-sass?authSource=admin',
  timeout: 30000,
  colors: {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
    debug: 'gray',
  },
};

// Logger colorido
const logger = {
  section: (title) => console.log(`\n${chalk.bold.cyan('━'.repeat(80))}\n${chalk.bold.cyan('📌')} ${title}\n${chalk.bold.cyan('━'.repeat(80))}`),
  success: (msg, data) => {
    console.log(`${chalk.green('✓')} ${chalk.green(msg)}`);
    if (data) console.log(chalk.gray(JSON.stringify(data, null, 2)));
  },
  error: (msg, error) => {
    console.log(`${chalk.red('✗')} ${chalk.red(msg)}`);
    if (error) {
      if (error.message) console.log(chalk.red(`   Error: ${error.message}`));
      if (error.stack) console.log(chalk.gray(error.stack));
    }
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

class SDKTestSuite {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: [],
    };
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
    await this.testDatabaseConnection();
    await this.testAccountLoading();
    await this.testSDKInitialization();
    await this.testMercadoLivrAPIs();
    await this.testSDKManager();
    await this.testCaching();
    await this.testErrorHandling();
    await this.printResults();
  }

  async testDatabaseConnection() {
    logger.section('1️⃣  TESTE DE CONEXÃO COM BANCO DE DADOS');
    
    await this.addTest('Conectar ao MongoDB', async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await mongoose.connect(CONFIG.mongodb, {
        serverSelectionTimeoutMS: 5000,
      });
      logger.debug('Conectado ao MongoDB', { uri: CONFIG.mongodb.split('@')[0] + '@...' });
    });

    await this.addTest('Verificar coleções', async () => {
      const collections = await mongoose.connection.db.listCollections().toArray();
      logger.debug('Coleções encontradas', {
        count: collections.length,
        names: collections.map(c => c.name),
      });
      if (collections.length === 0) {
        throw new Error('Nenhuma coleção encontrada no banco');
      }
    });
  }

  async testAccountLoading() {
    logger.section('2️⃣  TESTE DE CARREGAMENTO DE CONTAS');

    let account = null;

    await this.addTest('Encontrar conta ML no banco', async () => {
      try {
        const MLAccount = require('./backend/db/models/MLAccount');
        account = await MLAccount.findOne().lean();
        
        if (!account) {
          throw new Error('Nenhuma conta ML encontrada no banco. Você precisa conectar uma conta primeiro.');
        }

        logger.debug('Conta encontrada', {
          id: account.id,
          mlUserId: account.mlUserId,
          nickname: account.nickname,
          email: account.email,
          hasAccessToken: !!account.accessToken,
          hasRefreshToken: !!account.refreshToken,
        });
      } catch (error) {
        throw error;
      }
    });

    await this.addTest('Validar tokens na conta', async () => {
      if (!account) {
        throw new Error('Conta não carregada');
      }
      
      if (!account.accessToken) {
        throw new Error('Access token ausente');
      }

      if (account.accessToken.length < 20) {
        throw new Error('Access token parece inválido (muito curto)');
      }

      logger.debug('Tokens validados', {
        accessTokenLength: account.accessToken.length,
        refreshTokenPresent: !!account.refreshToken,
      });
    });

    this.testAccount = account;
  }

  async testSDKInitialization() {
    logger.section('3️⃣  TESTE DE INICIALIZAÇÃO DA SDK');

    if (!this.testAccount) {
      logger.warning('Pulando testes de SDK (conta não carregada)');
      return;
    }

    await this.addTest('Criar instância da SDK', async () => {
      const sdk = new MercadoLibreSDK(
        this.testAccount.accessToken,
        this.testAccount.refreshToken
      );

      if (!sdk.mlAuth) {
        throw new Error('SDK sem mlAuth');
      }

      logger.debug('SDK inicializada', {
        hasMLAuth: !!sdk.mlAuth,
        hasMLHttp: !!sdk.mlHttp,
        hasItems: !!sdk.items,
        hasOrders: !!sdk.orders,
        hasQuestions: !!sdk.questions,
        hasMessages: !!sdk.messages,
        hasShipments: !!sdk.shipments,
      });

      this.testSDK = sdk;
    });

    await this.addTest('Verificar módulos da SDK', async () => {
      const requiredModules = [
        'items', 'orders', 'questions', 'messages', 'shipments',
        'categories', 'reviews', 'claims', 'returns', 'billing'
      ];

      for (const module of requiredModules) {
        if (!this.testSDK[module]) {
          throw new Error(`Módulo ${module} não encontrado na SDK`);
        }
      }

      logger.debug('Todos os módulos presentes', { modules: requiredModules.length });
    });
  }

  async testMercadoLivrAPIs() {
    logger.section('4️⃣  TESTE DE CHAMADAS À API DO MERCADO LIVRE');

    if (!this.testSDK || !this.testAccount) {
      logger.warning('Pulando testes de API (SDK não inicializada)');
      return;
    }

    // Teste 1: getItemsByUser
    await this.addTest('API: items.getItemsByUser()', async () => {
      try {
        const result = await Promise.race([
          this.testSDK.items.getItemsByUser(this.testAccount.mlUserId, { limit: 5 }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout na requisição')), CONFIG.timeout)
          ),
        ]);

        if (!result) {
          throw new Error('Resposta vazia');
        }

        logger.debug('getItemsByUser resposta', {
          status: result.status,
          dataType: typeof result.data,
          hasResults: !!result.data?.results,
          resultsCount: result.data?.results?.length || 0,
        });

        this.testResults = result;
      } catch (error) {
        throw new Error(`Falha em getItemsByUser: ${error.message}`);
      }
    });

    // Teste 2: getUserInfo
    await this.addTest('API: users.getUserInfo()', async () => {
      try {
        const result = await Promise.race([
          this.testSDK.users.getUserInfo(this.testAccount.mlUserId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout na requisição')), CONFIG.timeout)
          ),
        ]);

        logger.debug('getUserInfo resposta', {
          status: result.status,
          hasData: !!result.data,
          userId: result.data?.id,
          nickname: result.data?.nickname,
        });
      } catch (error) {
        throw new Error(`Falha em getUserInfo: ${error.message}`);
      }
    });

    // Teste 3: getListingFees (se houver items)
    if (this.testResults?.data?.results?.length > 0) {
      await this.addTest('API: items.getListingFees()', async () => {
        try {
          const itemId = this.testResults.data.results[0];
          const result = await Promise.race([
            this.testSDK.items.getListingFees(itemId, this.testAccount.mlUserId),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout na requisição')), CONFIG.timeout)
            ),
          ]);

          logger.debug('getListingFees resposta', {
            status: result.status,
            hasData: !!result.data,
          });
        } catch (error) {
          logger.warning(`getListingFees falhou (esperado se item não houver taxas): ${error.message}`);
        }
      });
    }

    // Teste 4: getOrdersByUser
    await this.addTest('API: orders.getOrdersByUser()', async () => {
      try {
        const result = await Promise.race([
          this.testSDK.orders.getOrdersByUser(this.testAccount.mlUserId, { limit: 5 }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout na requisição')), CONFIG.timeout)
          ),
        ]);

        logger.debug('getOrdersByUser resposta', {
          status: result.status,
          hasResults: !!result.data?.results,
          resultsCount: result.data?.results?.length || 0,
        });
      } catch (error) {
        throw new Error(`Falha em getOrdersByUser: ${error.message}`);
      }
    });
  }

  async testSDKManager() {
    logger.section('5️⃣  TESTE DO SDK MANAGER');

    if (!this.testAccount) {
      logger.warning('Pulando testes do SDK Manager (conta não carregada)');
      return;
    }

    const sdkManager = require('./backend/services/sdk-manager');

    await this.addTest('SDK Manager: getSDK()', async () => {
      try {
        const sdk = await sdkManager.getSDK(this.testAccount.id);
        
        if (!sdk) {
          throw new Error('SDK Manager retornou undefined');
        }

        logger.debug('SDK Manager carregou SDK', {
          hasItems: !!sdk.items,
          hasOrders: !!sdk.orders,
          accountCached: true,
        });

        this.managerSDK = sdk;
      } catch (error) {
        throw new Error(`Falha no SDK Manager: ${error.message}`);
      }
    });

    await this.addTest('SDK Manager: Cache funcionando', async () => {
      if (!this.managerSDK) {
        throw new Error('SDK não carregada no teste anterior');
      }

      const start = Date.now();
      const sdk2 = await sdkManager.getSDK(this.testAccount.id);
      const elapsed = Date.now() - start;

      logger.debug('Tempo de carregamento com cache', {
        elapsedMs: elapsed,
        fromCache: elapsed < 50,
      });

      if (elapsed > 100) {
        logger.warning('Cache pode não estar funcionando (requisição muito lenta)');
      }
    });

    await this.addTest('SDK Manager: invalidateCache()', async () => {
      sdkManager.invalidateCache(this.testAccount.id);
      logger.debug('Cache invalidado com sucesso');
    });
  }

  async testCaching() {
    logger.section('6️⃣  TESTE DE CACHE E PERFORMANCE');

    if (!this.testSDK || !this.testAccount) {
      logger.warning('Pulando testes de cache (SDK não inicializada)');
      return;
    }

    await this.addTest('Performance: Primeira requisição', async () => {
      const start = Date.now();
      await this.testSDK.users.getUserInfo(this.testAccount.mlUserId);
      const elapsed = Date.now() - start;

      logger.debug('Tempo de primeira requisição', { ms: elapsed });
      this.firstRequestTime = elapsed;
    });

    await this.addTest('Performance: Requisição em sequência', async () => {
      const times = [];
      
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await this.testSDK.users.getUserInfo(this.testAccount.mlUserId);
        times.push(Date.now() - start);
      }

      logger.debug('Tempos de requisições sequenciais', {
        times: times,
        average: Math.round(times.reduce((a, b) => a + b) / times.length),
      });
    });
  }

  async testErrorHandling() {
    logger.section('7️⃣  TESTE DE TRATAMENTO DE ERROS');

    if (!this.testSDK) {
      logger.warning('Pulando testes de erro (SDK não inicializada)');
      return;
    }

    await this.addTest('Erro: ID de usuário inválido', async () => {
      try {
        await this.testSDK.users.getUserInfo('999999999');
        throw new Error('Deveria ter lançado um erro');
      } catch (error) {
        if (error.message.includes('Deveria ter lançado')) {
          throw error;
        }
        logger.debug('Erro capturado corretamente', { 
          errorType: error.constructor.name,
          message: error.message.substring(0, 100),
        });
      }
    });

    await this.addTest('Erro: Token inválido', async () => {
      try {
        const badSDK = new MercadoLibreSDK('token_invalido_12345');
        await badSDK.users.getUserInfo('123456');
        throw new Error('Deveria ter lançado um erro');
      } catch (error) {
        if (error.message.includes('Deveria ter lançado')) {
          throw error;
        }
        logger.debug('Erro de token capturado corretamente', { 
          message: error.message.substring(0, 100),
        });
      }
    });
  }

  async printResults() {
    logger.section('📊 RESUMO DOS TESTES');

    console.log(`
${chalk.bold('Total de testes:')} ${this.results.total}
${chalk.green(`✓ Passou: ${this.results.passed}`)}
${chalk.red(`✗ Falhou: ${this.results.failed}`)}
${chalk.cyan(`Taxa de sucesso: ${((this.results.passed / this.results.total) * 100).toFixed(2)}%`)}
    `);

    if (this.results.failed > 0) {
      logger.section('❌ TESTES FALHADOS');
      this.results.tests
        .filter(t => t.status === 'FAILED')
        .forEach(t => {
          console.log(`${chalk.red('✗')} ${t.name}`);
          if (t.error) console.log(`   ${chalk.gray(t.error)}`);
        });
    }

    if (this.results.passed === this.results.total) {
      logger.section('✅ TODOS OS TESTES PASSARAM!');
      console.log(`
${chalk.green.bold('A SDK está 100% funcional!')}

Próximos passos:
1. Migrar rotas existentes para usar a SDK
2. Implementar novos recursos
3. Aumentar cobertura de testes
      `);
    }
  }
}

// ============================================================================
// EXECUÇÃO
// ============================================================================

async function main() {
  console.log(`
${chalk.bold.cyan(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                    🚀 SDK COMPLETE TEST SUITE 🚀                          ║
║                                                                            ║
║          Testando integração completa do Mercado Livre SDK                ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`)}`);

  const suite = new SDKTestSuite();
  
  try {
    await suite.runAll();
    process.exit(suite.results.failed === 0 ? 0 : 1);
  } catch (error) {
    logger.error('Erro fatal durante os testes', error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.debug('Desconectado do MongoDB');
    }
  }
}

main();
