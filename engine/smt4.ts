import { createCompConfig } from '@src/smt4/compendium.module';
import { registerSmt } from './vendor-game';
registerSmt('smt4', 'Shin Megami Tensei IV', () => (createCompConfig() as any)['smt4']);
