import { createCompConfig } from '@src/pq/compendium.module';
import { registerPersona } from './vendor-game';
registerPersona('pq', 'Persona Q: Shadow of the Labyrinth', () => (createCompConfig() as any)['pq2']);
