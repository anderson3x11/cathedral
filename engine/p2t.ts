import { createCompConfig } from '@src/p2t/compendium.module';
import { FusionDataService } from '@src/p1/fusion-data.service';
import { registerService } from './vendor-game';
registerService('p2t', 'Persona 2: Innocent Sin', 'persona', 'mib', FusionDataService, () => createCompConfig());
