import { build, context } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
await mkdir('dist', { recursive: true });

const html = await readFile('src/ui.html', 'utf8');
const css = await readFile('src/ui.css', 'utf8');
const bundledHtml = html.replace('</head>', `<style>${css}</style></head>`);

await build({
  entryPoints: ['src/code.ts'],
  bundle: true,
  outfile: 'dist/code.js',
  format: 'iife',
  target: 'es2020',
  define: { __html__: JSON.stringify(bundledHtml) }
});
const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
manifest.main = 'code.js';
await writeFile('dist/manifest.json', JSON.stringify(manifest, null, 2) + '\n');

if (watch) {
  const ctx = await context({
    entryPoints: ['src/code.ts'], bundle: true, outfile: 'dist/code.js',
    format: 'iife', target: 'es2020', define: { __html__: JSON.stringify(bundledHtml) }
  });
  await ctx.watch();
  console.log('AcessForge: modo watch ativo.');
}
