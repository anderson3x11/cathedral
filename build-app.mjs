import * as esbuild from 'esbuild';
import fs from 'fs';
import crypto from 'crypto';

// Public address of the deployed site, needed for absolute link-preview URLs. Override with SITE_URL=... npm run build.
const SITE = (process.env.SITE_URL || 'https://anderson3x11.github.io/cathedral/').replace(/\/?$/, '/');
const TITLE = 'Cathedral Fusion Tools';
const DESC = 'Fusion calculator, skill planner and party builder for 41 Megami Tensei games: Shin Megami Tensei, Persona, Devil Summoner, Devil Survivor and more.';

await esbuild.build({
  entryPoints: ['app/main.tsx'], bundle: true, minify: true, format: 'iife', target: 'es2020',
  outfile: 'dist/app.js', jsx: 'transform', jsxFactory: 'h', jsxFragment: 'Fragment', logLevel: 'warning',
  define: { __BUILD__: JSON.stringify(Date.now().toString(36)) },
});
const assets = ['elem-sprites.svg', 'weapon-sprites.svg', 'logo.png', 'favicon.png', 'favicon-32.png', 'favicon.ico',
  'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'og-image.png'];
for (const f of assets) { fs.copyFileSync('app/' + f, 'dist/' + f); }

fs.writeFileSync('dist/site.webmanifest', JSON.stringify({
  name: TITLE, short_name: 'Cathedral', description: DESC, start_url: './', scope: './', display: 'standalone',
  background_color: '#15171a', theme_color: '#15171a',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
}, null, 2));
fs.writeFileSync('dist/robots.txt', `User-agent: *\nAllow: /\n`);

const css = fs.readFileSync('app/style.css', 'utf8');
const appHash = crypto.createHash('sha1').update(fs.readFileSync('dist/app.js')).digest('hex').slice(0, 10);
fs.writeFileSync('dist/index.html', `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="${DESC}">
<link rel="canonical" href="${SITE}">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#15171a" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${TITLE}">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESC}">
<meta property="og:url" content="${SITE}">
<meta property="og:image" content="${SITE}og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Cathedral Fusion Tools logo and tagline">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${TITLE}">
<meta name="twitter:description" content="${DESC}">
<meta name="twitter:image" content="${SITE}og-image.png">
<style>
${css}
</style>
<div id="app"><div class="main"><div class="loading">Loading</div></div></div>
<noscript><p style="padding:16px">Cathedral Fusion Tools needs JavaScript to run.</p></noscript>
<script src="app.js?v=${appHash}"></script>
`);
console.log('built', fs.statSync('dist/app.js').size, 'for', SITE);
