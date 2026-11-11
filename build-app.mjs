import * as esbuild from 'esbuild';
import fs from 'fs';
import crypto from 'crypto';

// Public address of the deployed site, needed for absolute link-preview URLs. Override with SITE_URL=... npm run build.
const SITE = (process.env.SITE_URL || 'https://anderson3x11.dev/pyxi/').replace(/\/?$/, '/').replace(/^http:/, 'https:');
const TITLE = 'Pyxi: Megaten Fusion Calculator for SMT, Persona and more';
const NAME = 'Pyxi';
// Visitor counts on the owner's self-hosted Umami (cookieless). Empty ID = no script. data-domains skips local test runs.
const UMAMI_ID = process.env.UMAMI_ID ?? '05efcc54-77c8-465b-8abb-d88ac9a2a221';
const UMAMI = UMAMI_ID ? `
<script defer src="https://stats.anderson3x11.dev/script.js" data-website-id="${UMAMI_ID}" data-domains="anderson3x11.dev"></script>` : '';
const DESC = 'Megaten fusion calculator, skill planner and party builder for 41 games: Shin Megami Tensei, Persona, Devil Summoner, Devil Survivor and more.';

await esbuild.build({
  entryPoints: ['app/main.tsx'], bundle: true, minify: true, format: 'iife', target: 'es2020',
  outfile: 'dist/app.js', jsx: 'transform', jsxFactory: 'h', jsxFragment: 'Fragment', logLevel: 'warning',
  define: { __BUILD__: JSON.stringify(Date.now().toString(36)) },
});
const assets = ['elem-sprites.svg', 'weapon-sprites.svg', 'logo.png', 'favicon.png', 'favicon-32.png', 'favicon.ico',
  'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'og-image.png'];
for (const f of assets) { fs.copyFileSync('app/' + f, 'dist/' + f); }

fs.writeFileSync('dist/site.webmanifest', JSON.stringify({
  name: 'Pyxi: Megaten Fusion Calculator', short_name: NAME, description: DESC, start_url: './', scope: './', display: 'standalone',
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
<meta name="description" content="${DESC}">
<link rel="canonical" href="${SITE}">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#15171a" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${NAME}">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESC}">
<meta property="og:url" content="${SITE}">
<meta property="og:image" content="${SITE}og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Pyxi logo: Megaten fusion calculator">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${TITLE}">
<meta name="twitter:description" content="${DESC}">
<meta name="twitter:image" content="${SITE}og-image.png">
<style>
${css}
</style>
<div id="app"><div class="main"><div class="loading">Loading</div></div></div>
<noscript><p style="padding:16px">Pyxi needs JavaScript to run.</p></noscript>
<script src="app.js?v=${appHash}"></script>${UMAMI}
`);
console.log('built', fs.statSync('dist/app.js').size, 'for', SITE);
