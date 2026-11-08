import { GameEngine, GameConfig } from './core';
import { Compendium } from '@src/smt4f/models/compendium';
import { FusionChart } from '@src/smt4f/models/fusion-chart';
import { SMT_NORMAL_FISSION_CALCULATOR, SMT_NORMAL_FUSION_CALCULATOR } from '@src/compendium/constants';
import { skillRowToEffect } from '@src/pq2/models/skill-importer';

import COMP_CONFIG_JSON from '@src/smt5/data/comp-config.json';
import COMP_COSTS_JSON from '@src/smt5/data/comp-costs.json';
import INNATE_SKILLS_JSON from '@src/smt5/data/innate-skills.json';
import TALISMAN_SKILLS_JSON from '@src/smt5/data/talisman-skills.json';
import PERIAPT_SKILLS_JSON from '@src/smt5/data/periapt-skills.json';
import ELEMENT_CHART_JSON from '@src/smt5/data/element-chart.json';
import ALIGNMENTS_JSON from '@src/smt5/data/alignments.json';
import DEMON_DATA_JSON from '@src/smt5/data/demon-data.json';
import SKILL_DATA_JSON from '@src/smt5/data/skill-data.json';
import FUSION_PREREQS_JSON from '@src/smt5/data/fusion-prereqs.json';
import VEN_DEMON_DATA_JSON from '@src/smt5/data/ven-demon-data.json';
import VEN_SKILL_DATA_JSON from '@src/smt5/data/ven-skill-data.json';
import VEN_FUSION_CHART_JSON from '@src/smt5/data/ven-fusion-chart.json';
import VEN_SPECIAL_RECIPES_JSON from '@src/smt5/data/ven-special-recipes.json';
import VEN_DEMON_UNLOCKS_JSON from '@src/smt5/data/ven-demon-unlocks.json';
import VEN_FUSION_PREREQS_JSON from '@src/smt5/data/ven-fusion-prereqs.json';

function build(): GameConfig {
  const affinityElems = COMP_CONFIG_JSON.resistElems.concat(COMP_CONFIG_JSON.affinityElems);
  const skillElems = affinityElems.concat(COMP_CONFIG_JSON.skillElems);
  const COST_MP = 3 << 10;
  const COST_MAG = 19 << 10;
  const skillData: any[] = [];

  for (const skillJson of [SKILL_DATA_JSON, VEN_SKILL_DATA_JSON] as any[]) {
    const gameSkills: any = {};
    skillData.push(gameSkills);
    for (const row of Object.values(skillJson) as any[]) {
      const { a: [sname, elem, target], b: nums, c: descs } = row;
      const [rank, cost, power, , , acc] = nums;
      nums[5] = acc < 200 || (0 < power && elem !== 'rec') ? acc : 100;
      gameSkills[sname] = {
        element: elem,
        rank: Math.min(rank, 99),
        target: target === '-' ? 'Self' : target,
        cost: cost === 0 ? 0 : cost < 1000 ? COST_MP + cost : COST_MAG,
        effect: skillRowToEffect(nums, descs, false),
      };
    }
  }

  for (const [demons, prereqs] of [[DEMON_DATA_JSON, FUSION_PREREQS_JSON], [VEN_DEMON_DATA_JSON, VEN_FUSION_PREREQS_JSON]] as any[]) {
    for (const [dname, prereq] of Object.entries(prereqs)) {
      demons[dname].prereq = prereq;
      demons[dname].fusion = 'accident';
    }
  }

  for (const demonJson of [DEMON_DATA_JSON, VEN_DEMON_DATA_JSON] as any[]) {
    for (const [dname, entry] of Object.entries(demonJson) as any[]) {
      entry.innate = (INNATE_SKILLS_JSON as any)[dname] || '-';
      entry.innatePrice = (COMP_COSTS_JSON as any)[dname] || 0;
    }
  }

  const races = COMP_CONFIG_JSON.races;
  const compConfig: any = {
    appTitle: 'Shin Megami Tensei V Vengeance',
    races,
    raceOrder: races.reduce((acc: any, t, i) => { acc[t] = i; return acc; }, {}),
    appCssClasses: ['smt4', 'smt5', 'smt5v'],
    lang: 'en',
    affinityElems,
    skillData,
    fusionSpells: Object.assign({}, PERIAPT_SKILLS_JSON, TALISMAN_SKILLS_JSON),
    skillElems,
    elemOrder: skillElems.reduce((acc: any, t, i) => { acc[t] = i; return acc; }, {}),
    resistCodes: COMP_CONFIG_JSON.resistCodes,
    affinityBonuses: { costs: [], upgrades: [] },
    lvlModifier: 1,
    maxSkillSlots: 8,
    hasLightDark: true,
    hasSkillRanks: true,
    hasNonelemInheritance: false,
    demonData: [DEMON_DATA_JSON, VEN_DEMON_DATA_JSON],
    evolveData: {},
    alignments: ALIGNMENTS_JSON,
    baseStats: COMP_CONFIG_JSON.baseStats,
    resistElems: COMP_CONFIG_JSON.resistElems,
    ailmentElems: COMP_CONFIG_JSON.ailments.map(a => a.slice(0, 3).toLocaleLowerCase()),
    demonUnlocks: VEN_DEMON_UNLOCKS_JSON,
    normalTable: VEN_FUSION_CHART_JSON,
    elementTable: ELEMENT_CHART_JSON,
    specialRecipes: VEN_SPECIAL_RECIPES_JSON,
    settingsKey: 'smt5v',
    settingsVersion: 1,
    defaultRecipeDemon: 'Pixie',
    elementRace: 'Element'
  };

  const chart = new FusionChart(compConfig);
  return {
    id: 'smt5v',
    title: 'Shin Megami Tensei V: Vengeance',
    short: 'SMT V Vengeance',
    family: 'smt',
    resistElems: COMP_CONFIG_JSON.resistElems,
    ailmentElems: COMP_CONFIG_JSON.ailments,
    baseStats: COMP_CONFIG_JSON.baseStats,
    affinityElems,
    maxSkillSlots: 8,
    races,
    unlocks: VEN_DEMON_UNLOCKS_JSON as any,
    rawDemons: Object.assign({}, DEMON_DATA_JSON, VEN_DEMON_DATA_JSON),
    makeCompendium: toggles => new Compendium(compConfig, toggles),
    chart,
    fusionCalc: SMT_NORMAL_FUSION_CALCULATOR,
    fissionCalc: SMT_NORMAL_FISSION_CALCULATOR,
    elementRace: 'Element',
    lightDark: r => chart.getLightDark(r),
  };
}

(window as any).MegatenGames = (window as any).MegatenGames || {};
(window as any).MegatenGames.smt5v = () => new GameEngine(build());
export {};
