import * as esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';

// Loads aqiu384's compendium.module.ts without its Angular routes and exports createCompConfig instead.
const vendorModule = {
  name: 'vendor-module',
  setup(b) {
    b.onLoad({ filter: /compendium\.module\.ts$/ }, async args => {
      let src = await fs.promises.readFile(args.path, 'utf8');
      src = src.replace(/^import \{ createCompendiumRoutes \}.*$/m, '')
        .replace(/export const CompendiumRoutes = createCompendiumRoutes\(createCompConfig\(\)\);/, 'export { createCompConfig };');
      return { contents: src, loader: 'ts' };
    });
  },
};
const SRC = path.resolve('vendor/megaten-fusion-tool/src/app');
const games = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync('engine').filter(f => !['core.ts', 'vendor-game.ts', 'persona-common.ts'].includes(f)).map(f => f.replace('.ts', ''));
for (const g of games) {
  await esbuild.build({
    entryPoints: [`engine/${g}.ts`], bundle: true, minify: true, format: 'iife',
    outfile: `dist/games/${g}.js`, target: 'es2020',
    alias: { '@src': SRC, '@angular/core': './stubs/angular-core.ts' },
    loader: { '.json': 'json' }, logLevel: 'warning', plugins: [vendorModule],
    tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
  });
}
