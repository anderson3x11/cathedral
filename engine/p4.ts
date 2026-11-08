import { createCompConfig } from '@src/p4/compendium.module';
import { registerPersona } from './vendor-game';
registerPersona('p4', 'Persona 4', () => (createCompConfig() as any)['p4']);
