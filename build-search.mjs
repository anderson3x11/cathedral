// Writes dist/search.json: every game's demons (name, level, race) in engine order, for the homepage search.
// The app derives slugs from this order exactly like indexEngine does, so links match the demon pages.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
globalThis.window = globalThis;
const index = {};
for (const file of fs.readdirSync('dist/games')) {
  const id = file.replace('.js', '');
  require(path.resolve('dist/games', file));
  const eng = window.MegatenGames[id]();
  index[id] = eng.demonNames().map(n => { const d = eng.demon(n); return [n, d.lvl, d.race]; });
}
fs.writeFileSync('dist/search.json', JSON.stringify(index));
console.log('search index', Object.keys(index).length, 'games', fs.statSync('dist/search.json').size, 'bytes');
