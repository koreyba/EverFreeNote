/**
 * Simple test runner for copy-web-bundle.js
 * Runs without Jest - pure Node.js
 */

const fs = require('fs-extra');
const path = require('path');

const { extractUsedChunks } = require('./copy-web-bundle');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (error) {
    console.log(`[FAIL] ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(item) {
      if (!actual.includes(item)) {
        throw new Error(`Expected array to contain ${JSON.stringify(item)}, got ${JSON.stringify(actual)}`);
      }
    },
  };
}

async function run() {
  console.log('\nTesting copy-web-bundle.js\n');

  await test('should extract JS chunk filenames', () => {
    const html = `<script src="/_next/static/chunks/chunk-alpha.js"></script>
                  <script src="/_next/static/chunks/chunk-beta.js"></script>`;
    const chunks = extractUsedChunks(html);
    expect(chunks).toContain('chunk-alpha.js');
    expect(chunks).toContain('chunk-beta.js');
  });

  await test('should extract CSS chunk filenames', () => {
    const html = `<link href="/_next/static/chunks/chunk-style.css" />`;
    const chunks = extractUsedChunks(html);
    expect(chunks).toContain('chunk-style.css');
  });

  await test('should extract chunk filenames containing dots and tildes', () => {
    const html = `
      <script src="/_next/static/chunks/chunk.with.dot.js"></script>
      <script src="/_next/static/chunks/chunk~with-tilde.js"></script>
      <script src="/_next/static/chunks/chunk.mix~with.dot.js"></script>
    `;
    const chunks = extractUsedChunks(html);
    expect(chunks).toContain('chunk.with.dot.js');
    expect(chunks).toContain('chunk~with-tilde.js');
    expect(chunks).toContain('chunk.mix~with.dot.js');
  });

  await test('should extract build ID from comment', () => {
    const html = `<!--buildXYZ123--><html></html>`;
    const chunks = extractUsedChunks(html);
    expect(chunks).toContain('_buildId:buildXYZ123');
  });

  await test('should handle HTML with no chunks', () => {
    const html = `<html><body>Hello</body></html>`;
    const chunks = extractUsedChunks(html);
    expect(Array.isArray(chunks)).toBe(true);
  });

  await test('should extract every chunk referenced in real build HTML', async () => {
    const htmlPath = path.join(__dirname, '../out/editor-webview/index.html');
    if (!fs.existsSync(htmlPath)) {
      console.log('   [SKIP] out/editor-webview/index.html not found');
      return;
    }

    const html = await fs.readFile(htmlPath, 'utf-8');
    const chunks = extractUsedChunks(html);
    const expectedChunks = [...new Set(
      [...html.matchAll(/\.?\/_next\/static\/chunks\/([^"'?#>\s]+\.(?:js|css))/gi)]
        .map(match => match[1])
    )];

    expect(chunks.length).toBe(expectedChunks.length);
    expect(chunks.some(chunk => chunk.endsWith('.js'))).toBe(true);
    expect(chunks.some(chunk => chunk.endsWith('.css'))).toBe(true);
  });

  await test('should deduplicate chunks', () => {
    const html = `
      <script src="/_next/static/chunks/chunk-dedup.js"></script>
      <script src="/_next/static/chunks/chunk-dedup.js"></script>
    `;
    const chunks = extractUsedChunks(html);
    const sameChunks = chunks.filter(chunk => chunk === 'chunk-dedup.js');
    expect(sameChunks.length).toBe(1);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(error => {
  console.log('[FAIL] Test runner error');
  console.log(`   Error: ${error.message}`);
  process.exit(1);
});
