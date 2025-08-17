import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const dist = 'dist';
const releaseDir = 'release';
fs.mkdirSync(releaseDir, { recursive: true });
const zipName = 'vehicle-scraper-and-lister.zip';
const zipPath = path.join(releaseDir, zipName);

// Simple cross-platform zip via system 'zip' if available; otherwise, node fallback
try {
  execSync(`cd ${dist} && zip -r ../${zipPath} .`);
} catch {
  // naive fallback: not robust for production
  console.warn('zip command not found; please zip the dist/ folder manually.');
}
console.log('Packaged:', zipPath);
