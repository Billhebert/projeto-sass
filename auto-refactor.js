const fs = require('fs');
const path = require('path');

const routesDir = 'backend/routes';
const HELPERS = `
// ============================================================================
// CORE HELPERS
// ============================================================================

/**
 * Handle and log errors with consistent response format
 */
const handleError = (res, statusCode = 500, message, error = null, context = {}) => {
  logger.error({
    action: context.action || 'UNKNOWN_ERROR',
    error: error?.message || message,
    statusCode,
    ...context,
  });

  const response = { success: false, message };
  if (error?.message) response.error = error.message;
  res.status(statusCode).json(response);
};

/**
 * Send success response with consistent format
 */
const sendSuccess = (res, data, message = null, statusCode = 200) => {
  const response = { success: true, data };
  if (message) response.message = message;
  res.status(statusCode).json(response);
};
`;

function refactorFile(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    const basename = path.basename(filepath);
    
    // Skip if already has helpers
    if (content.includes('const handleError') || content.includes('const sendSuccess')) {
      console.log(`⊘ ${basename} - já refatorado`);
      return false;
    }
    
    const linesBefore = content.split('\n').length;
    
    // Find insertion point (after router creation)
    const routerMatch = content.match(/const router = express\.Router\(\);/);
    if (!routerMatch) {
      console.log(`⊘ ${basename} - router não encontrado`);
      return false;
    }
    
    const insertIndex = content.indexOf(routerMatch[0]) + routerMatch[0].length;
    
    // Inject helpers
    let newContent = content.slice(0, insertIndex) + '\n' + HELPERS + '\n' + content.slice(insertIndex);
    
    // Basic cleanup: remove duplicate module.exports if exists
    newContent = newContent.replace(/module\.exports\s*=\s*router;\s*$/m, '');
    if (!newContent.trim().endsWith('module.exports = router;')) {
      newContent = newContent.replace(/\n*$/, '\n\nmodule.exports = router;\n');
    }
    
    const linesAfter = newContent.split('\n').length;
    const reduction = linesBefore - linesAfter;
    
    // Write backup
    fs.writeFileSync(filepath + '.backup', content);
    
    // Write new file
    fs.writeFileSync(filepath, newContent);
    
    console.log(`✓ ${basename} refatorado (${linesBefore} → ${linesAfter} linhas, ${reduction > 0 ? '-' : '+'}${Math.abs(reduction)} linhas)`);
    return true;
  } catch (error) {
    console.error(`✗ ${path.basename(filepath)}: ${error.message}`);
    return false;
  }
}

// Main
const files = fs.readdirSync(routesDir)
  .filter(f => f.endsWith('.js'))
  .sort();

const refactored = new Set(fs.readdirSync(routesDir)
  .filter(f => f.endsWith('.backup'))
  .map(f => f.replace('.backup', '')));

const toRefactor = files.filter(f => !refactored.has(f) && f !== 'items.old.js');

console.log(`\n📊 Status:`);
console.log(`   Refatorados: ${refactored.size}`);
console.log(`   Para refatorar: ${toRefactor.length}`);
console.log(`\n🔄 Iniciando refatoração automática...\n`);

let count = 0;
for (const file of toRefactor) {
  if (refactorFile(path.join(routesDir, file))) {
    count++;
  }
}

console.log(`\n✅ Total refatorado: ${count} arquivos`);
