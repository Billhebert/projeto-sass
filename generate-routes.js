/**
 * Gerador automático de routes baseado em backend/docs/ML_API_COMPLETE_COVERAGE_FINAL.json
 * Cria routes para todos os 50+ endpoints da API Mercado Libre
 */

const fs = require('fs');
const path = require('path');

// Ler o arquivo de cobertura completa
const coverageFile = fs.readFileSync('./backend/docs/ML_API_COMPLETE_COVERAGE_FINAL.json', 'utf-8');
const apiSpec = JSON.parse(coverageFile);

/**
 * Template para gerar route file para cada categoria
 */
function generateRouteTemplate(category, endpoints) {
  const categoryName = category.replace(/_/g, ' ').toUpperCase();
  
  const imports = `const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const API_BASE_URL = process.env.ML_API_URL || 'https://api.mercadolibre.com';`;

  const endpointHandlers = endpoints.map(endpoint => {
    const method = endpoint.method.toLowerCase();
    const pathParam = endpoint.path.includes('{') 
      ? endpoint.path.replace(/{([^}]+)}/g, ':$1')
      : endpoint.path;
    
    const authMiddleware = endpoint.auth_required ? ', verifyToken' : '';
    const paramsHandling = endpoint.path_parameters ? 
      `const { ${endpoint.path_parameters.map(p => p.name).join(', ')} } = req.params;` : '';
    
    return `/**
 * ${endpoint.method} ${endpoint.path}
 * ${endpoint.description}
 */
router.${method}('${pathParam}'${authMiddleware}, async (req, res) => {
  try {
    ${paramsHandling}
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    ${endpoint.auth_required ? "if (req.token) { config.headers['Authorization'] = \`Bearer \${req.token}\`; }" : ''}
    
    const response = await axios({
      method: '${endpoint.method}',
      url: \`\${API_BASE_URL}${endpoint.path.replace(/{([^}]+)}/g, '\${$1}')}\`,
      ...config,
      ${method === 'get' ? 'params: req.query,' : 'data: req.body,'}
    });
    
    logger.info(\`${category.toUpperCase()} - ${endpoint.id}: Success\`);
    res.json({ success: true, data: response.data });
  } catch (error) {
    logger.error(\`${category.toUpperCase()} - ${endpoint.id}: \${error.message}\`);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});
`;
  }).join('\n\n');

  const footer = `\nmodule.exports = router;`;

  return imports + '\n\n' + endpointHandlers + footer;
}

/**
 * Gerar routes para cada categoria
 */
function generateAllRoutes() {
  const categories = apiSpec.api_categories;
  const routesGenerated = [];
  
  Object.entries(categories).forEach(([categoryKey, category]) => {
    if (!category.endpoints || category.endpoints.length === 0) {
      console.log(`⏭️  Pulando ${categoryKey} (sem endpoints)`);
      return;
    }
    
    const categoryFile = categoryKey.replace(/_/g, '-');
    const routePath = path.join(__dirname, `backend/routes/${categoryFile}.js`);
    
    // Verificar se arquivo já existe
    if (fs.existsSync(routePath)) {
      console.log(`✅ ${categoryFile}.js já existe (pulando)`);
      routesGenerated.push(categoryFile);
      return;
    }
    
    const template = generateRouteTemplate(categoryKey, category.endpoints);
    fs.writeFileSync(routePath, template);
    console.log(`✅ Criado: ${categoryFile}.js (${category.endpoints.length} endpoints)`);
    routesGenerated.push(categoryFile);
  });
  
  return routesGenerated;
}

/**
 * Atualizar server.js com imports dos novos routes
 */
function updateServerJS(routesGenerated) {
  const serverPath = path.join(__dirname, `backend/server.js`);
  let serverContent = fs.readFileSync(serverPath, 'utf-8');
  
  // Verificar se já tem o padrão de importação
  if (!serverContent.includes('// === GERADO AUTOMATICAMENTE - ROTAS DA ML API')) {
    // Encontrar a seção de rotas existentes
    const routesSection = `
// === GERADO AUTOMATICAMENTE - ROTAS DA ML API ===
${routesGenerated.map(route => {
  const category = route.replace(/-/g, '_');
  return `// app.use('/api/${route}', require('./routes/${route}'));`;
}).join('\n')}
// ============================================\n`;
    
    // Adicionar antes de app.listen
    serverContent = serverContent.replace(
      /app\.listen\(/,
      routesSection + '\n\napp.listen('
    );
    
    fs.writeFileSync(serverPath, serverContent);
    console.log(`\n✅ Atualizado: server.js com imports dos routes`);
  } else {
    console.log(`\n⚠️  server.js já tem referências aos routes (verifique manualmente)`);
  }
}

// Executar geração
console.log('\n🔧 Gerando routes automaticamente...\n');
const generated = generateAllRoutes();
console.log(`\n📊 Total de routes gerados: ${generated.length}`);

// updateServerJS(generated);

console.log('\n✨ Geração concluída!');
console.log('\n📝 Próximos passos:');
console.log('1. Revisar routes gerados em backend/routes/');
console.log('2. Atualizar imports em server.js');
console.log('3. Adicionar validação de parâmetros');
console.log('4. Testar cada endpoint');
console.log('5. Adicionar autenticação OAuth2');
