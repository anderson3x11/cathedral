import { createCompConfig } from '@src/desu2/compendium.module';
import { registerSmt } from './vendor-game';
registerSmt('ds2br', 'Devil Survivor 2 Record Breaker', () => (createCompConfig() as any)['ds2br']);
