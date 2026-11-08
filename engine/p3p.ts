import { createCompConfig } from '@src/p3/compendium.module';
import { registerPersona } from './vendor-game';
registerPersona('p3p', 'Persona 3 Portable', () => (createCompConfig() as any)['p3p']);
