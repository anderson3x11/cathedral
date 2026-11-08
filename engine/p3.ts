import { createCompConfig } from '@src/p3/compendium.module';
import { registerPersona } from './vendor-game';
registerPersona('p3', 'Persona 3', () => (createCompConfig() as any)['p3']);
