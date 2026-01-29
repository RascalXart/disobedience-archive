const fs = require('fs');
const path = require('path');

const PUBLIC_DAILIES = path.join(__dirname, '..', 'public', 'dailies');

console.log('🧹 Pre-build cleanup: Removing dailies media files...');

if (fs.existsSync(PUBLIC_DAILIES)) {
  // Delete the entire public/dailies folder to ensure no media files are included
  console.log(`   Found: ${PUBLIC_DAILIES}`);
  
  // Count files before deletion for logging
  let fileCount = 0;
  let totalSize = 0;
  
  function countFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        countFiles(filePath);
      } else {
        fileCount++;
        totalSize += stat.size;
      }
    }
  }
  
  countFiles(PUBLIC_DAILIES);
  
  // Delete the entire folder
  fs.rmSync(PUBLIC_DAILIES, { recursive: true, force: true });
  
  console.log(`   ✅ Removed ${fileCount} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log('   ✅ Production builds will use NEXT_PUBLIC_MEDIA_BASE_URL for all media');
} else {
  console.log('   ℹ️  public/dailies does not exist (already clean)');
}

console.log('✅ Pre-build cleanup complete\n');

