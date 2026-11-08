import { createCompConfig } from '@src/p5s/compendium.module';
import { FusionDataService } from '@src/p5s/fusion-data.service';
import { registerService } from './vendor-game';
registerService('p5s', 'Persona 5 Strikers', 'persona', 'persona', FusionDataService, () => createCompConfig());
