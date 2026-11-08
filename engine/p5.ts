import { createCompConfig } from '@src/p5/compendium.module';
import { registerPersona } from './vendor-game';
registerPersona('p5', 'Persona 5', () => (createCompConfig() as any)['p5']);
