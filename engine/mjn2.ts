import { createCompConfig } from '@src/mjn2/compendium.module';
import { FusionDataService } from '@src/smt1/fusion-data.service';
import { registerService } from './vendor-game';
registerService('mjn2', 'Majin Tensei II: Spiral Nemesis', 'smt', 'nes', FusionDataService, () => createCompConfig());
