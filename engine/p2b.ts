import { createCompConfig } from '@src/p2b/compendium.module';
import { FusionDataService } from '@src/p1/fusion-data.service';
import { registerService } from './vendor-game';
registerService('p2b', 'Persona 2: Eternal Punishment', 'persona', 'mib', FusionDataService, () => createCompConfig());
