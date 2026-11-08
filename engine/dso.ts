import { createCompConfig } from '@src/desu1/compendium.module';
import { registerSmt } from './vendor-game';
registerSmt('dso', 'Devil Survivor Overclocked', () => (createCompConfig() as any)['dso']);
