import { createCompConfig } from '@src/smt2/compendium.module';
import { FusionDataService } from '@src/smt1/fusion-data.service';
import { registerService } from './vendor-game';
registerService('smt2', 'Shin Megami Tensei II', 'smt', 'nes', FusionDataService, () => createCompConfig());
