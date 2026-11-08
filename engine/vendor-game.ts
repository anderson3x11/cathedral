// Registers a game straight from aqiu384's own createCompConfig() (loaded through the
// vendor-module plugin in build-engine.mjs), so configs stay identical to the reference tool.
import { GameEngine, GameConfig } from './core';
import { Compendium as SmtCompendium } from '@src/smt4f/models/compendium';
import { FusionChart } from '@src/smt4f/models/fusion-chart';
import { Compendium as PerCompendium } from '@src/pq2/models/compendium';
import { PersonaFusionChart } from '@src/pq2/models/per-fusion-chart';
import {
  SMT_NORMAL_FISSION_CALCULATOR, SMT_NORMAL_FUSION_CALCULATOR, P3_NORMAL_FISSION_CALCULATOR, P3_NORMAL_FUSION_CALCULATOR
} from '@src/compendium/constants';
import { NormalFusionCalculator } from '@src/compendium/models/normal-fusion-calculator';
import { fuseWithDiffRace, fuseWithElement } from '@src/compendium/fusions/smt-nonelem-fusions';
import { fuseWithSameRace } from '@src/compendium/fusions/per-nonelem-fusions';
import { fuseWithNormResult, fuseWithSpecResult } from '@src/compendium/fusions/smt-element-fusions';
import { fuseTwoElements } from '@src/compendium/fusions/per-element-fusions';
import { splitWithDiffRace } from '@src/compendium/fusions/smt-nonelem-fissions';
import { splitWithSameRace } from '@src/compendium/fusions/per-nonelem-fissions';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function register(id: string, make: () => GameConfig) {
  const w = window as any;
  w.MegatenGames = w.MegatenGames || {};
  w.MegatenGames[id] = () => new GameEngine(make());
}

// Mirrors smt4f/fusion-data.service.ts: same calculators for every game on that wiring.
export function registerSmt(id: string, title: string, config: () => any) {
  register(id, () => {
    const cc = config();
    const chart = new FusionChart(cc);
    // Nocturne / Strange Journey store inheritance flags (+10 / -10) in the affinities field.
    const inheritFlags = cc.hasNonelemInheritance;
    const aff: string[] = cc.affinityElems || [];
    return {
      id, title, short: title, family: 'smt',
      resistElems: cc.resistElems, ailmentElems: cc.ailmentElems.map(cap), baseStats: cc.baseStats,
      affinityElems: !inheritFlags && aff.length ? aff : undefined,
      inheritElems: inheritFlags ? aff : undefined,
      maxSkillSlots: cc.maxSkillSlots, races: cc.races, unlocks: cc.demonUnlocks,
      rawDemons: Object.assign({}, ...cc.demonData),
      makeCompendium: t => new SmtCompendium(cc, t), chart,
      fusionCalc: SMT_NORMAL_FUSION_CALCULATOR, fissionCalc: SMT_NORMAL_FISSION_CALCULATOR,
      elementRace: cc.elementRace,
      lightDark: cc.hasLightDark ? r => chart.getLightDark(r) : undefined,
    };
  });
}

// Mirrors pq2/fusion-data.service.ts, including its p5 / p5t calculator overrides.
export function registerPersona(id: string, title: string, config: () => any) {
  register(id, () => {
    const cc = config();
    const css: string[] = cc.appCssClasses;
    let fusionCalc: any = P3_NORMAL_FUSION_CALCULATOR, fissionCalc: any = P3_NORMAL_FISSION_CALCULATOR;
    if (css.includes('p5t')) {
      fissionCalc = new NormalFusionCalculator([splitWithDiffRace], []);
      fusionCalc = new NormalFusionCalculator([fuseWithDiffRace], []);
    }
    if (css.includes('p5')) {
      fissionCalc = new NormalFusionCalculator([splitWithDiffRace, splitWithSameRace], []);
      fusionCalc = new NormalFusionCalculator(
        [fuseWithDiffRace, fuseWithSameRace, fuseWithElement],
        [fuseWithNormResult, fuseWithSpecResult, fuseTwoElements]);
    }
    return {
      id, title, short: title, family: 'persona',
      resistElems: cc.resistElems, ailmentElems: cc.ailmentElems.map(cap), baseStats: cc.baseStats,
      inheritElems: cc.inheritElems, inheritTypes: cc.inheritTypes,
      maxSkillSlots: cc.maxSkillSlots, races: cc.races, unlocks: cc.demonUnlocks,
      rawDemons: Object.assign({}, ...cc.demonData),
      makeCompendium: t => new PerCompendium(cc, t), chart: new PersonaFusionChart(cc, false),
      fusionCalc, fissionCalc, elementRace: 'Treasure',
    };
  });
}
