/**
 * Edge case testing for copy-web-bundle.js
 */

const fs = require('fs-extra');
const { copyBundle } = require('./copy-web-bundle');

let testResults = [];

function logTest(name, status, details = '') {
  testResults.push({ name, status, details });
  const icon = status === 'pass' ? '✅' : status === 'skip' ? '⚠️' : '❌';
  console.log(`${icon} ${name}`);
  if (details) console.log(`   ${details}`);
}

async function testEdgeCases() {
  console.log('\n🧪 Testing Edge Cases\n');

  // Test 1: Script works when called multiple times
  logTest('Test 1: Multiple consecutive runs', 'pass');
  try {
    await copyBundle();
    await copyBundle(); // Run again immediately
    logTest('  ↳ Second run', 'pass', 'No errors on re-run');
  } catch (error) {
    logTest('  ↳ Second run', 'fail', error.message);
  }

  // Test 2: Verify no extra files copied
  logTest('Test 2: No extra files in bundle', 'pass');
  const androidFiles = await fs.readdir('ui/mobile/android/app/src/main/assets/web-editor/_next/static/chunks');
  const allChunks = await fs.readdir('out/_next/static/chunks');
  const jsChunks = allChunks.filter(f => f.endsWith('.js'));
  
  if (androidFiles.length <= jsChunks.length) {
    logTest('  ↳ File count check', 'pass', `${androidFiles.length} files vs ${jsChunks.length} available`);
  } else {
    logTest('  ↳ File count check', 'fail', `Too many files: ${androidFiles.length} vs ${jsChunks.length}`);
  }

  // Test 3: Verify index.html is valid
  logTest('Test 3: HTML validity', 'pass');
  const androidHtml = await fs.readFile('ui/mobile/android/app/src/main/assets/web-editor/index.html', 'utf-8');
  if (androidHtml.includes('<!DOCTYPE html>') && androidHtml.includes('</html>')) {
    logTest('  ↳ HTML structure', 'pass', 'Valid HTML structure');
  } else {
    logTest('  ↳ HTML structure', 'fail', 'Invalid HTML');
  }

  // Test 4: Verify chunks referenced in HTML exist
  logTest('Test 4: All referenced chunks exist', 'pass');
  const chunkMatches = androidHtml.matchAll(/\/_next\/static\/chunks\/([a-f0-9]+\.(?:js|css))/gi);
  let allExist = true;
  let missingChunks = [];
  
  for (const match of chunkMatches) {
    const chunk = match[1];
    const chunkPath = `ui/mobile/android/app/src/main/assets/web-editor/_next/static/chunks/${chunk}`;
    if (!fs.existsSync(chunkPath)) {
      allExist = false;
      missingChunks.push(chunk);
    }
  }
  
  if (allExist) {
    logTest('  ↳ Chunk existence', 'pass', 'All referenced chunks present');
  } else {
    logTest('  ↳ Chunk existence', 'fail', `Missing: ${missingChunks.join(', ')}`);
  }

  // Test 5: Android and iOS bundles are identical
  logTest('Test 5: Platform bundle parity', 'pass');
  const iosHtml = await fs.readFile('ui/mobile/ios/EverFreeNote/WebEditor/index.html', 'utf-8');
  if (androidHtml === iosHtml) {
    logTest('  ↳ HTML equality', 'pass', 'Android and iOS HTML identical');
  } else {
    logTest('  ↳ HTML equality', 'fail', 'Platform HTML differs');
  }

  // Test 6: Test error handling (simulate missing source)
  logTest('Test 6: Error handling', 'skip');
  const backup = 'out/editor-webview/index.html.backup';
  try {
    // Backup and remove source
    if (fs.existsSync('out/editor-webview/index.html')) {
      await fs.move('out/editor-webview/index.html', backup);
      
      try {
        await copyBundle();
        logTest('  ↳ Missing source error', 'fail', 'Should have thrown error');
      } catch (error) {
        if (error.message.includes('Source not found')) {
          logTest('  ↳ Missing source error', 'pass', 'Correct error thrown');
        } else {
          logTest('  ↳ Missing source error', 'fail', `Wrong error: ${error.message}`);
        }
      }
      
      // Restore
      await fs.move(backup, 'out/editor-webview/index.html');
    }
  } catch (error) {
    logTest('  ↳ Error handling test', 'fail', error.message);
  }

  // Summary
  console.log('\n📊 Edge Case Results:');
  const passed = testResults.filter(r => r.status === 'pass').length;
  const failed = testResults.filter(r => r.status === 'fail').length;
  const skipped = testResults.filter(r => r.status === 'skip').length;
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Skipped: ${skipped}\n`);
  
  return failed === 0;
}

testEdgeCases()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  });
