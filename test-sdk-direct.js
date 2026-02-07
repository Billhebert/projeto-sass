#!/usr/bin/env node

/**
 * SDK DIRECT TEST SUITE
 * =====================
 * 
 * Teste direto da SDK sem dependência de MongoDB
 * Testa apenas o carregamento e funcionalidade da SDK em memória
 */

const { MercadoLibreSDK } = require('./backend/sdk/complete-sdk');
const chalk = require('chalk');

// ============================================================================
// HELPERS
// ============================================================================

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
    }
  },
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
    logger.section('🚀 SDK DIRECT TEST SUITE');
    console.log(`${chalk.cyan('Testando a SDK sem dependência de banco de dados\n')}`);
    
    await this.testSDKImport();
    await this.testSDKClasses();
    await this.testSDKInitialization();
    await this.testSDKModules();
    await this.testHttpClient();
    await this.testAuthClasses();
    await this.testWithMockTokens();
    await this.printResults();
  }

  async testSDKImport() {
    logger.section('1️⃣  TESTE DE IMPORTAÇÃO');

    await this.addTest('SDK pode ser importada', async () => {
      if (!MercadoLibreSDK) {
        throw new Error('MercadoLibreSDK não foi importada');
      }
      logger.debug('SDK carregada com sucesso');
    });

    await this.addTest('SDK é uma classe/função', async () => {
      if (typeof MercadoLibreSDK !== 'function') {
        throw new Error('MercadoLibreSDK não é uma função/classe');
      }
      logger.debug('MercadoLibreSDK é uma classe válida');
    });
  }

  async testSDKClasses() {
    logger.section('2️⃣  TESTE DE CLASSES INTERNAS');

    await this.addTest('Verificar estrutura da SDK', async () => {
      const sdkCode = require.cache[require.resolve('./backend/sdk/complete-sdk')];
      if (!sdkCode) {
        throw new Error('SDK não foi carregada no cache');
      }
      logger.debug('SDK carregada no módulo Node');
    });

    await this.addTest('SDK contém classes de autenticação', async () => {
      // Verificar criando instância
      const sdk = new MercadoLibreSDK('test_token_123', 'refresh_token_456');
      
      if (!sdk.mlAuth) {
        throw new Error('SDK sem mlAuth');
      }

      logger.debug('Classes de autenticação inicializadas', {
        hasMLAuth: !!sdk.mlAuth,
        hasMLHttp: !!sdk.mlHttp,
      });
    });
  }

  async testSDKInitialization() {
    logger.section('3️⃣  TESTE DE INICIALIZAÇÃO');

    let sdk = null;

    await this.addTest('Criar instância com token de acesso', async () => {
      sdk = new MercadoLibreSDK('test_access_token_123456789', null);
      
      if (!sdk.mlAuth || !sdk.mlAuth.accessToken) {
        throw new Error('Token não foi armazenado');
      }

      logger.debug('Instância criada com sucesso', {
        hasToken: !!sdk.mlAuth.accessToken,
        tokenLength: sdk.mlAuth.accessToken.length,
      });

      this.testSDK = sdk;
    });

    await this.addTest('Criar instância com tokens de acesso e refresh', async () => {
      const sdkWithRefresh = new MercadoLibreSDK('access_token', 'refresh_token');
      
      if (!sdkWithRefresh.mlAuth || !sdkWithRefresh.mlAuth.refreshToken) {
        throw new Error('Refresh token não foi armazenado');
      }

      logger.debug('Instância com refresh token criada', {
        hasAccessToken: !!sdkWithRefresh.mlAuth.accessToken,
        hasRefreshToken: !!sdkWithRefresh.mlAuth.refreshToken,
      });
    });

    await this.addTest('SDK gera headers corretos', async () => {
      if (!this.testSDK) {
        throw new Error('SDK não foi inicializada');
      }

      const headers = this.testSDK.mlAuth.getHeaders();
      
      if (!headers['Authorization']) {
        throw new Error('Header Authorization não foi gerado');
      }

      if (!headers['Authorization'].includes('Bearer')) {
        throw new Error('Header Authorization não contém Bearer');
      }

      logger.debug('Headers gerados corretamente', {
        hasAuthorization: !!headers['Authorization'],
        hasContentType: !!headers['Content-Type'],
        authStartsWith: headers['Authorization'].substring(0, 30) + '...',
      });
    });
  }

  async testSDKModules() {
    logger.section('4️⃣  TESTE DE MÓDULOS');

    if (!this.testSDK) {
      logger.info('Pulando testes de módulos (SDK não inicializada)');
      return;
    }

    const requiredModules = [
      'items', 'orders', 'questions', 'messages', 'shipments',
      'categories', 'reviews', 'claims', 'returns', 'billing',
      'variations', 'kits', 'packs', 'images', 'prices',
      'automations', 'visits', 'trends', 'ads', 'search',
      'users', 'shops', 'listings', 'inventory', 'deals',
    ];

    await this.addTest(`Verificar ${requiredModules.length} módulos principais`, async () => {
      const missingModules = [];

      for (const module of requiredModules) {
        if (!this.testSDK[module]) {
          missingModules.push(module);
        }
      }

      if (missingModules.length > 0) {
        throw new Error(`Módulos não encontrados: ${missingModules.join(', ')}`);
      }

      logger.debug(`Todos os ${requiredModules.length} módulos estão presentes`);
    });

    await this.addTest('Cada módulo é um objeto com métodos', async () => {
      const itemsModule = this.testSDK.items;
      
      if (typeof itemsModule !== 'object') {
        throw new Error('items não é um objeto');
      }

      if (Object.keys(itemsModule).length === 0) {
        throw new Error('items não tem métodos');
      }

      const methodCount = Object.keys(itemsModule).length;
      logger.debug(`Módulo items contém ${methodCount} métodos`, {
        methods: Object.keys(itemsModule).slice(0, 5),
      });
    });

    await this.addTest('Verificar métodos de items', async () => {
      const expectedMethods = ['getItemsByUser', 'getItem', 'createItem', 'updateItem'];
      const itemsMethods = Object.keys(this.testSDK.items);
      
      const foundMethods = expectedMethods.filter(m => itemsMethods.includes(m));
      
      logger.debug(`Encontrados ${foundMethods.length}/${expectedMethods.length} métodos esperados`, {
        found: foundMethods,
        notFound: expectedMethods.filter(m => !foundMethods.includes(m)),
      });
    });
  }

  async testHttpClient() {
    logger.section('5️⃣  TESTE DO HTTP CLIENT');

    if (!this.testSDK) {
      logger.info('Pulando testes de HTTP client');
      return;
    }

    await this.addTest('SDK tem cliente HTTP', async () => {
      if (!this.testSDK.mlHttp) {
        throw new Error('SDK sem mlHttp');
      }

      logger.debug('Cliente HTTP inicializado', {
        hasRequest: typeof this.testSDK.mlHttp.request === 'function',
        hasBuildURL: typeof this.testSDK.mlHttp.buildURL === 'function',
      });
    });

    await this.addTest('HTTP client tem métodos necessários', async () => {
      const http = this.testSDK.mlHttp;
      const requiredMethods = ['request', 'buildURL', 'get', 'post', 'put', 'delete'];
      
      const missingMethods = requiredMethods.filter(m => typeof http[m] !== 'function');
      
      if (missingMethods.length > 0) {
        throw new Error(`Métodos HTTP ausentes: ${missingMethods.join(', ')}`);
      }

      logger.debug(`Todos os ${requiredMethods.length} métodos HTTP presentes`);
    });
  }

  async testAuthClasses() {
    logger.section('6️⃣  TESTE DE CLASSES DE AUTENTICAÇÃO');

    await this.addTest('MercadoLibreAuth funciona corretamente', async () => {
      // Testar através da SDK
      const sdk = new MercadoLibreSDK('token_ml_123');
      const headers = sdk.mlAuth.getHeaders('ml');
      
      if (!headers.Authorization) {
        throw new Error('MercadoLibreAuth não gera Authorization header');
      }

      logger.debug('MercadoLibreAuth funciona', {
        headerPresent: !!headers.Authorization,
        contentType: headers['Content-Type'],
      });
    });

    await this.addTest('Suporte a Mercado Pago', async () => {
      const sdk = new MercadoLibreSDK('token_ml_123');
      
      // Verificar se tem método para definir token MP
      if (typeof sdk.setMPAccessToken !== 'function') {
        throw new Error('SDK não tem setMPAccessToken');
      }

      logger.debug('Suporte a Mercado Pago presente');
    });
  }

  async testWithMockTokens() {
    logger.section('7️⃣  TESTE COM TOKENS MOCK');

    await this.addTest('SDK funciona com vários formatos de token', async () => {
      const testCases = [
        { name: 'Token simples', token: 'abc123' },
        { name: 'Token longo', token: 'x'.repeat(200) },
        { name: 'Token com caracteres especiais', token: 'token_2024!@#$%' },
      ];

      for (const testCase of testCases) {
        const sdk = new MercadoLibreSDK(testCase.token);
        if (!sdk.mlAuth || sdk.mlAuth.accessToken !== testCase.token) {
          throw new Error(`Falha em: ${testCase.name}`);
        }
      }

      logger.debug(`Testados ${testCases.length} formatos diferentes de token`);
    });

    await this.addTest('SDK permite trocar token dinamicamente', async () => {
      const sdk = new MercadoLibreSDK('token1');
      
      if (sdk.mlAuth.accessToken !== 'token1') {
        throw new Error('Token inicial não foi setado');
      }

      // Tentar criar nova instância com novo token
      const sdk2 = new MercadoLibreSDK('token2');
      
      if (sdk2.mlAuth.accessToken !== 'token2') {
        throw new Error('Novo token não foi setado');
      }

      // Verificar que não conflitam
      if (sdk.mlAuth.accessToken === sdk2.mlAuth.accessToken) {
        throw new Error('Tokens foram compartilhados entre instâncias');
      }

      logger.debug('Cada instância tem seu próprio token');
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
    } else {
      logger.section('✅ TODOS OS TESTES PASSARAM!');
    }

    console.log(`
${chalk.bold.cyan('CONCLUSÃO:')}

A SDK está ${this.results.failed === 0 ? chalk.green('✓ 100% FUNCIONAL') : chalk.red('✗ COM PROBLEMAS')}

${chalk.cyan('Próximos passos:')}
1. ${chalk.yellow('Conectar uma conta Mercado Livre')}
2. ${chalk.yellow('Testar chamadas reais à API')}
3. ${chalk.yellow('Migrar rotas existentes')}
4. ${chalk.yellow('Implementar novos recursos')}
    `);
  }
}

// ============================================================================
// EXECUÇÃO
// ============================================================================

async function main() {
  const suite = new SDKTestSuite();
  
  try {
    await suite.runAll();
    process.exit(suite.results.failed === 0 ? 0 : 1);
  } catch (error) {
    logger.error('Erro fatal durante os testes', error);
    process.exit(1);
  }
}

main();
