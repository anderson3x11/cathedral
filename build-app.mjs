import * as esbuild from 'esbuild';
import fs from 'fs';
await esbuild.build({
  entryPoints: ['app/main.tsx'], bundle: true, minify: true, format: 'iife', target: 'es2020',
  outfile: 'dist/app.js', jsx: 'transform', jsxFactory: 'h', jsxFragment: 'Fragment', logLevel: 'warning',
});
for (const f of ['elem-sprites.svg', 'logo.png', 'favicon.png']) { fs.copyFileSync('app/' + f, 'dist/' + f); }
const css = fs.readFileSync('app/style.css', 'utf8');
fs.writeFileSync('dist/index.html', `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Cathedral Fusion Tools</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Fusion calculator, skill planner and party builder for Shin Megami Tensei, Persona, Devil Summoner and Devil Survivor games.">
<link rel="icon" type="image/png" href="favicon.png">
<style>
${css}
</style>
<div id="app"><div class="main"><div class="loading">Loading</div></div></div>
<script src="app.js"></script>
`);
console.log('built', fs.statSync('dist/app.js').size);
