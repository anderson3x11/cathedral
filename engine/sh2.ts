import { createCompConfig } from '@src/sh2/compendium.module';
import { registerSmt } from './vendor-game';
registerSmt('sh2', 'Soul Hackers 2', () => (createCompConfig() as any)['sh2']);
