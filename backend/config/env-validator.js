/**
 * Validador de Variáveis de Ambiente
 * Garante que todas as variáveis críticas estão configuradas corretamente
 *
 * Execução: node backend/config/env-validator.js
 */

const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");
const chalk = require("chalk");

// Carregar arquivo .env (opcional - usar variáveis de ambiente como fallback)
const envPath = path.join(__dirname, "../.env");
let envConfig = {};

if (fs.existsSync(envPath)) {
  envConfig = dotenv.config({ path: envPath }).parsed || {};
}

/**
 * Definição de variáveis obrigatórias e sua validação
 */
const ENV_RULES = {
  // Variáveis CRÍTICAS (precisam estar configuradas)
  critical: [
    {
      name: "JWT_SECRET",
      validate: (val) => val && val.length >= 32,
      message: "JWT_SECRET deve ter no mínimo 32 caracteres",
      type: "security",
    },
    {
      name: "MONGODB_URI",
      validate: (val) => val && val.includes("mongodb://"),
      message: "MONGODB_URI inválida",
      type: "database",
    },
    {
      name: "NODE_ENV",
      validate: (val) => ["development", "production", "staging"].includes(val),
      message: "NODE_ENV deve ser: development, production ou staging",
      type: "environment",
    },
    {
      name: "PORT",
      validate: (val) => /^\d+$/.test(val) && val > 0 && val < 65536,
      message: "PORT deve ser um número entre 1 e 65535",
      type: "server",
    },
  ],

  // Variáveis IMPORTANTES (devem estar configuradas)
  important: [
    {
      name: "FRONTEND_URL",
      validate: (val) =>
        val && (val.startsWith("http://") || val.startsWith("https://")),
      message: "FRONTEND_URL deve ser uma URL válida",
      type: "frontend",
    },
    {
      name: "REDIS_URL",
      validate: (val) => val && val.includes("redis://"),
      message: "REDIS_URL inválida",
      type: "cache",
    },
  ],

  // Variáveis OPCIONAIS (bom ter, mas não críticas)
  optional: [
    {
      name: "ML_CLIENT_ID",
      validate: (val) => !val || val.length > 0,
      message: "ML_CLIENT_ID vazio",
      type: "oauth",
    },
    {
      name: "ML_CLIENT_SECRET",
      validate: (val) => !val || val.length > 0,
      message: "ML_CLIENT_SECRET vazio",
      type: "oauth",
    },
  ],
};

/**
 * Função para validar todas as variáveis
 */
function validateEnvironment() {
  const results = {
    critical: { passed: 0, failed: 0, errors: [] },
    important: { passed: 0, failed: 0, errors: [] },
    optional: { passed: 0, failed: 0, errors: [] },
    warnings: [],
  };

  // Validar variáveis críticas
  console.log("\n" + chalk.bold.cyan("🔍 VALIDANDO VARIÁVEIS DE AMBIENTE"));
  console.log(chalk.cyan("━".repeat(60)));

  // Críticas
  console.log(chalk.bold.red("\n🔴 VARIÁVEIS CRÍTICAS:"));
  ENV_RULES.critical.forEach((rule) => {
    const value = process.env[rule.name] || envConfig[rule.name];
    const isValid = rule.validate(value);

    if (isValid) {
      console.log(chalk.green(`  ✅ ${rule.name}`));
      results.critical.passed++;
    } else {
      console.log(chalk.red(`  ❌ ${rule.name}`));
      console.log(chalk.gray(`     ⚠️  ${rule.message}`));
      results.critical.failed++;
      results.critical.errors.push({
        var: rule.name,
        type: rule.type,
        message: rule.message,
        current: value ? "***[CONFIGURADO]***" : "[NÃO CONFIGURADO]",
      });
    }
  });

  // Importantes
  console.log(chalk.bold.yellow("\n🟠 VARIÁVEIS IMPORTANTES:"));
  ENV_RULES.important.forEach((rule) => {
    const value = process.env[rule.name] || envConfig[rule.name];
    const isValid = rule.validate(value);

    if (isValid) {
      console.log(chalk.green(`  ✅ ${rule.name}`));
      results.important.passed++;
    } else {
      console.log(chalk.yellow(`  ⚠️  ${rule.name}`));
      console.log(chalk.gray(`     💡 ${rule.message}`));
      results.important.failed++;
      results.important.errors.push({
        var: rule.name,
        type: rule.type,
        message: rule.message,
      });
    }
  });

  // Opcionais
  console.log(chalk.bold.blue("\n🟡 VARIÁVEIS OPCIONAIS:"));
  ENV_RULES.optional.forEach((rule) => {
    const value = process.env[rule.name] || envConfig[rule.name];
    const isValid = rule.validate(value);

    if (isValid && value) {
      console.log(chalk.green(`  ✅ ${rule.name}`));
      results.optional.passed++;
    } else if (!value) {
      console.log(
        chalk.gray(`  ⏭️  ${rule.name} (não configurado, mas opcional)`),
      );
    } else {
      console.log(chalk.yellow(`  ⚠️  ${rule.name}`));
      results.optional.failed++;
    }
  });

  // Verificações adicionais de segurança
  console.log(chalk.bold.cyan("\n🔐 VERIFICAÇÕES DE SEGURANÇA:"));

  // JWT_SECRET em desenvolvimento
  if (
    process.env.NODE_ENV === "development" ||
    envConfig.NODE_ENV === "development"
  ) {
    const jwtSecret = process.env.JWT_SECRET || envConfig.JWT_SECRET;
    if (jwtSecret === "dev_jwt_secret_key_change_in_production") {
      console.log(
        chalk.yellow(`  ⚠️  JWT_SECRET usando valor padrão de desenvolvimento`),
      );
      results.warnings.push(
        "JWT_SECRET está usando valor padrão - está correto para desenvolvimento",
      );
    } else {
      console.log(chalk.green(`  ✅ JWT_SECRET personalizado`));
    }
  } else {
    const jwtSecret = process.env.JWT_SECRET || envConfig.JWT_SECRET;
    if (jwtSecret === "dev_jwt_secret_key_change_in_production") {
      console.log(
        chalk.red(`  ❌ JWT_SECRET usando valor PADRÃO EM PRODUÇÃO!`),
      );
      results.critical.errors.push({
        var: "JWT_SECRET",
        type: "security",
        message: "Usando valor padrão em produção! Mudança crítica necessária!",
      });
    }
  }

  // MongoDB password padrão
  const mongoUri = process.env.MONGODB_URI || envConfig.MONGODB_URI;
  if (mongoUri.includes("changeme")) {
    console.log(chalk.yellow(`  ⚠️  MongoDB usando credenciais PADRÃO`));
    results.warnings.push('MongoDB está usando credenciais padrão "changeme"');
  } else {
    console.log(chalk.green(`  ✅ MongoDB credenciais customizadas`));
  }

  // Redis password padrão
  const redisUrl = process.env.REDIS_URL || envConfig.REDIS_URL;
  if (redisUrl.includes("changeme")) {
    console.log(chalk.yellow(`  ⚠️  Redis usando senha PADRÃO`));
    results.warnings.push('Redis está usando senha padrão "changeme"');
  } else {
    console.log(chalk.green(`  ✅ Redis senha customizada`));
  }

  // Resumo final
  console.log(chalk.cyan("\n" + "━".repeat(60)));
  console.log(chalk.bold.cyan("📊 RESUMO DE VALIDAÇÃO"));
  console.log(chalk.cyan("━".repeat(60)));

  const totalCritical = results.critical.passed + results.critical.failed;
  const totalImportant = results.important.passed + results.important.failed;
  const totalOptional = results.optional.passed + results.optional.failed;

  console.log(
    chalk.red(
      `\n  🔴 Críticas:    ${results.critical.passed}/${totalCritical} OK`,
    ),
  );
  console.log(
    chalk.yellow(
      `  🟠 Importantes: ${results.important.passed}/${totalImportant} OK`,
    ),
  );
  console.log(
    chalk.blue(
      `  🟡 Opcionais:   ${results.optional.passed}/${totalOptional} OK`,
    ),
  );

  if (results.warnings.length > 0) {
    console.log(chalk.yellow(`\n  ⚠️  Avisos: ${results.warnings.length}`));
    results.warnings.forEach((warning) => {
      console.log(chalk.gray(`     • ${warning}`));
    });
  }

  // Status final
  console.log("\n" + chalk.cyan("━".repeat(60)));
  if (results.critical.failed === 0) {
    console.log(
      chalk.green.bold("✅ VALIDAÇÃO PASSOU - Variáveis críticas OK!"),
    );
    console.log(chalk.cyan("━".repeat(60)));
    return { success: true, hasWarnings: results.warnings.length > 0 };
  } else {
    console.log(
      chalk.red.bold("❌ VALIDAÇÃO FALHOU - Erros críticos encontrados!"),
    );
    console.log(chalk.red.bold("\n📋 ERROS CRÍTICOS A CORRIGIR:\n"));

    results.critical.errors.forEach((error) => {
      console.log(chalk.red(`  ❌ ${error.var}`));
      console.log(chalk.gray(`     Tipo: ${error.type}`));
      console.log(chalk.gray(`     Problema: ${error.message}`));
      console.log();
    });

    if (results.important.errors.length > 0) {
      console.log(chalk.yellow.bold("\n⚠️  ERROS IMPORTANTES A VERIFICAR:\n"));
      results.important.errors.forEach((error) => {
        console.log(chalk.yellow(`  ⚠️  ${error.var}`));
        console.log(chalk.gray(`     Tipo: ${error.type}`));
        console.log(chalk.gray(`     Problema: ${error.message}`));
        console.log();
      });
    }

    console.log(chalk.cyan("━".repeat(60)));
    return { success: false, errors: results.critical.errors };
  }
}

/**
 * Função para exibir como configurar as variáveis
 */
function printHelpText() {
  console.log(chalk.bold.cyan("\n📖 COMO CONFIGURAR VARIÁVEIS DE AMBIENTE\n"));

  console.log(chalk.bold.white("Para Desenvolvimento Local:"));
  console.log(chalk.gray(`  1. Editar arquivo: backend/.env`));
  console.log(chalk.gray(`  2. Configurar as variáveis necessárias`));
  console.log(chalk.gray(`  3. Salvar e reiniciar o servidor\n`));

  console.log(chalk.bold.white("Para Produção (Docker):"));
  console.log(chalk.gray(`  1. Adicionar ao docker-compose.yml:`));
  console.log(
    chalk.blue(`
     environment:
       - JWT_SECRET=seu_secret_muito_seguro_aqui_32_caracteres
       - MONGODB_URI=mongodb://user:pass@mongo:27017/projeto-sass
       - REDIS_URL=redis://:password@redis:6379`),
  );

  console.log(chalk.gray(`\n  2. Ou criar arquivo .env.production:\n`));
  console.log(
    chalk.blue(`
     NODE_ENV=production
     JWT_SECRET=seu_secret_muito_seguro_aqui_32_caracteres
     MONGODB_URI=mongodb://user:pass@mongo:27017/projeto-sass
     REDIS_URL=redis://:password@redis:6379
     FRONTEND_URL=https://seu-dominio.com.br`),
  );

  console.log(
    chalk.gray(
      `\n  3. Executar o container com a variável apontando ao arquivo:\n`,
    ),
  );
  console.log(
    chalk.cyan(`     docker compose --env-file .env.production up -d\n`),
  );
}

/**
 * Executar validação
 */
function main() {
  const result = validateEnvironment();

  if (!result.success) {
    printHelpText();
    process.exit(1);
  }
}

// Exportar funções para uso em outros módulos
module.exports = {
  validateEnvironment,
  ENV_RULES,
  printHelpText,
};

// Executar se chamado diretamente
if (require.main === module) {
  main();
}
