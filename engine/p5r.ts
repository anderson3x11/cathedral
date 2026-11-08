import { GameEngine, GameConfig } from './core';
import { Compendium } from '@src/pq2/models/compendium';
import { PersonaFusionChart } from '@src/pq2/models/per-fusion-chart';
import { NormalFusionCalculator } from '@src/compendium/models/normal-fusion-calculator';
import { fuseWithDiffRace, fuseWithElement } from '@src/compendium/fusions/smt-nonelem-fusions';
import { fuseWithSameRace } from '@src/compendium/fusions/per-nonelem-fusions';
import { fuseWithNormResult, fuseWithSpecResult } from '@src/compendium/fusions/smt-element-fusions';
import { fuseTwoElements } from '@src/compendium/fusions/per-element-fusions';
import { splitWithDiffRace } from '@src/compendium/fusions/smt-nonelem-fissions';
import { splitWithSameRace } from '@src/compendium/fusions/per-nonelem-fissions';
import { importSkillRow } from '@src/pq2/models/skill-importer';
import { withPartyAndCodes, PERSONA_COST_TYPES, computePrice } from './persona-common';

import COMP_CONFIG_JSON from '@src/p5/data/comp-config.json';
import SKILL_DATA_JSON from '@src/p5/data/skill-data.json';
import ROY_DEMON_DATA_JSON from '@src/p5/data/roy-demon-data.json';
import ROY_SKILL_DATA_JSON from '@src/p5/data/roy-skill-data.json';
import ROY_PARTY_DATA_JSON from '@src/p5/data/roy-party-data.json';
import ROY_DEMON_UNLOCKS_JSON from '@src/p5/data/roy-demon-unlocks.json';
import ROY_SPECIAL_RECIPES_JSON from '@src/p5/data/roy-special-recipes.json';
import ROY_FUSION_PREREQS_JSON from '@src/p5/data/roy-fusion-prereqs.json';
import ROY_FUSION_CHART_JSON from '@src/p5/data/roy-fusion-chart.json';
import ROY_ELEMENT_CHART_JSON from '@src/p5/data/roy-element-chart.json';

function build(): GameConfig {
  const skillElems = COMP_CONFIG_JSON.resistElems.concat(COMP_CONFIG_JSON.skillElems);
  const races: string[] = [];
  for (const race of COMP_CONFIG_JSON.races) { races.push(race); races.push(race + ' P'); }
  const raw = Object.assign({}, ROY_DEMON_DATA_JSON);
  withPartyAndCodes(ROY_DEMON_DATA_JSON, ROY_PARTY_DATA_JSON, ROY_FUSION_PREREQS_JSON);
  for (const d of Object.values(ROY_PARTY_DATA_JSON) as any[]) { if (d.trait) { d.skills[d.trait] = 0; } }

  const skillDatas: any[] = [];
  for (const skills of [SKILL_DATA_JSON, ROY_SKILL_DATA_JSON] as any[]) {
    const sd: any = {};
    skillDatas.push(sd);
    for (const row of Object.values(skills) as any[]) {
      row.b[0] = row.b[0] || 99;
      sd[row.a[0]] = importSkillRow(row, PERSONA_COST_TYPES);
    }
  }
  const inheritTypes: any = {};
  for (const [elem, inherits] of Object.entries(COMP_CONFIG_JSON.inheritTypes)) {
    inheritTypes[elem] = (inherits as string).split('').map(n => n === '1' ? 1 : 0);
  }
  const ailmentElems = ['Burn', 'Freeze', 'Shock', 'Hama', 'Mudo', 'Dizzy', 'Fear', 'Despair', 'Brainwash', 'Other'];

  const compConfig: any = {
    appTitle: 'Persona 5 Royal', lang: 'en', races,
    raceOrder: races.reduce((acc: any, x, i) => { acc[x] = i; return acc; }, {}),
    appCssClasses: ['perps2', 'p5', 'p5r'],
    skillData: skillDatas, skillElems,
    ailmentElems: ailmentElems.map(x => x.slice(0, 3).toLocaleLowerCase()),
    elemOrder: skillElems.reduce((acc: any, x, i) => { acc[x] = i; return acc; }, {}),
    resistCodes: COMP_CONFIG_JSON.resistCodes,
    demonData: [ROY_DEMON_DATA_JSON], baseStats: COMP_CONFIG_JSON.baseStats,
    resistElems: COMP_CONFIG_JSON.resistElems,
    inheritTypes, inheritElems: COMP_CONFIG_JSON.inheritElems,
    demonUnlocks: ROY_DEMON_UNLOCKS_JSON, enemyData: [], enemyStats: [], enemyGrowths: [],
    normalTable: ROY_FUSION_CHART_JSON, elementTable: ROY_ELEMENT_CHART_JSON,
    specialRecipes: ROY_SPECIAL_RECIPES_JSON, maxSkillSlots: 10, hasTripleFusion: false,
    hasDemonResists: true, hasSkillRanks: true, hasEnemies: false, hasQrcodes: false,
    hasSkillCards: true, hasManualInheritance: true, computePrice,
    defaultDemon: 'Pixie', settingsKey: 'p5r', settingsVersion: 1
  };
  const chart = new PersonaFusionChart(compConfig, false);
  return {
    id: 'p5r', title: 'Persona 5 Royal', short: 'P5 Royal', family: 'persona',
    resistElems: COMP_CONFIG_JSON.resistElems, ailmentElems, baseStats: COMP_CONFIG_JSON.baseStats,
    inheritElems: COMP_CONFIG_JSON.inheritElems, inheritTypes,
    maxSkillSlots: 10, races: COMP_CONFIG_JSON.races, unlocks: ROY_DEMON_UNLOCKS_JSON as any, rawDemons: raw,
    makeCompendium: t => new Compendium(compConfig, t), chart,
    fusionCalc: new NormalFusionCalculator(
      [fuseWithDiffRace, fuseWithSameRace, fuseWithElement],
      [fuseWithNormResult, fuseWithSpecResult, fuseTwoElements]),
    fissionCalc: new NormalFusionCalculator([splitWithDiffRace, splitWithSameRace], []),
    elementRace: 'Treasure',
  };
}
(window as any).MegatenGames = (window as any).MegatenGames || {};
(window as any).MegatenGames.p5r = () => new GameEngine(build());
export {};
