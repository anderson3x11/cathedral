import { createCompConfig } from '@src/dsum/compendium.module';
import { FusionDataService } from '@src/smt1/fusion-data.service';
import { registerService } from './vendor-game';
registerService('dsum', 'Shin Megami Tensei: Devil Summoner', 'smt', 'nes', FusionDataService, () => createCompConfig());
