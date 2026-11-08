import { createCompConfig } from '@src/krch/compendium.module';
import { registerSmt } from './vendor-game';
registerSmt('krch', 'Raidou Kuzunoha vs. The Soulless Army', () => (createCompConfig() as any)['krch']);
