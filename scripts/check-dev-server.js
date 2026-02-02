#!/usr/bin/env node
/**
 * Diagnostic script to check Next.js dev server health
 * Usage: node scripts/check-dev-server.js
 */

const http = require('http');
const { execSync } = require('child_process');

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

console.log('🔍 Checking dev server health...\n');

// Check if server is running
function checkServerRunning() {
  try {
    const result = execSync(`lsof -ti:${PORT}`, { encoding: 'utf-8' });
    return result.trim().length > 0;
  } catch (e) {
    return false;
  }
}

// Check if endpoint responds
function checkEndpoint(path, expectedStatus = 200) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${path}`;
    http.get(url, (res) => {
      const statusCode = res.statusCode;
      let data = '';
      
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          success: statusCode === expectedStatus,
          status: statusCode,
          hasContent: data.length > 0,
          contentLength: data.length
        });
      });
    }).on('error', (err) => {
      resolve({
        success: false,
        error: err.message
      });
    });
  });
}

// Check if static chunk exists
function checkStaticChunk(chunkPath) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}/_next/static/${chunkPath}`;
    http.get(url, (res) => {
      resolve({
        success: res.statusCode === 200,
        status: res.statusCode
      });
    }).on('error', (err) => {
      resolve({
        success: false,
        error: err.message
      });
    });
  });
}

async function runDiagnostics() {
  const results = {
    serverRunning: false,
    homepage: null,
    winionsPage: null,
    staticChunks: {},
    errors: []
  };

  // 1. Check if server is running
  console.log('1. Checking if server is running...');
  results.serverRunning = checkServerRunning();
  if (results.serverRunning) {
    console.log('   ✅ Server is running on port', PORT);
  } else {
    console.log('   ❌ Server is NOT running on port', PORT);
    console.log('\n   Run: npm run dev');
    return results;
  }

  // 2. Check homepage
  console.log('\n2. Checking homepage...');
  results.homepage = await checkEndpoint('/');
  if (results.homepage.success) {
    console.log(`   ✅ Homepage responds (${results.homepage.status})`);
    console.log(`   📄 Content length: ${results.homepage.contentLength} bytes`);
  } else {
    console.log(`   ❌ Homepage failed: ${results.homepage.status || results.homepage.error}`);
    results.errors.push(`Homepage: ${results.homepage.status || results.homepage.error}`);
  }

  // 3. Check WINIONS page
  console.log('\n3. Checking WINIONS page...');
  results.winionsPage = await checkEndpoint('/winions');
  if (results.winionsPage.success) {
    console.log(`   ✅ WINIONS page responds (${results.winionsPage.status})`);
    console.log(`   📄 Content length: ${results.winionsPage.contentLength} bytes`);
  } else {
    console.log(`   ❌ WINIONS page failed: ${results.winionsPage.status || results.winionsPage.error}`);
    results.errors.push(`WINIONS page: ${results.winionsPage.status || results.winionsPage.error}`);
  }

  // 4. Check critical static chunks
  console.log('\n4. Checking static chunks...');
  const chunks = [
    'chunks/webpack.js',
    'chunks/app-pages-internals.js',
    'chunks/main-app.js',
    'css/app/layout.css'
  ];

  for (const chunk of chunks) {
    const result = await checkStaticChunk(chunk);
    results.staticChunks[chunk] = result;
    if (result.success) {
      console.log(`   ✅ ${chunk}`);
    } else {
      console.log(`   ❌ ${chunk} - Status: ${result.status || result.error}`);
      results.errors.push(`Static chunk ${chunk}: ${result.status || result.error}`);
    }
  }

  // 5. Check for build errors
  console.log('\n5. Checking for TypeScript/build errors...');
  try {
    execSync('npx tsc --noEmit --pretty false 2>&1', { 
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 10000
    });
    console.log('   ✅ No TypeScript errors');
  } catch (e) {
    const errorOutput = e.stdout || e.stderr || e.message;
    console.log('   ❌ TypeScript errors found:');
    console.log('   ' + errorOutput.split('\n').slice(0, 5).join('\n   '));
    results.errors.push('TypeScript errors detected');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (results.errors.length === 0) {
    console.log('✅ All checks passed! Server is healthy.');
  } else {
    console.log(`❌ Found ${results.errors.length} issue(s):`);
    results.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }
  console.log('='.repeat(50) + '\n');

  return results;
}

// Run diagnostics
runDiagnostics().catch(console.error);
