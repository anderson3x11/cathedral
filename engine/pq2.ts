import { createCompConfig } from '@src/pq2/compendium.module';
import { registerPersona } from './vendor-game';
registerPersona('pq2', 'Persona Q2: New Cinema Labyrinth', () => (createCompConfig() as any)['pq2']);
