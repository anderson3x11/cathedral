import { createCompConfig } from '@src/p3/compendium.module';
import { registerPersona } from './vendor-game';
registerPersona('p3f', 'Persona 3 FES', () => (createCompConfig() as any)['p3f']);
