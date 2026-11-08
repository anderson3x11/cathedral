import { createCompConfig } from '@src/p1/compendium.module';
import { FusionDataService } from '@src/p1/fusion-data.service';
import { registerService } from './vendor-game';
registerService('p1', 'Revelations: Persona', 'persona', 'mib', FusionDataService, () => createCompConfig());
