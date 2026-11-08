import { createCompConfig } from '@src/smtim/compendium.module';
import { FusionDataService } from '@src/smt1/fusion-data.service';
import { registerService } from './vendor-game';
registerService('smtim', 'Shin Megami Tensei IMAGINE', 'smt', 'nes', FusionDataService, () => createCompConfig());
