import { GameEngine, GameConfig } from './core';
import { Compendium } from '@src/pq2/models/compendium';
import { PersonaFusionChart } from '@src/pq2/models/per-fusion-chart';
import { P3_NORMAL_FISSION_CALCULATOR, P3_NORMAL_FUSION_CALCULATOR } from '@src/compendium/constants';
import { importSkillRow } from '@src/pq2/models/skill-importer';
import { withPartyAndCodes, PERSONA_COST_TYPES, computePrice } from './persona-common';

import COMP_CONFIG_JSON from '@src/p3r/data/comp-config.json';
import DEMON_UNLOCKS_JSON from '@src/p3r/data/demon-unlocks.json';
import DEMON_DATA_JSON from '@src/p3r/data/demon-data.json';
import PARTY_DATA_JSON from '@src/p3r/data/party-data.json';
import SKILL_DATA_JSON from '@src/p3r/data/skill-data.json';
import FUSION_CHART_JSON from '@src/p3r/data/fusion-chart.json';
import SPECIAL_RECIPES_JSON from '@src/p3r/data/special-recipes.json';

function build(): GameConfig {
  const resistElems = COMP_CONFIG_JSON.resistElems;
  const skillElems = resistElems.concat(COMP_CONFIG_JSON.skillElems);
  const races: string[] = [];
  for (const race of COMP_CONFIG_JSON.races) { races.push(race); races.push(race + ' P'); }
  const raw = Object.assign({}, DEMON_DATA_JSON);
  withPartyAndCodes(DEMON_DATA_JSON, PARTY_DATA_JSON);

  const skillData: any = {};
  for (const row of Object.values(SKILL_DATA_JSON) as any[]) {
    row.b[0] = row.b[0] || 99;
    skillData[row.a[0]] = importSkillRow(row, PERSONA_COST_TYPES);
  }
  const inheritTypes: any = {};
  for (const [elem, inherits] of Object.entries(COMP_CONFIG_JSON.inheritTypes)) {
    inheritTypes[elem] = (inherits as string).split('').map(n => n === '1' ? 1 : 0);
  }

  const compConfig: any = {
    appTitle: 'Persona 3 Reload', lang: 'en', races,
    raceOrder: races.reduce((acc: any, x, i) => { acc[x] = i; return acc; }, {}),
    appCssClasses: ['perps2', 'p3r'],
    skillData: [skillData], skillElems,
    ailmentElems: COMP_CONFIG_JSON.ailments.map(x => x.slice(0, 3).toLocaleLowerCase()),
    elemOrder: skillElems.reduce((acc: any, x, i) => { acc[x] = i; return acc; }, {}),
    resistCodes: COMP_CONFIG_JSON.resistCodes,
    demonData: [DEMON_DATA_JSON], baseStats: COMP_CONFIG_JSON.baseStats, resistElems,
    inheritTypes, inheritElems: COMP_CONFIG_JSON.inheritElems,
    demonUnlocks: DEMON_UNLOCKS_JSON, enemyData: [], enemyStats: [], enemyGrowths: [],
    normalTable: FUSION_CHART_JSON, elementTable: { elems: [], races: [], table: [] },
    specialRecipes: SPECIAL_RECIPES_JSON, maxSkillSlots: 8, hasTripleFusion: false,
    hasDemonResists: true, hasSkillRanks: true, hasEnemies: false, hasQrcodes: false,
    hasSkillCards: true, hasManualInheritance: true, computePrice,
    defaultDemon: 'Pixie', settingsKey: 'p3r', settingsVersion: 1
  };
  const chart = new PersonaFusionChart(compConfig, false);
  return {
    id: 'p3r', title: 'Persona 3 Reload', short: 'P3 Reload', family: 'persona',
    resistElems, ailmentElems: COMP_CONFIG_JSON.ailments, baseStats: COMP_CONFIG_JSON.baseStats,
    inheritElems: COMP_CONFIG_JSON.inheritElems, inheritTypes,
    maxSkillSlots: 8, races: COMP_CONFIG_JSON.races, unlocks: DEMON_UNLOCKS_JSON as any, rawDemons: raw,
    makeCompendium: t => new Compendium(compConfig, t), chart,
    fusionCalc: P3_NORMAL_FUSION_CALCULATOR, fissionCalc: P3_NORMAL_FISSION_CALCULATOR,
  };
}
(window as any).MegatenGames = (window as any).MegatenGames || {};
(window as any).MegatenGames.p3r = () => new GameEngine(build());
export {};
