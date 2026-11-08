import { createCompConfig } from '@src/mjn1/compendium.module';
import { FusionDataService } from '@src/smt1/fusion-data.service';
import { registerService } from './vendor-game';
registerService('mjn1', 'Majin Tensei', 'smt', 'nes', FusionDataService, () => createCompConfig());
