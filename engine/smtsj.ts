import { createCompConfig } from '@src/smtsj/compendium.module';
import { registerSmt } from './vendor-game';
registerSmt('smtsj', 'Strange Journey', () => (createCompConfig() as any)['smtsj']);
