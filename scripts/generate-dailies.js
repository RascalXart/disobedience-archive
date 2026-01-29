const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DAILIES = path.join(__dirname, '..', 'dailies');
const PUBLIC_DAILIES = path.join(__dirname, '..', 'public', 'dailies');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'dailies.json');
const SUPPORTED_EXTENSIONS = ['.gif', '.png', '.mp4', '.mov'];

// Ensure data directory exists
const dataDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Determine which dailies folder to use (prefer public/dailies for Next.js)
let DAILIES_FOLDER;
if (fs.existsSync(PUBLIC_DAILIES)) {
  DAILIES_FOLDER = PUBLIC_DAILIES;
  console.log(`📁 Using dailies folder: public/dailies`);
} else if (fs.existsSync(ROOT_DAILIES)) {
  DAILIES_FOLDER = ROOT_DAILIES;
  console.log(`📁 Using dailies folder: dailies (root level)`);
  console.log(`⚠️  Note: For Next.js to serve these files, move them to public/dailies`);
} else {
  console.error(`❌ Error: Dailies folder not found.`);
  console.error(`   Checked: ${ROOT_DAILIES}`);
  console.error(`   Checked: ${PUBLIC_DAILIES}`);
  console.error(`\n   Please ensure the dailies folder exists at one of these locations.`);
  process.exit(1);
}

// Read all files from the dailies folder
const files = fs.readdirSync(DAILIES_FOLDER);

// Filter files by supported extensions and create artwork objects
const artworks = files
  .filter(file => {
    const ext = path.extname(file).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
  })
  .map(file => {
    const filePath = path.join(DAILIES_FOLDER, file);
    const stats = fs.statSync(filePath);
    const ext = path.extname(file);
    const id = path.basename(file, ext);
    
    // Format date as YYYY-MM-DD
    const modifiedDate = new Date(stats.mtime);
    const savedDate = modifiedDate.toISOString().split('T')[0];
    
    return {
      id,
      imageUrl: `/dailies/${file}`,
      savedDate,
      status: 'not_listed',
      tags: []
    };
  })
  .sort((a, b) => {
    // Sort by savedDate ascending
    return a.savedDate.localeCompare(b.savedDate);
  });

// Write to JSON file
fs.writeFileSync(
  OUTPUT_FILE,
  JSON.stringify(artworks, null, 2),
  'utf8'
);

console.log(`✅ Successfully generated ${artworks.length} artwork entries`);
console.log(`📁 Output saved to: ${OUTPUT_FILE}`);
console.log(`\n⚠️  Note: Data folder is now in src/data/ for Next.js compatibility`);
console.log(`\n📊 Summary:`);
console.log(`   - Total files processed: ${artworks.length}`);
console.log(`   - Date range: ${artworks[0]?.savedDate} to ${artworks[artworks.length - 1]?.savedDate}`);

