import { createCompConfig } from '@src/p5t/compendium.module';
import { registerPersona } from './vendor-game';
registerPersona('p5t', 'Persona 5 Tactica', () => (createCompConfig() as any)['p5t']);
