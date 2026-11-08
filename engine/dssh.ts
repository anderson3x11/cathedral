import { createCompConfig } from '@src/dssh/compendium.module';
import { FusionDataService } from '@src/smt1/fusion-data.service';
import { registerService } from './vendor-game';
registerService('dssh', 'Devil Summoner: Soul Hackers', 'smt', 'nes', FusionDataService, () => createCompConfig());
