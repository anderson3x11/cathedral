import { createCompConfig } from '@src/smt4f/compendium.module';
import { registerSmt } from './vendor-game';
registerSmt('smt4f', 'Shin Megami Tensei IV Apocalypse', () => (createCompConfig() as any)['smt4f']);
