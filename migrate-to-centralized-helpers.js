#!/usr/bin/env node

/**
 * Migrate Route Files to Use Centralized Response Helpers
 * ========================================================
 * 
 * This script updates all 49 refactored route files to use the centralized
 * response-helpers module instead of duplicating helpers in each file.
 * 
 * Process:
 * 1. Read each route file
 * 2. Remove local helper definitions (handleError, sendSuccess, buildHeaders, getAndValidateAccount)
 * 3. Add import statement for centralized helpers
 * 4. Validate syntax with Node.js
 * 5. Create backup of original
 * 6. Write refactored file
 * 
 * Usage:
 * node migrate-to-centralized-helpers.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROUTES_DIR = path.join(__dirname, 'backend', 'routes');
const SKIP_FILES = ['items.old.js'];
const HELPERS_TO_REMOVE = [
  'handleError',
  'sendSuccess',
  'buildHeaders',
  'getAndValidateAccount',
  'getAndValidateUser',
  'findMessage',
  'buildURL',
  'formatResponse',
  'parseQuery',
  'validateInput',
];

let stats = {
  total: 0,
  migrated: 0,
  failed: 0,
  skipped: 0,
  helpers_removed: {},
};

/**
 * Check if a file should be migrated
 */
function shouldMigrate(filename) {
  if (!filename.endsWith('.js')) return false;
  if (SKIP_FILES.includes(filename)) return false;
  if (filename.endsWith('.backup')) return false;
  return true;
}

/**
 * Find where helpers section ends (before first router.get/post/etc)
 */
function findHelpersSectionEnd(content) {
  const helperSectionRegex = /\/\/ ={70,}[\s\S]*?HELPERS[\s\S]*?={70,}/;
  const match = content.match(helperSectionRegex);
  
  if (!match) {
    // Try finding the first router.get/post/etc
    const routerRegex = /^router\.(get|post|put|delete|patch)\(/m;
    const idx = content.search(routerRegex);
    return idx > 0 ? idx : -1;
  }
  
  return match.index + match[0].length;
}

/**
 * Remove helper function definitions
 */
function removeHelperFunctions(content) {
  let removed = {};
  
  HELPERS_TO_REMOVE.forEach(helperName => {
    // Match: const helperName = (...) => { ... } or const helperName = function(...) { ... }
    const singleLineRegex = new RegExp(
      `const\\s+${helperName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*[^;]+;`,
      'gs'
    );
    
    const multiLineRegex = new RegExp(
      `const\\s+${helperName}\\s*=\\s*(?:\\([^)]*\\)\\s*=>|function\\s*\\([^)]*\\)\\s*)\\s*\\{[^}]*(?:\\{[^}]*\\}[^}]*)*\\};`,
      'gs'
    );
    
    // Try single line first
    if (singleLineRegex.test(content)) {
      content = content.replace(singleLineRegex, '');
      removed[helperName] = 'removed (single-line)';
    } else if (multiLineRegex.test(content)) {
      // For multi-line, we need more sophisticated parsing
      const complexRegex = new RegExp(
        `const\\s+${helperName}\\s*=\\s*(?:\\([^)]*\\)\\s*=>|function)\\s*\\{(?:[^{}]|\\{[^{}]*\\})*?\\}\\s*;`,
        'gs'
      );
      
      if (complexRegex.test(content)) {
        content = content.replace(complexRegex, '');
        removed[helperName] = 'removed (multi-line)';
      }
    }
  });
  
  return { content, removed };
}

/**
 * Add response-helpers import if not present
 */
function addHelpersImport(content) {
  // Check if already imported
  if (content.includes("require('../middleware/response-helpers')")) {
    return content;
  }
  
  // Find the last require statement (excluding middleware requires)
  const lines = content.split('\n');
  let lastRequireIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("require('") || lines[i].includes('require("')) {
      lastRequireIndex = i;
    }
    // Stop at the first router or other non-import code
    if (lines[i].includes('router.') || lines[i].includes('// ===')) {
      break;
    }
  }
  
  if (lastRequireIndex === -1) {
    // No requires found, add after other variable declarations
    lastRequireIndex = 0;
  }
  
  const importStatement = "const { handleError, sendSuccess, getAndValidateAccount, buildHeaders, getAndValidateUser } = require('../middleware/response-helpers');";
  
  lines.splice(lastRequireIndex + 1, 0, importStatement);
  return lines.join('\n');
}

/**
 * Clean up extra blank lines created by removing helpers
 */
function cleanupExtraBlankLines(content) {
  // Replace 4+ consecutive newlines with 2
  return content.replace(/\n\n\n\n+/g, '\n\n');
}

/**
 * Validate file syntax using Node.js
 */
function validateSyntax(filepath) {
  try {
    execSync(`node -c "${filepath}"`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error(`  ❌ Syntax error in ${path.basename(filepath)}`);
    console.error(`     ${error.message.split('\n')[0]}`);
    return false;
  }
}

/**
 * Process a single route file
 */
function migrateFile(filepath) {
  const filename = path.basename(filepath);
  
  try {
    // Read original file
    let content = fs.readFileSync(filepath, 'utf8');
    const originalSize = content.length;
    
    // Remove helper functions
    const { content: contentWithoutHelpers, removed } = removeHelperFunctions(content);
    
    if (Object.keys(removed).length === 0) {
      console.log(`⊘ ${filename} - No helpers to remove (skipped)`);
      stats.skipped++;
      return;
    }
    
    // Add centralized helpers import
    let migratedContent = addHelpersImport(contentWithoutHelpers);
    
    // Clean up extra blank lines
    migratedContent = cleanupExtraBlankLines(migratedContent);
    
    // Write to temp file and validate
    const tempFile = filepath + '.temp';
    fs.writeFileSync(tempFile, migratedContent, 'utf8');
    
    if (!validateSyntax(tempFile)) {
      fs.unlinkSync(tempFile);
      stats.failed++;
      return;
    }
    
    // Create backup of original
    const backupFile = filepath + '.pre-centralize-backup';
    if (!fs.existsSync(backupFile)) {
      fs.copyFileSync(filepath, backupFile);
    }
    
    // Replace original with migrated version
    fs.renameSync(tempFile, filepath);
    
    const newSize = migratedContent.length;
    const reduction = originalSize - newSize;
    const reductionPercent = ((reduction / originalSize) * 100).toFixed(1);
    
    console.log(`✅ ${filename}`);
    console.log(`   Removed: ${Object.keys(removed).join(', ')}`);
    console.log(`   Size: ${originalSize} → ${newSize} bytes (-${reduction} bytes, -${reductionPercent}%)`);
    
    stats.migrated++;
    stats.helpers_removed[filename] = removed;
    
  } catch (error) {
    console.error(`❌ Failed to migrate ${filename}: ${error.message}`);
    stats.failed++;
  }
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Migrating route files to centralized response helpers...\n');
  
  // Get all JS files in routes directory
  const files = fs.readdirSync(ROUTES_DIR)
    .filter(shouldMigrate)
    .map(f => path.join(ROUTES_DIR, f))
    .sort();
  
  stats.total = files.length;
  
  console.log(`Found ${files.length} route files to process\n`);
  
  // Process each file
  files.forEach(migrateFile);
  
  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total files: ${stats.total}`);
  console.log(`Migrated: ${stats.migrated} ✅`);
  console.log(`Skipped: ${stats.skipped} ⊘`);
  console.log(`Failed: ${stats.failed} ❌`);
  console.log(`\nCode reduction: Removed ${Object.keys(stats.helpers_removed).length} files worth of duplicate helpers`);
  console.log('\n✨ Migration complete!');
}

main();
