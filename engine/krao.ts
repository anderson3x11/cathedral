import { createCompConfig } from '@src/krao/compendium.module';
import { registerSmt } from './vendor-game';
registerSmt('krao', 'Raidou Kuzunoha vs. King Abaddon', () => (createCompConfig() as any)['krao']);
