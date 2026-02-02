#!/usr/bin/env node
/**
 * Check browser console for errors by loading pages in headless browser
 * Usage: node scripts/check-browser-console.js
 */

const http = require('http');

// Try to use puppeteer if available, otherwise fall back to basic checks
let puppeteer = null;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.log('⚠️  Puppeteer not installed. Installing...');
  console.log('   Run: npm install --save-dev puppeteer');
  console.log('   Or: npm install --save-dev playwright\n');
}

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

async function checkWithPuppeteer() {
  if (!puppeteer) {
    return null;
  }

  console.log('🌐 Loading pages in headless browser to check console errors...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {
    homepage: { errors: [], warnings: [], logs: [] },
    winions: { errors: [], warnings: [], logs: [] }
  };

  try {
    // Check homepage
    console.log('1. Checking homepage console...');
    const homepagePage = await browser.newPage();
    
    homepagePage.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      // Ignore network errors (SSL, 404s from IPFS gateways, etc.)
      if (type === 'error' && !text.includes('ERR_') && !text.includes('Failed to load resource')) {
        results.homepage.errors.push(text);
      } else if (type === 'warning' && !text.includes('ERR_')) {
        results.homepage.warnings.push(text);
      } else if (type !== 'error') {
        results.homepage.logs.push(text);
      }
    });

    homepagePage.on('pageerror', error => {
      results.homepage.errors.push(error.message);
    });

    try {
      await homepagePage.goto(BASE_URL, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait a bit for any async errors
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (results.homepage.errors.length === 0) {
        console.log('   ✅ No console errors');
      } else {
        console.log(`   ❌ Found ${results.homepage.errors.length} error(s):`);
        results.homepage.errors.forEach((err, i) => {
          console.log(`      ${i + 1}. ${err.substring(0, 150)}${err.length > 150 ? '...' : ''}`);
        });
      }
      
      if (results.homepage.warnings.length > 0) {
        console.log(`   ⚠️  Found ${results.homepage.warnings.length} warning(s)`);
      }
    } catch (e) {
      results.homepage.errors.push(`Page load failed: ${e.message}`);
      console.log(`   ❌ Page load failed: ${e.message}`);
    }
    
    await homepagePage.close();

    // Check WINIONS page
    console.log('\n2. Checking WINIONS page console...');
    const winionsPage = await browser.newPage();
    
    winionsPage.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      // Ignore network errors (SSL, 404s from IPFS gateways, etc.)
      if (type === 'error' && !text.includes('ERR_') && !text.includes('Failed to load resource')) {
        results.winions.errors.push(text);
      } else if (type === 'warning' && !text.includes('ERR_')) {
        results.winions.warnings.push(text);
      } else if (type !== 'error') {
        results.winions.logs.push(text);
      }
    });

    winionsPage.on('pageerror', error => {
      results.winions.errors.push(error.message);
    });

    try {
      await winionsPage.goto(`${BASE_URL}/winions`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait a bit for any async errors
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (results.winions.errors.length === 0) {
        console.log('   ✅ No console errors');
      } else {
        console.log(`   ❌ Found ${results.winions.errors.length} error(s):`);
        results.winions.errors.forEach((err, i) => {
          console.log(`      ${i + 1}. ${err.substring(0, 150)}${err.length > 150 ? '...' : ''}`);
        });
      }
      
      if (results.winions.warnings.length > 0) {
        console.log(`   ⚠️  Found ${results.winions.warnings.length} warning(s)`);
      }
    } catch (e) {
      results.winions.errors.push(`Page load failed: ${e.message}`);
      console.log(`   ❌ Page load failed: ${e.message}`);
    }
    
    await winionsPage.close();

  } finally {
    await browser.close();
  }

  return results;
}

async function checkServerRunning() {
  return new Promise((resolve) => {
    http.get(BASE_URL, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function main() {
  // Check if server is running
  const serverRunning = await checkServerRunning();
  if (!serverRunning) {
    console.log('❌ Dev server is not running on port', PORT);
    console.log('   Run: npm run dev');
    process.exit(1);
  }

  const results = await checkWithPuppeteer();
  
  if (!results) {
    console.log('\n💡 To enable browser console checking, install Puppeteer:');
    console.log('   npm install --save-dev puppeteer\n');
    process.exit(0);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  const totalErrors = results.homepage.errors.length + results.winions.errors.length;
  
  if (totalErrors === 0) {
    console.log('✅ No console errors found!');
  } else {
    console.log(`❌ Found ${totalErrors} console error(s) total:`);
    console.log(`   Homepage: ${results.homepage.errors.length}`);
    console.log(`   WINIONS: ${results.winions.errors.length}`);
    process.exit(1);
  }
  console.log('='.repeat(50) + '\n');
}

main().catch(console.error);
