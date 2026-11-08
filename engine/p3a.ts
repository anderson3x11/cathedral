import { createCompConfig } from '@src/p3/compendium.module';
import { registerPersona } from './vendor-game';
registerPersona('p3a', 'Persona 3 FES: The Answer', () => (createCompConfig() as any)['p3a']);
