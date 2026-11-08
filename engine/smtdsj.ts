import { createCompConfig } from '@src/smtsj/compendium.module';
import { registerSmt } from './vendor-game';
registerSmt('smtdsj', 'Strange Journey Redux', () => (createCompConfig() as any)['smtdsj']);
