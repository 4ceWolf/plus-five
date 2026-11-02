import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist/assets', { recursive: true });
await build({
  entryPoints: ['src/main.tsx', 'src/regex-worker.ts'],
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2022'],
  outdir: 'dist/assets',
  loader: { '.woff': 'file', '.woff2': 'file' },
  assetNames: '[name]-[hash]',
  legalComments: 'eof'
});
await copyFile('index.html', 'dist/index.html');
await copyFile('favicon.svg', 'dist/favicon.svg');
console.log('Built Plus Five. Start with: python3 serve.py');
