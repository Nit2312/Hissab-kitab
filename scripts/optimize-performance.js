#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Performance Optimization Script');
console.log('================================');

// Check bundle size
try {
  console.log('\n📦 Analyzing bundle size...');
  const buildOutput = execSync('npm run build', { encoding: 'utf8', stdio: 'pipe' });
  
  // Extract bundle size information
  const sizeMatches = buildOutput.match(/(\d+(?:\.\d+)?)\s*(kB|MB|GB)/g);
  if (sizeMatches) {
    console.log('Bundle sizes found:');
    sizeMatches.forEach(size => console.log(`  - ${size}`));
  }
} catch (error) {
  console.log('❌ Build failed, check for errors');
}

// Check for unused dependencies
console.log('\n🔍 Checking for unused dependencies...');
try {
  const depcheck = execSync('npx depcheck', { encoding: 'utf8', stdio: 'pipe' });
  console.log(depcheck);
} catch (error) {
  // depcheck exits with code 1 when unused deps are found
  const output = error.stdout || error.message;
  if (output.includes('Unused dependencies')) {
    console.log('⚠️  Unused dependencies found:');
    console.log(output);
  } else {
    console.log('✅ No obvious unused dependencies detected');
  }
}

// Check image optimization
console.log('\n🖼️  Checking image optimization...');
const publicDir = path.join(__dirname, '../public');
const imageFiles = fs.readdirSync(publicDir).filter(file => 
  /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(file)
);

if (imageFiles.length > 0) {
  console.log(`Found ${imageFiles.length} images in public directory:`);
  imageFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`  - ${file}: ${sizeKB} KB`);
  });
  
  const totalSize = imageFiles.reduce((acc, file) => {
    const filePath = path.join(publicDir, file);
    return acc + fs.statSync(filePath).size;
  }, 0);
  
  const totalSizeKB = (totalSize / 1024).toFixed(2);
  console.log(`Total images size: ${totalSizeKB} KB`);
  
  if (totalSizeKB > 500) {
    console.log('⚠️  Consider optimizing images (target: < 500KB total)');
  } else {
    console.log('✅ Images are well optimized');
  }
}

// Performance recommendations
console.log('\n💡 Performance Recommendations:');
console.log('1. Use Next.js Image component for automatic optimization');
console.log('2. Implement service worker for caching');
console.log('3. Use dynamic imports for heavy components');
console.log('4. Enable compression on your hosting platform');
console.log('5. Consider using a CDN for static assets');

console.log('\n✨ Optimization complete!');
