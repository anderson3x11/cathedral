import { createCompConfig } from '@src/desu2/compendium.module';
import { registerSmt } from './vendor-game';
registerSmt('ds2', 'Devil Survivor 2', () => (createCompConfig() as any)['ds2']);
