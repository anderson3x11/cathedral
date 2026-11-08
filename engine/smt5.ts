import { createCompConfig } from '@src/smt5/compendium.module';
import { registerSmt } from './vendor-game';
registerSmt('smt5', 'Shin Megami Tensei V', () => (createCompConfig() as any)['smt5']);
