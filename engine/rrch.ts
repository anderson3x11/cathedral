import { createCompConfig } from '@src/rrch/compendium.module';
import { registerSmt } from './vendor-game';
registerSmt('rrch', 'Raidou Remastered: The Mystery of the Soulless Army', () => (createCompConfig() as any)['rrch']);
