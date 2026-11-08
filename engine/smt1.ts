import { createCompConfig } from '@src/smt1/compendium.module';
import { FusionDataService } from '@src/smt1/fusion-data.service';
import { registerService } from './vendor-game';
registerService('smt1', 'Shin Megami Tensei', 'smt', 'nes', FusionDataService, () => createCompConfig());
