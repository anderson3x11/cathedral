import { createCompConfig } from '@src/smt3/compendium.module';
import { registerSmt } from './vendor-game';
registerSmt('smt3', 'Shin Megami Tensei III: Nocturne', () => (createCompConfig() as any)['smt3']);
