// Wraps aqiu384's megaten-fusion-tool models (Unlicense) behind a small, framework-free API.
import { FusionSettings, DemonUnlock } from '@src/compendium/models/fusion-settings';

export type ResistCode = 'wk' | '-' | 'rs' | 'nu' | 'rp' | 'dr';
const RESIST_TYPES: { [n: number]: ResistCode } = { 6: 'wk', 5: '-', 4: 'rs', 3: 'nu', 2: 'rp', 1: 'dr' };

const COST_TYPES = [
  'Auto', ' HP', '% HP', ' MP', '% MP', ' SP', '% SP', ' Ex', '% Ex', ' MG', '% MG', '', '', '', '', ' CC',
  'Extra', 'Varies', 'Fusion', 'Gauge', 'Sabbath'
];

export function costToString(value: number): string {
  if (!value) { return 'Passive'; }
  const type = COST_TYPES[value >> 10] ?? '';
  const cost = value & 0x3FF;
  return cost === 0 ? type.trim() : cost + type;
}

export function levelToString(value: number, family: string): string {
  if (value === 0) { return family === 'smt' ? 'Innate' : 'Trait'; }
  if (value < 2) { return 'Base'; }
  if (value < 120) { return String(value); }
  if (family === 'smt' && value === 5278) { return 'Magatsuhi'; }
  if (family === 'smt' && value === 4884) { return 'Periapt'; }
  if (value === 3865) { return 'Fusion alarm'; }
  return String.fromCharCode(Math.floor(value / 100) + 32) + String.fromCharCode(value % 100 + 32);
}

export interface GameConfig {
  id: string;
  title: string;
  short: string;
  family: 'smt' | 'persona';
  resistElems: string[];
  ailmentElems: string[];
  baseStats: string[];
  affinityElems?: string[];      // SMT V skill potential columns
  inheritElems?: string[];       // Persona inheritance columns
  inheritTypes?: { [type: string]: number[] };
  maxSkillSlots: number;
  races: string[];
  unlocks: DemonUnlock[];
  rawDemons: { [name: string]: any };
  makeCompendium: (toggles: { [name: string]: boolean }) => any;
  chart: any;
  fusionCalc: any;
  fissionCalc: any;
  elementRace?: string;
  lightDark?: (race: string) => number;
  triFissionCalc?: any;          // three-ingredient recipes, when the game has them
  squareChart?: any;             // { normalChart, tripleChart, raceOrder } for the triple calculators
  iconSet?: 'smt' | 'persona' | 'nes' | 'mib';
  noPlanner?: boolean;           // fixed skill sets, nothing to inherit
}

export interface DemonView {
  name: string; race: string; lvl: number; price: number;
  stats: number[]; growths: number[];
  resists: ResistCode[]; ailments: ResistCode[];
  skills: { name: string; level: number; label: string }[];
  affinities: number[];
  inherit: string;
  fusion: string; prereq: string; align: string;
  isElement: boolean;
}

export interface SkillView {
  name: string; element: string; cost: string; effect: string; target: string;
  rank: number; inheritable: boolean; inherit: string;
  learnedBy: { demon: string; level: number; label: string }[];
}

export class GameEngine {
  comp: any;
  settings: FusionSettings;
  private demonCache = new Map<string, DemonView>();
  private skillCache = new Map<string, SkillView>();

  constructor(public cfg: GameConfig) {
    this.settings = new FusionSettings(cfg.unlocks, []);
    this.comp = cfg.makeCompendium(this.settings.demonToggles);
  }

  get unlockGroups() {
    return this.cfg.unlocks.map(u => ({
      category: u.category,
      items: Object.entries(u.conditions).map(([names, cond]) => ({ key: names, names: names.split(','), condition: cond }))
    }));
  }

  get toggles(): { [key: string]: boolean } { return this.settings.saveFile; }

  setToggles(save: { [key: string]: boolean }) {
    this.settings.updateSaveFile(save);
    this.comp.updateFusionSettings(this.settings.demonToggles);
  }

  /** A recipe name that exists in this compendium and is unlocked (some fission data names demons the game lacks). */
  private usable(name: string): boolean { return !!name && this.isEnabled(name) && !!this.comp.getDemon(name); }

  isEnabled(name: string): boolean {
    return this.settings.demonToggles[name] !== false;
  }

  // & 7: the smt1 wiring sets bit 3 on its resist types
  private decodeResist(code: number): ResistCode { return RESIST_TYPES[(code >> 10) & 7] || '-'; }

  demonNames(): string[] {
    return Object.keys(this.cfg.rawDemons).filter(n => {
      const d = this.comp.getDemon(n);
      return d && !d.isEnemy && d.fusion !== 'party' && d.fusion !== 'enemy';
    });
  }

  demon(name: string): DemonView | undefined {
    const hit = this.demonCache.get(name);
    if (hit) { return hit; }
    const d = this.comp.getDemon(name);
    if (!d) { return undefined; }
    const raw = this.cfg.rawDemons[name] || {};
    const view: DemonView = {
      name,
      race: d.race,
      lvl: d.lvl,
      price: d.price || 0,
      stats: d.stats || [],
      growths: d.growths || [],
      resists: (d.resists || []).map((c: number) => this.decodeResist(c)),
      ailments: (d.ailments || []).map((c: number) => this.decodeResist(c)),
      skills: Object.entries(d.skills as { [s: string]: number })
        .map(([s, l]) => ({ name: s, level: l, label: levelToString(l, this.cfg.family) }))
        .sort((a, b) => (a.level < 2 ? a.level : a.level > 120 ? 9000 + a.level : a.level) - (b.level < 2 ? b.level : b.level > 120 ? 9000 + b.level : b.level)),
      affinities: d.affinities || [],
      inherit: raw.inherits || raw.inherit || '',
      fusion: d.fusion,
      prereq: d.prereq || '',
      align: d.align || '',
      isElement: !!this.comp.isElementDemon(name)
    };
    this.demonCache.set(name, view);
    return view;
  }

  skill(name: string): SkillView | undefined {
    const hit = this.skillCache.get(name);
    if (hit) { return hit; }
    const s = this.comp.getSkill(name);
    if (!s) { return undefined; }
    const view: SkillView = {
      name,
      element: s.element,
      cost: costToString(s.cost),
      effect: s.effect || '',
      target: s.target || '',
      rank: s.rank,
      inheritable: s.rank < 90 && s.element !== 'inn' && s.inherit !== 'non',
      inherit: s.inherit || s.element,
      learnedBy: (s.learnedBy || []).map((l: any) => ({ demon: l.demon, level: l.level, label: levelToString(l.level, this.cfg.family) }))
    };
    this.skillCache.set(name, view);
    return view;
  }

  skillNames(): string[] {
    return this.comp.allSkills.map((s: any) => s.name).filter((n: string) => {
      const s = this.comp.getSkill(n);
      return s.learnedBy.some((l: any) => { const d = this.comp.getDemon(l.demon); return d && !d.isEnemy && d.fusion !== 'party'; });
    });
  }

  /** Every pair of ingredients that produces `name`. */
  reverse(name: string): { a: string; b: string }[] {
    if (!this.comp.getDemon(name)) { return []; }
    const special = this.comp.getSpecialNameEntries(name);
    if (special.length > 0) { return []; }
    const seen = new Set<string>();
    const out: { a: string; b: string }[] = [];
    for (const p of this.cfg.fissionCalc.getFusions(name, this.comp, this.cfg.chart)) {
      if (!this.usable(p.name1) || !this.usable(p.name2)) { continue; }
      const key = [p.name1, p.name2].sort().join('|');
      if (seen.has(key)) { continue; }
      seen.add(key);
      out.push({ a: p.name1, b: p.name2 });
    }
    return out;
  }

  /** Every trio of ingredients that produces `name` (empty when the game has no triple fusion). */
  reverseTriple(name: string): string[][] {
    if (!this.cfg.triFissionCalc || !this.comp.getDemon(name) || this.special(name).length > 1) { return []; }
    const seen = new Set<string>();
    const out: string[][] = [];
    for (const t of this.cfg.triFissionCalc.getFusions(name, this.comp, this.cfg.squareChart)) {
      const trio = [t.name1, t.name2, t.name3];
      if (!trio.every(n => this.usable(n))) { continue; }
      const key = trio.slice().sort().join('|');
      if (seen.has(key)) { continue; }
      seen.add(key);
      out.push(trio);
    }
    return out;
  }

  /** Ingredients for special (fixed) recipes, empty when the demon is fused normally. */
  special(name: string): string[] {
    return this.comp.getSpecialNameEntries(name) || [];
  }

  /** What `name` becomes when fused with every other demon. */
  forward(name: string): { other: string; result: string }[] {
    if (!this.comp.getDemon(name)) { return []; }
    const out: { other: string; result: string }[] = [];
    for (const p of this.cfg.fusionCalc.getFusions(name, this.comp, this.cfg.chart)) {
      if (!this.usable(p.name1) || !this.usable(p.name2)) { continue; }
      out.push({ other: p.name1, result: p.name2 });
    }
    return out;
  }
}
