import { createCompConfig } from '@src/kmt1/compendium.module';
import { FusionDataService } from '@src/kmt1/fusion-data.service';
import { registerService } from './vendor-game';
registerService('kmt1', 'Kyuuyaku Megami Tensei', 'smt', 'nes', FusionDataService, () => createCompConfig());
