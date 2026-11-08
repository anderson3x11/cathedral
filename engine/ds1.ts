import { createCompConfig } from '@src/desu1/compendium.module';
import { registerSmt } from './vendor-game';
registerSmt('ds1', 'Devil Survivor', () => (createCompConfig() as any)['ds1']);
