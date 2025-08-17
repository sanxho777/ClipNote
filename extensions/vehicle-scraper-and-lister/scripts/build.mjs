import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const outdir = 'dist';

const entryPoints = [
  'src/background.ts',
  'src/content.ts',
  'src/facebook.ts',
  'src/ui/popup.ts',
  'src/ui/options.ts',
  // core and adapters are bundled via these entries
];

await build({
  entryPoints,
  outdir,
  bundle: true,
  minify: true,
  sourcemap: false,
  format: 'esm',
  target: ['chrome120'],
  define: { __DEV__: 'false' },
});

// copy html/css and manifest and public
const toCopy = [
  ['src/ui/popup.html', 'popup.html'],
  ['src/ui/popup.css', 'popup.css'],
  ['src/ui/options.html', 'options.html'],
  ['src/ui/options.css', 'options.css'],
  ['manifest.json', 'manifest.json'],
];

for (const [src, dest] of toCopy) {
  fs.copyFileSync(src, path.join(outdir, dest));
}

// public assets
function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const f of fs.readdirSync(srcDir)) {
    const s = path.join(srcDir, f);
    const d = path.join(destDir, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir('public', path.join(outdir, 'public'));
