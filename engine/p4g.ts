import { createCompConfig } from '@src/p4/compendium.module';
import { registerPersona } from './vendor-game';
registerPersona('p4g', 'Persona 4 Golden', () => (createCompConfig() as any)['p4g']);
