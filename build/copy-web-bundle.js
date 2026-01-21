#!/usr/bin/env node
/**
 * Copy Web Editor Bundle to Mobile Assets
 * 
 * This script copies the Next.js static export to mobile app assets,
 * intelligently filtering to include only referenced chunks.
 * 
 * Usage: node scripts/copy-web-bundle.js
 */

const fs = require('fs-extra');
const path = require('path');

const SOURCE_HTML = path.join(__dirname, '../out/editor-webview/index.html');
const SOURCE_NEXT = path.join(__dirname, '../out/_next');
const ANDROID_DEST = path.join(__dirname, '../ui/mobile/android/app/src/main/assets/web-editor');
const IOS_DEST = path.join(__dirname, '../ui/mobile/ios/EverFreeNote/WebEditor');

async function copyBundle() {
  console.log('📦 Copying web editor bundle to mobile assets...');
  
  // Verify source exists
  if (!fs.existsSync(SOURCE_HTML)) {
    throw new Error(`Source not found: ${SOURCE_HTML}\nRun 'npm run build' first.`);
  }
  
  // Parse index.html to extract referenced files
  const html = await fs.readFile(SOURCE_HTML, 'utf-8');
  const usedChunks = extractUsedChunks(html);
  
  console.log(`  Found ${usedChunks.length} referenced chunks`);
  
  // Copy to Android
  console.log('  → Android assets');
  await copyBundleToDestination(ANDROID_DEST, html, usedChunks);
  
  // Copy to iOS
  console.log('  → iOS bundle');
  await copyBundleToDestination(IOS_DEST, html, usedChunks);
  
  // Log bundle size
  const androidSize = await getFolderSize(ANDROID_DEST);
  const iosSize = await getFolderSize(IOS_DEST);
  
  console.log(`✅ Bundle copied successfully`);
  console.log(`   Android: ${(androidSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   iOS: ${(iosSize / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * Extract chunk filenames referenced in HTML
 * @param {string} html - HTML content
 * @returns {string[]} Array of chunk filenames (e.g., ['abc123.js', 'def456.css'])
 */
function extractUsedChunks(html) {
  // Match: ./_next/static/chunks/abc123.js or /_next/static/chunks/abc123.css
  // Supports both relative (./) and absolute (/) paths
  // Captures any valid filename (letters, numbers, hyphens, underscores)
  const regex = /\.?\/_next\/static\/chunks\/([a-zA-Z0-9_-]+\.(?:js|css))/gi;
  const chunks = new Set();
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    chunks.add(match[1]); // Extract filename only
  }
  
  // Also extract build ID for manifest files
  const buildIdMatch = html.match(/<!--([a-zA-Z0-9_-]+)-->/);
  if (buildIdMatch) {
    chunks.add(`_buildId:${buildIdMatch[1]}`);
  }
  
  return Array.from(chunks);
}

/**
 * Copy bundle to a specific destination (Android or iOS)
 * @param {string} dest - Destination path
 * @param {string} html - HTML content
 * @param {string[]} usedChunks - Array of chunk filenames
 */
async function copyBundleToDestination(dest, html, usedChunks) {
  // Clean destination
  await fs.remove(dest);
  await fs.ensureDir(dest);
  
  // Copy index.html
  await fs.writeFile(path.join(dest, 'index.html'), html);
  
  // Copy _next directory structure
  const nextDest = path.join(dest, '_next');
  await fs.ensureDir(path.join(nextDest, 'static', 'chunks'));
  
  // Copy only used chunks
  for (const chunk of usedChunks) {
    if (chunk.startsWith('_buildId:')) {
      // Copy build manifest files
      const buildId = chunk.split(':')[1];
      const buildDir = path.join(SOURCE_NEXT, 'static', buildId);
      if (fs.existsSync(buildDir)) {
        await fs.copy(buildDir, path.join(nextDest, 'static', buildId));
      }
    } else {
      // Copy chunk file
      const srcChunk = path.join(SOURCE_NEXT, 'static', 'chunks', chunk);
      const destChunk = path.join(nextDest, 'static', 'chunks', chunk);
      
      if (fs.existsSync(srcChunk)) {
        await fs.copy(srcChunk, destChunk);
      } else {
        console.warn(`  ⚠️  Chunk not found: ${chunk}`);
      }
    }
  }
}

/**
 * Calculate total folder size recursively
 * @param {string} folderPath - Path to folder
 * @returns {Promise<number>} Size in bytes
 */
async function getFolderSize(folderPath) {
  let size = 0;
  
  if (!fs.existsSync(folderPath)) {
    return 0;
  }
  
  const files = await fs.readdir(folderPath, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = path.join(folderPath, file.name);
    if (file.isDirectory()) {
      size += await getFolderSize(filePath);
    } else {
      const stats = await fs.stat(filePath);
      size += stats.size;
    }
  }
  
  return size;
}

// Main execution
if (require.main === module) {
  copyBundle().catch(error => {
    console.error('❌ Error copying bundle:', error.message);
    process.exit(1);
  });
}

module.exports = { copyBundle, extractUsedChunks };
