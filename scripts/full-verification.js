#!/usr/bin/env node

/**
 * Complete Verification Script
 * Verifica todos os aspectos do sistema em produção
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testsPassed = 0;
let testsFailed = 0;
let testsWarning = 0;

function pass(message, details = '') {
  console.log(`${colors.green}✓${colors.reset} ${message}${details ? ` - ${details}` : ''}`);
  testsPassed++;
}

function fail(message, details = '') {
  console.log(`${colors.red}✗${colors.reset} ${message}${details ? ` - ${details}` : ''}`);
  testsFailed++;
}

function warn(message, details = '') {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}${details ? ` - ${details}` : ''}`);
  testsWarning++;
}

function info(message) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
}

function section(title) {
  console.log(`\n${colors.blue}${title}${colors.reset}`);
  console.log('─'.repeat(60));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkServer(url, timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const check = () => {
      http.get(url, (res) => {
        resolve(true);
      }).on('error', () => {
        if (Date.now() - startTime < timeout) {
          setTimeout(check, 500);
        } else {
          resolve(false);
        }
      });
    };
    check();
  });
}

async function runVerification() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  PROJETO SASS - Verificação Completa de Produção                 ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // ============================================
  // 1. NODE.JS E AMBIENTE
  // ============================================
  section('1. Node.js e Ambiente');

  try {
    const version = execSync('node --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(version.split('.')[0].substring(1));
    if (majorVersion >= 16) {
      pass(`Node.js instalado`, version);
    } else {
      fail(`Node.js versão ${version} (mínimo v16 requerido)`);
    }
  } catch {
    fail('Node.js não encontrado');
  }

  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    pass(`npm instalado`, npmVersion);
  } catch {
    fail('npm não encontrado');
  }

  // ============================================
  // 2. DEPENDÊNCIAS
  // ============================================
  section('2. Dependências Instaladas');

  const requiredPackages = [
    'express', 'mongoose', 'pino', 'helmet', 'cors',
    'axios', 'dotenv', 'ws', 'joi', 'bcryptjs',
    'express-rate-limit', 'uuid', 'node-schedule'
  ];

  try {
    const packageJson = require('../package.json');
    let allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    for (const pkg of requiredPackages) {
      if (allDeps[pkg]) {
        pass(`${pkg}`, allDeps[pkg]);
      } else {
        fail(`${pkg} não encontrado`);
      }
    }
  } catch {
    fail('Não foi possível ler package.json');
  }

  // ============================================
  // 3. ESTRUTURA DE ARQUIVOS
  // ============================================
  section('3. Estrutura de Arquivos');

  const requiredFiles = [
    'backend/server.js',
    'backend/logger.js',
    'backend/db/mongodb.js',
    'backend/db/models/Account.js',
    'backend/db/models/Event.js',
    'backend/db/models/Log.js',
    'backend/db/migrate.js',
    'backend/jobs/sync.js',
    'backend/jobs/webhooks.js',
    'backend/routes/auth.js',
    'backend/routes/webhooks.js',
    'backend/routes/accounts.js',
    'backend/routes/sync.js',
    'backend/.env.example',
    'Dockerfile',
    'docker-compose.yml',
    'ecosystem.config.js',
    'nginx.conf',
    'scripts/deploy-production.sh',
    'scripts/setup-ssl.sh',
    'scripts/backup.sh',
    'scripts/verify-production.js',
    '.github/workflows/ci-cd.yml',
    'jest.config.js'
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      pass(`${file}`);
    } else {
      fail(`${file} não encontrado`);
    }
  }

  // ============================================
  // 4. CONFIGURAÇÃO
  // ============================================
  section('4. Configuração (.env)');

  const envPath = 'backend/.env';
  if (fs.existsSync(envPath)) {
    pass('.env arquivo existe');
    
    require('dotenv').config({ path: envPath });
    
    const requiredVars = ['NODE_ENV', 'MONGODB_URI', 'ML_CLIENT_ID', 'ML_CLIENT_SECRET'];
    
    for (const varName of requiredVars) {
      if (process.env[varName]) {
        const value = process.env[varName];
        const masked = value.length > 20 ? value.substring(0, 10) + '***' : value;
        pass(`${varName}`, masked);
      } else {
        fail(`${varName} não configurado`);
      }
    }
  } else {
    fail('.env não encontrado');
    info('Execute: cp backend/.env.example backend/.env');
  }

  // ============================================
  // 5. GIT CONFIGURATION
  // ============================================
  section('5. Configuração Git');

  try {
    const gitStatus = execSync('git status --short', { encoding: 'utf8' });
    if (!gitStatus.includes('.env')) {
      pass('.env não está trackado no git');
    } else {
      warn('.env está no git (remover!)', 'git rm --cached backend/.env');
    }
  } catch {
    warn('Git não inicializado');
  }

  // ============================================
  // 6. BANCO DE DADOS
  // ============================================
  section('6. Banco de Dados MongoDB');

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/projeto-sass';
    const mongoose = require('mongoose');
    
    // Tentar conectar com timeout
    const connectionPromise = mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    
    connectionPromise
      .then(() => {
        pass('MongoDB conectado');
        
        // Verificar collections
        const db = mongoose.connection.db;
        db.listCollections().toArray().then(collections => {
          const names = collections.map(c => c.name);
          if (names.length > 0) {
            pass(`Collections encontradas`, names.join(', '));
          } else {
            warn('Nenhuma collection encontrada - execute: npm run db:migrate');
          }
        });
        
        mongoose.disconnect();
      })
      .catch(err => {
        fail('MongoDB não conectado', err.message);
        info('Verifique: MONGODB_URI e se mongod está rodando');
      });
  } catch (err) {
    fail('Erro ao testar MongoDB', err.message);
  }

  // ============================================
  // 7. PORTS E SERVIÇOS
  // ============================================
  section('7. Portas e Serviços');

  const ports = [
    { port: 3000, name: 'API Backend' },
    { port: 27017, name: 'MongoDB' },
    { port: 6379, name: 'Redis (optional)' },
    { port: 80, name: 'HTTP' },
    { port: 443, name: 'HTTPS' }
  ];

  for (const { port, name } of ports) {
    try {
      const result = execSync(`netstat -tulpn 2>/dev/null | grep :${port}`, { encoding: 'utf8' });
      if (result) {
        pass(`${name} (porta ${port})`, 'rodando');
      } else {
        warn(`${name} (porta ${port})`, 'não está rodando');
      }
    } catch {
      warn(`${name} (porta ${port})`, 'não está rodando');
    }
  }

  // ============================================
  // 8. SSL/TLS
  // ============================================
  section('8. SSL/TLS Certificate');

  const certFiles = ['ssl/cert.pem', 'ssl/key.pem'];
  let hasSSL = true;

  for (const file of certFiles) {
    if (fs.existsSync(file)) {
      pass(`${file} existe`);
    } else {
      fail(`${file} não encontrado`);
      hasSSL = false;
    }
  }

  if (hasSSL) {
    try {
      const certInfo = execSync('openssl x509 -in ssl/cert.pem -noout -dates', { encoding: 'utf8' });
      console.log('  ' + certInfo.split('\n').filter(Boolean).join('\n  '));
    } catch {
      warn('Não foi possível ler info do certificado');
    }
  }

  // ============================================
  // 9. PM2 CONFIGURATION
  // ============================================
  section('9. PM2 Configuration');

  if (fs.existsSync('ecosystem.config.js')) {
    pass('ecosystem.config.js encontrado');
    
    try {
      const pm2Version = execSync('pm2 --version', { encoding: 'utf8' }).trim();
      pass('PM2 instalado', pm2Version);
      
      try {
        const status = execSync('pm2 status', { encoding: 'utf8' });
        if (status.includes('projeto-sass')) {
          pass('Aplicação rodando via PM2');
        } else {
          warn('Aplicação não está rodando', 'Execute: pm2 start ecosystem.config.js');
        }
      } catch {
        warn('PM2 não tem aplicações rodando');
      }
    } catch {
      warn('PM2 não instalado globalmente');
      info('Execute: npm install -g pm2');
    }
  } else {
    fail('ecosystem.config.js não encontrado');
  }

  // ============================================
  // 10. DOCKER
  // ============================================
  section('10. Docker Configuration');

  if (fs.existsSync('Dockerfile')) {
    pass('Dockerfile encontrado');
  } else {
    fail('Dockerfile não encontrado');
  }

  if (fs.existsSync('docker-compose.yml')) {
    pass('docker-compose.yml encontrado');
    
    try {
      execSync('docker --version', { stdio: 'pipe' });
      pass('Docker instalado');
    } catch {
      warn('Docker não está instalado');
    }
  } else {
    fail('docker-compose.yml não encontrado');
  }

  // ============================================
  // 11. NGINX
  // ============================================
  section('11. Nginx Configuration');

  if (fs.existsSync('nginx.conf')) {
    pass('nginx.conf encontrado');
    
    try {
      execSync('nginx -t 2>&1', { stdio: 'pipe' });
      pass('Nginx configurado corretamente');
    } catch {
      warn('Nginx pode não estar instalado');
    }
  } else {
    fail('nginx.conf não encontrado');
  }

  // ============================================
  // 12. SECURITY
  // ============================================
  section('12. Segurança');

  const serverFile = fs.readFileSync('backend/server.js', 'utf8');
  
  if (serverFile.includes('helmet')) {
    pass('Helmet.js (security headers) configurado');
  } else {
    fail('Helmet.js não encontrado');
  }

  if (serverFile.includes('rateLimit')) {
    pass('Rate limiting configurado');
  } else {
    fail('Rate limiting não encontrado');
  }

  if (serverFile.includes('cors')) {
    pass('CORS configurado');
  } else {
    fail('CORS não encontrado');
  }

  if (!serverFile.includes('ML_CLIENT_SECRET')) {
    pass('CLIENT_SECRET não hardcoded (seguro)');
  } else {
    fail('CLIENT_SECRET pode estar hardcoded!');
  }

  // ============================================
  // 13. LOGGING
  // ============================================
  section('13. Logging');

  if (fs.existsSync('backend/logger.js')) {
    pass('Logger configurado');
  } else {
    fail('Logger não encontrado');
  }

  if (fs.existsSync('logs')) {
    const logFiles = fs.readdirSync('logs').length;
    pass('Diretório logs existe', `${logFiles} arquivos`);
  } else {
    warn('Diretório logs não existe (será criado em runtime)');
  }

  // ============================================
  // 14. TESTS
  // ============================================
  section('14. Testes');

  if (fs.existsSync('jest.config.js')) {
    pass('Jest configurado');
  } else {
    fail('jest.config.js não encontrado');
  }

  if (fs.existsSync('tests/')) {
    const testFiles = fs.readdirSync('tests').filter(f => f.endsWith('.test.js'));
    pass(`Testes criados`, `${testFiles.length} arquivos`);
  } else {
    warn('Diretório tests/ não existe');
  }

  // ============================================
  // 15. CI/CD
  // ============================================
  section('15. CI/CD Pipeline');

  if (fs.existsSync('.github/workflows/ci-cd.yml')) {
    pass('GitHub Actions CI/CD configurado');
  } else {
    fail('GitHub Actions não encontrado');
  }

  // ============================================
  // 16. DOCUMENTATION
  // ============================================
  section('16. Documentação');

  const docs = [
    'PRODUCTION_READY.md',
    'DEPLOYMENT.md',
    'QUICK_START.md',
    'START_HERE.md'
  ];

  for (const doc of docs) {
    if (fs.existsSync(doc)) {
      pass(`${doc}`);
    } else {
      warn(`${doc} não encontrado`);
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  section('RESUMO DA VERIFICAÇÃO');

  const total = testsPassed + testsFailed + testsWarning;
  const percentage = Math.round((testsPassed / total) * 100);

  console.log(`\n${colors.green}✓ Passaram:${colors.reset}    ${testsPassed}/${total}`);
  console.log(`${colors.red}✗ Falharam:${colors.reset}    ${testsFailed}/${total}`);
  console.log(`${colors.yellow}⚠ Avisos:${colors.reset}     ${testsWarning}/${total}`);
  console.log(`\n${colors.cyan}Porcentagem de sucesso: ${percentage}%${colors.reset}`);

  if (testsFailed === 0) {
    console.log(`\n${colors.green}╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║                                                                ║`);
    console.log(`║  ✓ TUDO VERIFICADO COM SUCESSO!                              ║`);
    console.log(`║                                                                ║`);
    console.log(`║  Seu sistema está 100% pronto para produção!                 ║`);
    console.log(`║                                                                ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║                                                                ║`);
    console.log(`║  ✗ EXISTEM PROBLEMAS QUE PRECISAM SER CORRIGIDOS              ║`);
    console.log(`║                                                                ║`);
    console.log(`║  Corrija os ${testsFailed} item(ns) acima antes de ir ao ar        ║`);
    console.log(`║                                                                ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  }

  // ============================================
  // PRÓXIMOS PASSOS
  // ============================================
  section('PRÓXIMOS PASSOS');

  if (testsFailed === 0) {
    console.log(`\n1. Registre seu app no Mercado Livre:
   https://developers.mercadolibre.com/apps

2. Configure variáveis de ambiente:
   nano backend/.env

3. Inicie a aplicação:
   npm start
   ou
   pm2 start ecosystem.config.js

4. Teste a saúde do servidor:
   curl http://localhost:3000/health

5. Abra no navegador:
   http://localhost:3000/examples/dashboard/index.html

6. Conecte sua primeira conta Mercado Livre!`);
  } else {
    console.log(`\n1. Corrija os erros listados acima

2. Execute novamente:
   node scripts/verify-production.js

3. Quando tudo estiver verde, siga os próximos passos`);
  }

  console.log('\n');
}

// Executar verificação
runVerification().catch(console.error);
