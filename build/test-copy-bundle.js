/**
 * Simple test runner for copy-web-bundle.js
 * Runs without Jest - pure Node.js
 */

const fs = require('fs-extra');
const path = require('path');

// Import the function to test
const { extractUsedChunks } = require('./copy-web-bundle');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
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
    toBeGreaterThan(n) {
      if (actual <= n) {
        throw new Error(`Expected ${actual} to be greater than ${n}`);
      }
    },
    toHaveLength(n) {
      if (actual.length !== n) {
        throw new Error(`Expected length ${n}, got ${actual.length}`);
      }
    }
  };
}

console.log('\n🧪 Testing copy-web-bundle.js\n');

// Test 1: Extract JS chunks
test('should extract JS chunk filenames', () => {
  const html = `<script src="/_next/static/chunks/abc123.js"></script>
                <script src="/_next/static/chunks/def456.js"></script>`;
  const chunks = extractUsedChunks(html);
  expect(chunks).toContain('abc123.js');
  expect(chunks).toContain('def456.js');
});

// Test 2: Extract CSS chunks
test('should extract CSS chunk filenames', () => {
  const html = `<link href="/_next/static/chunks/db450b44a662c813.css" />`;
  const chunks = extractUsedChunks(html);
  expect(chunks).toContain('db450b44a662c813.css');
});

// Test 3: Extract build ID
test('should extract build ID from comment', () => {
  const html = `<!--buildXYZ123--><html></html>`;
  const chunks = extractUsedChunks(html);
  expect(chunks).toContain('_buildId:buildXYZ123');
});

// Test 4: Handle empty HTML
test('should handle HTML with no chunks', () => {
  const html = `<html><body>Hello</body></html>`;
  const chunks = extractUsedChunks(html);
  expect(Array.isArray(chunks)).toBe(true);
});

// Test 5: Real HTML from build
test('should extract chunks from real build HTML', async () => {
  const htmlPath = path.join(__dirname, '../out/editor-webview/index.html');
  if (fs.existsSync(htmlPath)) {
    const html = await fs.readFile(htmlPath, 'utf-8');
    const chunks = extractUsedChunks(html);
    expect(chunks.length).toBeGreaterThan(5); // Should have multiple chunks
    
    // Verify at least one JS and one CSS
    const hasJS = chunks.some(c => c.endsWith('.js'));
    const hasCSS = chunks.some(c => c.endsWith('.css'));
    expect(hasJS).toBe(true);
    expect(hasCSS).toBe(true);
  } else {
    console.log('   ⚠️  Skipped: out/editor-webview/index.html not found');
  }
});

// Test 6: Deduplication
test('should deduplicate chunks', () => {
  const html = `
    <script src="/_next/static/chunks/1171f1d1e347dca2.js"></script>
    <script src="/_next/static/chunks/1171f1d1e347dca2.js"></script>
  `;
  const chunks = extractUsedChunks(html);
  const sameChunks = chunks.filter(c => c === '1171f1d1e347dca2.js');
  expect(sameChunks.length).toBe(1);
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
