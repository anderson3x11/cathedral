import { createCompConfig } from '@src/smt9/compendium.module';
import { FusionDataService } from '@src/smt1/fusion-data.service';
import { registerService } from './vendor-game';
registerService('smt9', 'Shin Megami Tensei NINE', 'smt', 'nes', FusionDataService, () => createCompConfig());
