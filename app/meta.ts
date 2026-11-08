export const ELEM_LABEL: { [k: string]: string } = {
  phy: 'Phys', fir: 'Fire', ice: 'Ice', ele: 'Elec', for: 'Force', win: 'Wind', lig: 'Light', dar: 'Dark',
  alm: 'Almighty', ail: 'Ailment', rec: 'Recovery', sup: 'Support', spe: 'Special', pas: 'Passive', inn: 'Innate',
  sla: 'Slash', str: 'Strike', pie: 'Pierce', gun: 'Gun', psy: 'Psy', nuk: 'Nuke', ble: 'Bless', cur: 'Curse',
  tra: 'Trait', mis: 'Misc', non: 'None',
  exp: 'Expel', dea: 'Death', min: 'Mind', ner: 'Nerve', mys: 'Mystic', rui: 'Ruin', sab: 'Sabbath', lif: 'Life',
  man: 'Mana', inv: 'Invitation', rac: 'Racial', thr: 'Thrust', cla: 'Claw', bit: 'Bite', wea: 'Weapon', mou: 'Mouth',
  eye: 'Eye', tal: 'Talk', mai: 'Maiden', alp: 'Alpha', aut: 'Auto', com: 'Command', oth: 'Other',
  s1h: '1H Sword', s2h: '2H Sword', spr: 'Spear', axe: 'Axe', whi: 'Whip', arr: 'Arrow', fis: 'Fist', hgn: 'Handgun',
  agn: 'Auto Gun', sgn: 'Shotgun', rif: 'Rifle', hav: 'Havoc', tec: 'Tech', rus: 'Rush', wat: 'Water', ear: 'Earth',
  bla: 'Blast', gra: 'Gravity', mir: 'Miracle', occ: 'Occult', pra: 'Prayer', cut: 'Cut', bas: 'Bash', sta: 'Stab', nav: 'Navi'
};

export const ELEM_SHORT: { [k: string]: string } = {
  phy: 'Phy', fir: 'Fir', ice: 'Ice', ele: 'Ele', for: 'For', win: 'Win', lig: 'Lig', dar: 'Drk',
  sla: 'Sla', str: 'Str', pie: 'Pie', gun: 'Gun', psy: 'Psy', nuk: 'Nuk', ble: 'Bls', cur: 'Crs',
  alm: 'Alm', ail: 'Ail', rec: 'Rec', sup: 'Sup', pas: 'Pas',
  exp: 'Exp', dea: 'Dea', min: 'Min', ner: 'Ner', mys: 'Mys', rui: 'Rui', sab: 'Sab'
};

export const RESIST_LABEL: { [k: string]: string } = { wk: 'Wk', '-': '-', rs: 'Rs', nu: 'Nu', rp: 'Rp', dr: 'Dr' };
export const RESIST_LONG: { [k: string]: string } = { wk: 'Weak', '-': 'Neutral', rs: 'Resist', nu: 'Null', rp: 'Repel', dr: 'Drain' };
export const RESIST_RANK: { [k: string]: number } = { wk: 0, '-': 1, rs: 2, nu: 3, rp: 4, dr: 4 };

const SMT = { unit: 'demon', units: 'demons', kind: 'Race' };
const PER = { unit: 'persona', units: 'personas', kind: 'Arcana' };
const FIXED = { noPlanner: true }; // fixed skill sets, no inheritance to plan
export const GAMES: { id: string; name: string; short: string; series: string; unit: string; units: string; kind: string; noPlanner?: boolean }[] = [
  { id: 'smt1', name: 'Shin Megami Tensei', short: 'SMT', series: 'Shin Megami Tensei', ...SMT, ...FIXED },
  { id: 'smt2', name: 'Shin Megami Tensei II', short: 'SMT II', series: 'Shin Megami Tensei', ...SMT, ...FIXED },
  { id: 'smtif', name: 'Shin Megami Tensei if...', short: 'SMT if', series: 'Shin Megami Tensei', ...SMT, ...FIXED },
  { id: 'smt9', name: 'Shin Megami Tensei NINE', short: 'NINE', series: 'Shin Megami Tensei', ...SMT, ...FIXED },
  { id: 'smt3', name: 'SMT III: Nocturne', short: 'Nocturne', series: 'Shin Megami Tensei', ...SMT },
  { id: 'smtim', name: 'Shin Megami Tensei IMAGINE', short: 'IMAGINE', series: 'Shin Megami Tensei', ...SMT, ...FIXED },
  { id: 'smtsj', name: 'Strange Journey', short: 'SJ', series: 'Shin Megami Tensei', ...SMT },
  { id: 'smtdsj', name: 'Strange Journey Redux', short: 'SJR', series: 'Shin Megami Tensei', ...SMT },
  { id: 'smt4', name: 'SMT IV', short: 'SMT IV', series: 'Shin Megami Tensei', ...SMT },
  { id: 'smt4f', name: 'SMT IV: Apocalypse', short: 'SMT IVA', series: 'Shin Megami Tensei', ...SMT },
  { id: 'smt5', name: 'SMT V', short: 'SMT V', series: 'Shin Megami Tensei', ...SMT },
  { id: 'smt5v', name: 'SMT V: Vengeance', short: 'SMT V Vengeance', series: 'Shin Megami Tensei', ...SMT },
  { id: 'p1', name: 'Revelations: Persona', short: 'P1', series: 'Persona', ...PER, ...FIXED },
  { id: 'p2t', name: 'Persona 2: Innocent Sin', short: 'P2 IS', series: 'Persona', ...PER, ...FIXED },
  { id: 'p2b', name: 'Persona 2: Eternal Punishment', short: 'P2 EP', series: 'Persona', ...PER, ...FIXED },
  { id: 'p3', name: 'Persona 3', short: 'P3', series: 'Persona', ...PER },
  { id: 'p3f', name: 'Persona 3 FES', short: 'P3 FES', series: 'Persona', ...PER },
  { id: 'p3a', name: 'Persona 3 FES: The Answer', short: 'P3 Answer', series: 'Persona', ...PER },
  { id: 'p3p', name: 'Persona 3 Portable', short: 'P3P', series: 'Persona', ...PER },
  { id: 'p3r', name: 'Persona 3 Reload', short: 'P3R', series: 'Persona', ...PER },
  { id: 'p4', name: 'Persona 4', short: 'P4', series: 'Persona', ...PER },
  { id: 'p4g', name: 'Persona 4 Golden', short: 'P4G', series: 'Persona', ...PER },
  { id: 'p5', name: 'Persona 5', short: 'P5', series: 'Persona', ...PER },
  { id: 'p5r', name: 'Persona 5 Royal', short: 'P5R', series: 'Persona', ...PER },
  { id: 'p5s', name: 'Persona 5 Strikers', short: 'P5S', series: 'Persona', ...PER, ...FIXED },
  { id: 'p5t', name: 'Persona 5 Tactica', short: 'P5T', series: 'Persona', ...PER },
  { id: 'pq', name: 'Persona Q: Shadow of the Labyrinth', short: 'PQ', series: 'Persona', ...PER },
  { id: 'pq2', name: 'Persona Q2: New Cinema Labyrinth', short: 'PQ2', series: 'Persona', ...PER },
  { id: 'dsum', name: 'SMT: Devil Summoner', short: 'Devil Summoner', series: 'Devil Summoner', ...SMT, ...FIXED },
  { id: 'dssh', name: 'Devil Summoner: Soul Hackers', short: 'Soul Hackers', series: 'Devil Summoner', ...SMT, ...FIXED },
  { id: 'krch', name: 'Raidou Kuzunoha vs. The Soulless Army', short: 'Raidou 1', series: 'Devil Summoner', ...SMT },
  { id: 'krao', name: 'Raidou Kuzunoha vs. King Abaddon', short: 'Raidou 2', series: 'Devil Summoner', ...SMT },
  { id: 'sh2', name: 'Soul Hackers 2', short: 'SH2', series: 'Devil Summoner', ...SMT },
  { id: 'rrch', name: 'Raidou Remastered: The Mystery of the Soulless Army', short: 'Raidou R', series: 'Devil Summoner', ...SMT },
  { id: 'ds1', name: 'Devil Survivor', short: 'DeSu', series: 'Devil Survivor', ...SMT },
  { id: 'dso', name: 'Devil Survivor Overclocked', short: 'DeSu OC', series: 'Devil Survivor', ...SMT },
  { id: 'ds2', name: 'Devil Survivor 2', short: 'DeSu 2', series: 'Devil Survivor', ...SMT },
  { id: 'ds2br', name: 'Devil Survivor 2: Record Breaker', short: 'DeSu 2 RB', series: 'Devil Survivor', ...SMT },
  { id: 'kmt1', name: 'Kyuuyaku Megami Tensei', short: 'Kyuuyaku', series: 'Other', ...SMT, ...FIXED },
  { id: 'mjn1', name: 'Majin Tensei', short: 'Majin Tensei', series: 'Other', ...SMT, ...FIXED },
  { id: 'mjn2', name: 'Majin Tensei II: Spiral Nemesis', short: 'Majin Tensei II', series: 'Other', ...SMT, ...FIXED },
];

export const AFFINITY_ELEMS_SMT = ['phy', 'fir', 'ice', 'ele', 'for', 'lig', 'dar', 'alm', 'ail', 'rec', 'sup'];

export function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
}

// Element icons from aqiu384's elem-sprites.svg (public domain), shown one at a time via #id.
// Maps copied from their smt4f / pq2 compendium.component.css.
// 'w:' ids come from weapon-sprites.svg, the rest from elem-sprites.svg (both aqiu384, public domain).
const SMT_ICON: { [k: string]: string } = {
  thr: 'phy', phy: 'phy', cla: 'gun', bit: 'ear', wea: 'swo', mou: 'w:rus', gun: 'gun', fir: 'fir', ice: 'ice', ele: 'ele',
  for: 'for', win: 'win', eye: 'per-alm', exp: 'lig', lig: 'lig', dea: 'smt-dar', mys: 'smt-dar', rui: 'smt-dar', dar: 'smt-dar',
  ail: 'per-dar', min: 'per-dar', cur: 'poison', ner: 'paralyze', rec: 'smt-rec', alp: 'smt-alm', alm: 'smt-alm',
  com: 'smt-sup', sup: 'smt-sup', pas: 'smt-pas', sab: 'smt-sab', aut: 'smt-inn', rac: 'smt-inn', inv: 'smt-inn',
  tal: 'smt-inn', inn: 'smt-inn', oth: 'smt-spe', spe: 'smt-spe', mai: 'w:whi',
};
const PER_ICON: { [k: string]: string } = {
  cut: 'swo', sla: 'swo', phy: 'phy', bas: 'phy', str: 'phy', gun: 'gun', sta: 'gun', pie: 'gun', fir: 'fir', ice: 'ice',
  ele: 'ele', win: 'win', for: 'for', psy: 'psy', nuk: 'nuk', ble: 'lig', lig: 'lig', cur: 'per-dar', dar: 'per-dar',
  ail: 'per-ail', rec: 'per-rec', alm: 'per-alm', spa: 'per-tra', spb: 'per-tra', tra: 'per-tra', nav: 'per-tra',
  spe: 'per-tra', sup: 'per-sup', pas: 'per-pas',
};
// smt1 wiring (SMT I/II/if/NINE/IMAGINE, Devil Summoner, Soul Hackers, Majin Tensei, Kyuuyaku)
const NES_ICON: { [k: string]: string } = {
  i0: 'smt-pas', sword: 'swo', gun: 'gun', fire: 'fir', ice: 'ice', elec: 'ele', force: 'win', nerve: 'per-dar',
  almighty: 'smt-alm', expel: 'lig', death: 'smt-dar', curse: 'poison', bind: 'paralyze', rush: 'phy', punch: 'swo',
  kick: 'gun', flying: 'gun', energy: 'smt-alm', recovery: 'smt-rec', support: 'smt-sup', special: 'smt-spe', attack: 'phy',
  tech: 'gun', slash: 'swo', charge: 'gun', blunt: 'phy', handgun: 'gun', penetrate: 'gun', spread: 'phy', mystic: 'poison',
  mind: 'paralyze', suicide: 'smt-alm', passive: 'smt-pas', defend: 'smt-spe', phys: 'phy', gro: 'swo', air: 'gun',
  fir: 'fir', ele: 'ele', for: 'win', gig: 'paralyze', alm: 'smt-alm', lig: 'lig', dar: 'smt-dar', phy: 'phy', ail: 'per-dar',
  rec: 'smt-rec', sup: 'smt-sup', psy: 'per-dar', spear: 'gun', thrown: 'phy', ailment: 'per-dar', quad: 'smt-dar',
  elem: 'smt-spe', none: 'smt-spe', strike: 'phy', skill: 'gun', temp: 'nuk', dark: 'smt-dar', witch: 'per-dar',
  element: 'smt-spe', hero: 'smt-spe', starter: 'smt-spe', autorec: 'smt-spe', phase: 'smt-spe', explore: 'smt-spe',
  area: 'smt-spe', plugin: 'smt-spe', self: 'smt-spe', universe: 'smt-spe',
};
// p1 wiring (Persona 1, Persona 2 IS/EP)
const MIB_ICON: { [k: string]: string } = {
  s1h: 'swo', sla: 'w:s2h', s2h: 'w:s2h', spr: 'w:spr', axe: 'w:axe', whi: 'w:whi', thr: 'w:thr', arr: 'w:arr',
  str: 'w:fis', fis: 'w:fis', hgn: 'w:han', agn: 'w:aut', sgn: 'w:sho', gun: 'w:rif', rif: 'w:rif', hav: 'phy', tec: 'phy',
  rus: 'w:rus', fir: 'fir', ice: 'ice', wat: 'wat', win: 'win', ear: 'ear', ele: 'ele', nuk: 'nuk', bla: 'for', gra: 'psy',
  lig: 'lig', exp: 'lig', mir: 'smt-alm', dar: 'smt-dar', dea: 'smt-dar', cur: 'paralyze', min: 'panic', ner: 'per-ail',
  ail: 'per-dar', occ: 'per-dar', rec: 'per-rec', ble: 'per-rec', sup: 'per-sup', pra: 'per-sup', spe: 'per-alm', alm: 'per-alm',
};
const ICON_SETS: { [set: string]: { [k: string]: string } } = { smt: SMT_ICON, persona: PER_ICON, nes: NES_ICON, mib: MIB_ICON };
export function iconUrl(set: string, elem: string) {
  const id = (ICON_SETS[set] || SMT_ICON)[elem];
  return !id ? '' : id.startsWith('w:') ? 'weapon-sprites.svg#' + id.slice(2) : 'elem-sprites.svg#' + id;
}

export const COMING_SOON: string[] = [];
