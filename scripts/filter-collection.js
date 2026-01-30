/**
 * Script to filter and reorganize collection data
 * - Removes BRIBE tokens
 * - Puts Pope Doom and The Murdered Pope Clippius at the top
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'collection.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'collection.json');

console.log('🔄 Filtering and reorganizing collection data...\n');

// Read the collection data
const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

// Find special tokens
const popeDoom = data.tokens.find(t => 
  t.name && (
    t.name.includes('Pope Doom') || 
    t.name.includes('POPE DOOM') ||
    t.name.includes('Pøpe Døøm') ||
    t.name.includes('PØPE DØØM')
  )
);

const clippius = data.tokens.find(t => 
  t.name && (
    t.name.includes('Clippius') || 
    t.name.includes('CLIPPIUS') ||
    t.name.includes('Murdered Pope')
  )
);

console.log('Special tokens found:');
if (popeDoom) {
  console.log(`  ✅ Pope Doom: ${popeDoom.name} (Token #${popeDoom.tokenId})`);
} else {
  console.log('  ❌ Pope Doom: NOT FOUND');
}

if (clippius) {
  console.log(`  ✅ Clippius: ${clippius.name} (Token #${clippius.tokenId})`);
} else {
  console.log('  ❌ Clippius: NOT FOUND');
}

// Filter out BRIBE tokens
const filteredTokens = data.tokens.filter(t => {
  const name = t.name || '';
  return !name.toUpperCase().startsWith('BRIBE');
});

const bribeCount = data.tokens.length - filteredTokens.length;
console.log(`\n📊 Filtering:`);
console.log(`  Original tokens: ${data.tokens.length}`);
console.log(`  BRIBE tokens removed: ${bribeCount}`);
console.log(`  Remaining tokens: ${filteredTokens.length}`);

// Separate special tokens from regular tokens
const specialTokens = [];
const regularTokens = [];

filteredTokens.forEach(token => {
  if (token === popeDoom || token === clippius) {
    specialTokens.push(token);
  } else {
    regularTokens.push(token);
  }
});

// Sort special tokens: Pope Doom first, then Clippius
specialTokens.sort((a, b) => {
  if (a === popeDoom) return -1;
  if (b === popeDoom) return 1;
  if (a === clippius) return -1;
  if (b === clippius) return 1;
  return 0;
});

// Combine: special tokens first, then regular tokens
const reorganizedTokens = [...specialTokens, ...regularTokens];

// Update the collection data
const updatedData = {
  ...data,
  totalSupply: reorganizedTokens.length,
  tokens: reorganizedTokens,
  filteredAt: new Date().toISOString(),
  specialTokens: {
    popeDoom: popeDoom ? popeDoom.tokenId : null,
    clippius: clippius ? clippius.tokenId : null,
  },
};

// Save the updated data
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(updatedData, null, 2));

console.log(`\n✅ Collection data updated:`);
console.log(`   - Special section: ${specialTokens.length} tokens (Pope Doom, Clippius)`);
console.log(`   - Regular tokens: ${regularTokens.length} tokens`);
console.log(`   - Total: ${reorganizedTokens.length} tokens`);
console.log(`   - Saved to: ${OUTPUT_FILE}\n`);

