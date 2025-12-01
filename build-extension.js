// Script to copy manifest.json and background.js to dist folder after build
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const distDir = resolve(process.cwd(), 'dist');
const iconsDir = resolve(distDir, 'icons');

// Ensure icons directory exists
try {
  mkdirSync(iconsDir, { recursive: true });
} catch (err) {
  // Directory might already exist
}

// Copy manifest
copyFileSync(
  resolve(process.cwd(), 'public/manifest.json'),
  resolve(distDir, 'manifest.json')
);

// Copy background.js
if (existsSync(resolve(process.cwd(), 'public/background.js'))) {
  copyFileSync(
    resolve(process.cwd(), 'public/background.js'),
    resolve(distDir, 'background.js')
  );
}

// Copy icons if they exist
const iconSizes = [16, 48, 128];
iconSizes.forEach(size => {
  const iconPath = resolve(process.cwd(), `public/icons/icon${size}.png`);
  if (existsSync(iconPath)) {
    copyFileSync(iconPath, resolve(iconsDir, `icon${size}.png`));
  }
});

console.log('Extension files copied to dist/');

