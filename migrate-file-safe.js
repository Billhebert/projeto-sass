#!/usr/bin/env node

/**
 * Safe Pilot File Migration to Centralized Helpers
 * ================================================
 * 
 * This script manually migrates a single route file to use the centralized
 * response-helpers module. It's designed for Phase 2B pilot migration.
 * 
 * Usage:
 * node migrate-file-safe.js backend/routes/messages.js
 * 
 * Process:
 * 1. Read the file
 * 2. Create backup
 * 3. Remove duplicate helpers (handleError, sendSuccess, getAndValidateAccount)
 * 4. Add import for centralized helpers
 * 5. Validate syntax
 * 6. Show diff and ask for confirmation
 * 7. Commit if approved
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

// ============================================================================
// CONFIGURATION
// ============================================================================

const HELPERS_TO_REMOVE = [
  { name: 'handleError', start: 'const handleError', end: '};' },
  { name: 'sendSuccess', start: 'const sendSuccess', end: '};' },
  { name: 'getAndValidateAccount', start: 'const getAndValidateAccount', end: '};' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find and remove helper functions from content
 */
function removeHelpers(content) {
  let removed = [];
  let lines = content.split('\n');
  
  HELPERS_TO_REMOVE.forEach(helper => {
    let startLine = -1;
    let endLine = -1;
    
    // Find start of helper
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(helper.start)) {
        startLine = i;
        break;
      }
    }
    
    // If found, find end of helper
    if (startLine >= 0) {
      for (let i = startLine; i < lines.length; i++) {
        if (lines[i].includes(helper.end) && i > startLine) {
          endLine = i;
          break;
        }
      }
    }
    
    // Remove helper block
    if (startLine >= 0 && endLine >= 0) {
      // Also remove the comment block above (usually starts with /** or //)
      let commentStart = startLine;
      if (startLine > 0 && (lines[startLine - 1].includes('/**') || lines[startLine - 1].includes('/*'))) {
        commentStart = startLine - 1;
        // Find the start of the comment block
        for (let i = startLine - 1; i >= 0; i--) {
          if (lines[i].includes('/**') || (i > 0 && lines[i-1].includes('/*'))) {
            commentStart = i;
            break;
          }
        }
      }
      
      // Remove lines from commentStart to endLine (inclusive)
      const removedLines = lines.splice(commentStart, endLine - commentStart + 1);
      removed.push(helper.name);
      endLine = -1; // Reset to avoid double-removal
    }
  });
  
  return { content: lines.join('\n'), removed };
}

/**
 * Add import statement if not present
 */
function addImport(content) {
  if (content.includes("require('../middleware/response-helpers')")) {
    return content;
  }
  
  const lines = content.split('\n');
  let lastRequireIdx = -1;
  
  // Find last require statement
  for (let i = 0; i < lines.length; i++) {
    if ((lines[i].includes("require('") || lines[i].includes('require("')) && !lines[i].includes('//')) {
      lastRequireIdx = i;
    }
    // Stop at first non-require/non-comment
    if (lines[i].match(/^const\s+\w+\s*=/)) {
      break;
    }
  }
  
  // Insert import after last require
  const importLine = "const { handleError, sendSuccess, getAndValidateAccount, buildHeaders, getAndValidateUser } = require('../middleware/response-helpers');";
  
  if (lastRequireIdx >= 0) {
    lines.splice(lastRequireIdx + 1, 0, importLine);
  }
  
  return lines.join('\n');
}

/**
 * Clean up extra blank lines
 */
function cleanupBlankLines(content) {
  return content.replace(/\n\n\n+/g, '\n\n');
}

/**
 * Validate file syntax
 */
function validateSyntax(filepath) {
  try {
    execSync(`node -c "${filepath}"`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get human-readable diff
 */
function getDiff(originalPath, newContent) {
  try {
    const original = fs.readFileSync(originalPath, 'utf8');
    const origLines = original.split('\n');
    const newLines = newContent.split('\n');
    
    let diff = [];
    const maxLines = Math.max(origLines.length, newLines.length);
    
    for (let i = 0; i < maxLines && i < 20; i++) {
      const origLine = origLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (origLine !== newLine) {
        if (origLine) diff.push(`- ${origLine}`);
        if (newLine) diff.push(`+ ${newLine}`);
      } else {
        diff.push(`  ${origLine}`);
      }
    }
    
    return diff.join('\n');
  } catch (e) {
    return 'Unable to generate diff';
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  const filepath = process.argv[2];
  
  if (!filepath) {
    console.error('Usage: node migrate-file-safe.js <filepath>');
    process.exit(1);
  }
  
  const filename = path.basename(filepath);
  console.log(`\n🔄 Migrating ${filename} to centralized helpers...\n`);
  
  // Verify file exists
  if (!fs.existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    process.exit(1);
  }
  
  // Read original
  const original = fs.readFileSync(filepath, 'utf8');
  const originalSize = original.length;
  const originalLines = original.split('\n').length;
  
  // Remove helpers
  const { content: noHelpers, removed } = removeHelpers(original);
  
  if (removed.length === 0) {
    console.log(`⊘ ${filename} - No helpers found to remove\n`);
    rl.close();
    return;
  }
  
  // Add import
  let migrated = addImport(noHelpers);
  
  // Cleanup blanks
  migrated = cleanupBlankLines(migrated);
  
  const newSize = migrated.length;
  const newLines = migrated.split('\n').length;
  const reduction = originalSize - newSize;
  const reductionPercent = ((reduction / originalSize) * 100).toFixed(1);
  
  // Validate syntax
  const tempFile = filepath + '.temp-migration';
  fs.writeFileSync(tempFile, migrated, 'utf8');
  const syntaxValid = validateSyntax(tempFile);
  fs.unlinkSync(tempFile);
  
  // Show summary
  console.log('📊 Migration Summary:');
  console.log(`   Helpers removed: ${removed.join(', ')}`);
  console.log(`   Size: ${originalSize} → ${newSize} bytes (-${reduction} bytes, -${reductionPercent}%)`);
  console.log(`   Lines: ${originalLines} → ${newLines} lines`);
  console.log(`   Syntax valid: ${syntaxValid ? '✅' : '❌'}`);
  
  if (!syntaxValid) {
    console.error('\n❌ Syntax error detected! Migration aborted.');
    rl.close();
    process.exit(1);
  }
  
  console.log('\n📝 Diff preview (first 20 lines):');
  console.log('---');
  console.log(getDiff(filepath, migrated).substring(0, 500));
  console.log('---\n');
  
  // Ask for confirmation
  const confirmed = await question('Proceed with migration? (yes/no): ');
  
  if (confirmed.toLowerCase() !== 'yes') {
    console.log('❌ Migration cancelled.');
    rl.close();
    process.exit(0);
  }
  
  // Create backup
  const backupPath = filepath + '.pre-phase2-backup';
  fs.copyFileSync(filepath, backupPath);
  console.log(`✅ Backup created: ${path.basename(backupPath)}`);
  
  // Write migrated file
  fs.writeFileSync(filepath, migrated, 'utf8');
  console.log(`✅ File migrated: ${filename}`);
  
  // Stage and commit
  try {
    execSync(`git add "${filepath}" "${backupPath}"`, { stdio: 'pipe' });
    const message = `refactor: migrate ${filename} to centralized response-helpers

- Removed ${removed.length} duplicate helpers (${removed.join(', ')})
- Added import from middleware/response-helpers.js
- Preserved domain-specific helpers
- No changes to API contracts or response formats
- Validated syntax with node -c

Code reduction: -${reduction} bytes (-${reductionPercent}%)
Lines reduced: ${originalLines} → ${newLines} (${originalLines - newLines} lines)`;
    
    execSync(`git commit -m "${message}"`, { stdio: 'pipe' });
    console.log(`✅ Committed to git`);
  } catch (error) {
    console.warn(`⚠️  Git commit failed (you can commit manually)`);
  }
  
  console.log(`\n✨ Migration complete for ${filename}!\n`);
  rl.close();
}

main().catch(error => {
  console.error('Error:', error.message);
  rl.close();
  process.exit(1);
});
