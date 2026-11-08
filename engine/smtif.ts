import { createCompConfig } from '@src/smtif/compendium.module';
import { FusionDataService } from '@src/smt1/fusion-data.service';
import { registerService } from './vendor-game';
registerService('smtif', 'Shin Megami Tensei if...', 'smt', 'nes', FusionDataService, () => createCompConfig());
