#!/usr/bin/env node

/**
 * SETUP PARA PRODUÇÃO - Conectar Conta Real do Mercado Livre
 * ============================================================
 * 
 * Este script ajuda você a configurar a SDK para produção
 * com uma conta real do Mercado Livre
 */

const readline = require('readline');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
  console.log(`
${chalk.bold.cyan(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║              🚀 SETUP PARA PRODUÇÃO - MERCADO LIVRE SDK 🚀               ║
║                                                                            ║
║                 Conectar Conta Real do Mercado Livre                       ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`)}`);

  console.log(`
${chalk.yellow('⚠ IMPORTANTE:')
}
  Para testar em produção, você precisa de um OAuth token real
  do Mercado Livre. Este guia ajuda você a obter e configurar.

${chalk.cyan('Dois caminhos disponíveis:')
}
  1. ${chalk.green('RECOMENDADO')} - Usar OAuth para obter token seguro
  2. Usar token manual (menos seguro)

`);

  const path_choice = await question(chalk.bold('Qual caminho deseja seguir? (1 ou 2): '));

  if (path_choice === '1') {
    await setupOAuth();
  } else if (path_choice === '2') {
    await setupManualToken();
  } else {
    console.log(chalk.red('Opção inválida!'));
    rl.close();
    process.exit(1);
  }
}

async function setupOAuth() {
  console.log(`
${chalk.bold.cyan('═══════════════════════════════════════════════════════════════')}
${chalk.bold.cyan('PASSO 1: Preparar Aplicação OAuth')}
${chalk.bold.cyan('═══════════════════════════════════════════════════════════════')}

Para usar OAuth, você precisa:

1. Ir para: https://auth.mercadolivre.com.br/authorization
2. Parâmetros necessários:

${chalk.gray(`
   response_type=code
   client_id=YOUR_CLIENT_ID
   redirect_uri=http://localhost:3000/oauth/callback
   state=RANDOM_STATE
`)}

3. Exemplo de URL completa:
${chalk.blue(`
   https://auth.mercadolibre.com.br/authorization?
   response_type=code&
   client_id=YOUR_CLIENT_ID&
   redirect_uri=http://localhost:3000/oauth/callback&
   state=state123
`)}
`);

  const client_id = await question(chalk.yellow('\nDigite seu CLIENT_ID: '));
  const client_secret = await question(chalk.yellow('Digite seu CLIENT_SECRET: '));
  const redirect_uri = await question(chalk.yellow('Seu REDIRECT_URI (ex: http://localhost:3000/oauth/callback): '));

  console.log(`
${chalk.bold.cyan('═══════════════════════════════════════════════════════════════')}
${chalk.bold.cyan('PASSO 2: Obter Authorization Code')}
${chalk.bold.cyan('═══════════════════════════════════════════════════════════════')}

Agora faça login no Mercado Livre usando esta URL:
${chalk.yellow(`
https://auth.mercadolibre.com.br/authorization?response_type=code&client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=state123
`)}

Você será redirecionado com um código. Copie-o:
`);

  const auth_code = await question(chalk.yellow('Cole aqui o authorization code: '));

  console.log(`
${chalk.bold.cyan('═══════════════════════════════════════════════════════════════')}
${chalk.bold.cyan('PASSO 3: Trocar Código por Tokens')}
${chalk.bold.cyan('═══════════════════════════════════════════════════════════════')}

${chalk.gray('Aguarde enquanto obtemos os tokens...')}
`);

  try {
    const axios = require('axios');
    
    const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: client_id,
      client_secret: client_secret,
      code: auth_code,
      redirect_uri: redirect_uri
    });

    const tokenData = response.data;

    console.log(`
${chalk.green('✅ Tokens obtidos com sucesso!')}

${chalk.yellow('DADOS IMPORTANTES (GUARDE COM SEGURANÇA!):')}
${chalk.gray(`
Access Token: ${tokenData.access_token.substring(0, 20)}...
Refresh Token: ${tokenData.refresh_token.substring(0, 20)}...
Expira em: ${tokenData.expires_in} segundos (${(tokenData.expires_in / 3600).toFixed(2)} horas)
`)}
`);

    const save_to_env = await question(chalk.yellow('Deseja salvar no .env? (s/n): '));

    if (save_to_env.toLowerCase() === 's') {
      saveToEnv({
        ML_ACCESS_TOKEN: tokenData.access_token,
        ML_REFRESH_TOKEN: tokenData.refresh_token,
        ML_EXPIRES_IN: tokenData.expires_in
      });

      console.log(`${chalk.green('✅ Salvo no .env')}`);
    }

    await testTokens(tokenData.access_token);

  } catch (error) {
    console.error(chalk.red('❌ Erro ao obter tokens:'), error.message);
    if (error.response?.data) {
      console.error(chalk.red('Detalhes:'), error.response.data);
    }
    rl.close();
    process.exit(1);
  }
}

async function setupManualToken() {
  console.log(`
${chalk.bold.cyan('═══════════════════════════════════════════════════════════════')}
${chalk.bold.cyan('PASSO 1: Obter Token Manual')}
${chalk.bold.cyan('═══════════════════════════════════════════════════════════════')}

Para obter um token manualmente:

1. Acesse: https://www.mercadolibre.com.br/
2. Vá em Suas atividades → Aplicações
3. Selecione sua aplicação
4. Copie o access token

${chalk.yellow('⚠ IMPORTANTE:')}
   Tokens manuais podem expirar e terão que ser renovados manualmente.
   Considere usar OAuth quando possível.
`);

  const access_token = await question(chalk.yellow('\nDigite seu Access Token: '));
  const refresh_token = await question(chalk.yellow('Refresh Token (deixe em branco se não tiver): '));

  console.log(`
${chalk.green('✅ Token configurado!')}`);

  const save_to_env = await question(chalk.yellow('Deseja salvar no .env? (s/n): '));

  if (save_to_env.toLowerCase() === 's') {
    saveToEnv({
      ML_ACCESS_TOKEN: access_token,
      ML_REFRESH_TOKEN: refresh_token || ''
    });

    console.log(`${chalk.green('✅ Salvo no .env')}`);
  }

  await testTokens(access_token);
}

function saveToEnv(config) {
  let envContent = '';
  
  if (fs.existsSync('.env')) {
    envContent = fs.readFileSync('.env', 'utf8');
  }

  // Remove antigas entradas
  envContent = envContent
    .split('\n')
    .filter(line => !line.startsWith('ML_ACCESS_TOKEN') && 
                     !line.startsWith('ML_REFRESH_TOKEN') &&
                     !line.startsWith('ML_EXPIRES_IN'))
    .join('\n');

  // Adiciona novas
  envContent += '\n# Mercado Livre OAuth Tokens\n';
  envContent += `ML_ACCESS_TOKEN=${config.ML_ACCESS_TOKEN}\n`;
  if (config.ML_REFRESH_TOKEN) {
    envContent += `ML_REFRESH_TOKEN=${config.ML_REFRESH_TOKEN}\n`;
  }
  if (config.ML_EXPIRES_IN) {
    envContent += `ML_EXPIRES_IN=${config.ML_EXPIRES_IN}\n`;
  }

  fs.writeFileSync('.env', envContent);
}

async function testTokens(accessToken) {
  console.log(`
${chalk.bold.cyan('═══════════════════════════════════════════════════════════════')}
${chalk.bold.cyan('PASSO 4: Testar Token')}
${chalk.bold.cyan('═══════════════════════════════════════════════════════════════')}

${chalk.gray('Testando token...')}`);

  try {
    const axios = require('axios');
    
    const response = await axios.get('https://api.mercadolivre.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const user = response.data;

    console.log(`
${chalk.green('✅ Token válido!')}

${chalk.cyan('Informações da Conta:')}
${chalk.gray(`
  ID: ${user.id}
  Nickname: ${user.nickname}
  Email: ${user.email}
  País: ${user.country_id}
  Status: ${user.status}
`)}
`);

    const continue_setup = await question(chalk.yellow('Deseja continuar com a configuração de produção? (s/n): '));

    if (continue_setup.toLowerCase() === 's') {
      await setupProduction(accessToken, user.id);
    }

  } catch (error) {
    console.error(chalk.red('❌ Token inválido ou expirado!'));
    console.error(chalk.red('Erro:'), error.message);
  }

  rl.close();
}

async function setupProduction(accessToken, userId) {
  console.log(`
${chalk.bold.cyan('═══════════════════════════════════════════════════════════════')}
${chalk.bold.cyan('CONFIGURAÇÃO DE PRODUÇÃO')}
${chalk.bold.cyan('═══════════════════════════════════════════════════════════════')}

Para usar em produção, você precisa:

1. ✅ Token obtido e validado
2. ⏳ Salvar no banco de dados (MongoDB)
3. ⏳ Configurar SDK Manager
4. ⏳ Testar endpoints

${chalk.yellow('Próximas ações recomendadas:')}`);

  console.log(`
1. Salvar conta no MongoDB:
   ${chalk.blue('node setup-production.js --save-to-db')}

2. Testar endpoints em produção:
   ${chalk.blue('node test-production.js')}

3. Iniciar servidor:
   ${chalk.blue('npm run dev')}

4. Acessar seu dashboard:
   ${chalk.blue('http://localhost:3000')}
`);

  rl.close();
}

// Executar
main().catch(error => {
  console.error(chalk.red('Erro:'), error.message);
  rl.close();
  process.exit(1);
});
