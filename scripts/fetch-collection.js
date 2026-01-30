/**
 * Script to fetch NFT collection data from Ethereum contract
 * Usage: node scripts/fetch-collection.js
 * 
 * This will fetch all NFTs from the contract and save to src/data/collection.json
 */

const fs = require('fs');
const path = require('path');

// Contract address
const CONTRACT_ADDRESS = '0xb06d423129152b9f84d37cc8ee6fe93ba5f26a7a';
const CHAIN = 'ethereum';

// Public Ethereum RPC endpoint (no API key needed)
const RPC_URL = 'https://eth.llamarpc.com';

// ERC-721 ABI (minimal - just what we need)
const ERC721_ABI = [
  'function totalSupply() external view returns (uint256)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
];

async function fetchCollectionData() {
  console.log('🔄 Fetching NFT collection data...');
  console.log(`   Contract: ${CONTRACT_ADDRESS}`);
  console.log(`   Chain: ${CHAIN}`);
  console.log('');

  try {
    // Dynamic import of ethers (install if needed)
    let ethers;
    try {
      ethers = require('ethers');
    } catch (e) {
      console.error('❌ ethers.js not found. Installing...');
      console.log('   Run: npm install ethers');
      process.exit(1);
    }

    // Connect to Ethereum
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ERC721_ABI, provider);

    // Get collection info
    console.log('📊 Fetching collection info...');
    const [name, symbol, totalSupply] = await Promise.all([
      contract.name().catch(() => 'Unknown Collection'),
      contract.symbol().catch(() => 'UNKNOWN'),
      contract.totalSupply().catch(() => {
        // Some contracts don't have totalSupply, try to estimate
        console.log('   ⚠️  totalSupply() not available, will fetch tokens individually');
        return null;
      }),
    ]);

    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Total Supply: ${totalSupply ? totalSupply.toString() : 'Unknown'}`);
    console.log('');

    // Determine how many tokens to fetch
    let tokenCount = totalSupply ? Number(totalSupply) : null;
    
    // If no totalSupply, we'll need to try fetching tokens until we hit errors
    // For now, let's try a reasonable range (0-1000) or you can specify
    if (!tokenCount) {
      console.log('   🔍 Attempting to find token count by testing token IDs...');
      tokenCount = await findTokenCount(contract);
      if (!tokenCount) {
        console.log('   ⚠️  Could not determine token count. Using range 0-1000.');
        tokenCount = 1000; // Fallback
      }
    }

    console.log(`   Fetching ${tokenCount} tokens...`);
    console.log('');

    // Fetch all token metadata
    const tokens = [];
    const batchSize = 10; // Fetch in batches to avoid rate limits

    for (let i = 0; i < tokenCount; i += batchSize) {
      const batch = [];
      for (let j = 0; j < batchSize && (i + j) < tokenCount; j++) {
        batch.push(fetchTokenData(contract, i + j));
      }
      
      const results = await Promise.allSettled(batch);
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          tokens.push(result.value);
        }
      });

      // Progress indicator
      if ((i + batchSize) % 50 === 0 || i + batchSize >= tokenCount) {
        console.log(`   Progress: ${Math.min(i + batchSize, tokenCount)}/${tokenCount} tokens`);
      }
    }

    console.log('');
    console.log(`✅ Fetched ${tokens.length} tokens`);

    // Sort by token ID
    tokens.sort((a, b) => Number(a.tokenId) - Number(b.tokenId));

    // Save to JSON
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'collection.json');
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const collectionData = {
      contractAddress: CONTRACT_ADDRESS,
      chain: CHAIN,
      name,
      symbol,
      totalSupply: tokens.length,
      fetchedAt: new Date().toISOString(),
      tokens,
    };

    fs.writeFileSync(outputPath, JSON.stringify(collectionData, null, 2));
    console.log(`💾 Saved to ${outputPath}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error fetching collection:', error);
    process.exit(1);
  }
}

async function findTokenCount(contract) {
  // Try to find the highest token ID by binary search or sequential check
  // For now, try sequential up to a limit
  let count = 0;
  let consecutiveErrors = 0;
  const maxErrors = 10; // Stop after 10 consecutive errors

  for (let i = 0; i < 10000; i++) {
    try {
      await contract.ownerOf(i);
      count = i + 1;
      consecutiveErrors = 0;
    } catch (e) {
      consecutiveErrors++;
      if (consecutiveErrors >= maxErrors) {
        break;
      }
    }
  }

  return count > 0 ? count : null;
}

async function fetchTokenData(contract, tokenId) {
  try {
    // Fetch token URI
    const tokenURI = await contract.tokenURI(tokenId);
    
    // Fetch owner
    const owner = await contract.ownerOf(tokenId).catch(() => null);

    // Resolve metadata from URI
    let metadata = null;
    if (tokenURI) {
      try {
        const resolvedURI = resolveIPFS(tokenURI);
        // Use node-fetch or built-in fetch (Node 18+)
        const https = require('https');
        const http = require('http');
        const url = require('url');
        
        metadata = await new Promise((resolve, reject) => {
          const parsedUrl = new URL(resolvedURI);
          const client = parsedUrl.protocol === 'https:' ? https : http;
          
          client.get(resolvedURI, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                resolve(null);
              }
            });
          }).on('error', () => resolve(null));
        });
      } catch (e) {
        // Metadata fetch failed, continue without it
        metadata = null;
      }
    }

    return {
      tokenId: tokenId.toString(),
      tokenURI,
      owner,
      imageUrl: metadata?.image ? resolveIPFS(metadata.image) : null,
      name: metadata?.name || `${contract.symbol || 'Token'} #${tokenId}`,
      description: metadata?.description || null,
      attributes: metadata?.attributes || metadata?.traits || [],
      externalUrl: metadata?.external_url || null,
    };
  } catch (error) {
    // Token doesn't exist or error fetching
    return null;
  }
}

function resolveIPFS(uri) {
  if (!uri) return null;
  
  // Handle IPFS URIs
  if (uri.startsWith('ipfs://')) {
    const hash = uri.replace('ipfs://', '');
    // Use public IPFS gateway
    return `https://ipfs.io/ipfs/${hash}`;
  }
  
  // Handle http/https URIs
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }
  
  // Handle data URIs
  if (uri.startsWith('data:')) {
    return uri;
  }
  
  return uri;
}

// Run the script
fetchCollectionData().catch(console.error);

