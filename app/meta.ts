export const ELEM_LABEL: { [k: string]: string } = {
  phy: 'Phys', fir: 'Fire', ice: 'Ice', ele: 'Elec', for: 'Force', win: 'Wind', lig: 'Light', dar: 'Dark',
  alm: 'Almighty', ail: 'Ailment', rec: 'Recovery', sup: 'Support', spe: 'Special', pas: 'Passive', inn: 'Innate',
  sla: 'Slash', str: 'Strike', pie: 'Pierce', gun: 'Gun', psy: 'Psy', nuk: 'Nuke', ble: 'Bless', cur: 'Curse',
  tra: 'Trait', mis: 'Misc', non: 'None',
  exp: 'Expel', dea: 'Death', min: 'Mind', ner: 'Nerve', mys: 'Mystic', rui: 'Ruin', sab: 'Sabbath', lif: 'Life',
  man: 'Mana', inv: 'Invitation', rac: 'Racial', thr: 'Thrust', cla: 'Claw', bit: 'Bite', wea: 'Weapon', mou: 'Mouth',
  eye: 'Eye', tal: 'Talk', mai: 'Maiden', alp: 'Alpha', aut: 'Auto', com: 'Command', oth: 'Other'
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
export const GAMES = [
  { id: 'smt3', name: 'SMT III: Nocturne', short: 'Nocturne', series: 'Shin Megami Tensei', ...SMT },
  { id: 'smtdsj', name: 'Strange Journey Redux', short: 'SJR', series: 'Shin Megami Tensei', ...SMT },
  { id: 'smt4', name: 'SMT IV', short: 'SMT IV', series: 'Shin Megami Tensei', ...SMT },
  { id: 'smt4f', name: 'SMT IV: Apocalypse', short: 'SMT IVA', series: 'Shin Megami Tensei', ...SMT },
  { id: 'smt5v', name: 'SMT V: Vengeance', short: 'SMT V', series: 'Shin Megami Tensei', ...SMT },
  { id: 'p3r', name: 'Persona 3 Reload', short: 'P3R', series: 'Persona', ...PER },
  { id: 'p5', name: 'Persona 5', short: 'P5', series: 'Persona', ...PER },
  { id: 'p5r', name: 'Persona 5 Royal', short: 'P5R', series: 'Persona', ...PER },
  { id: 'p5t', name: 'Persona 5 Tactica', short: 'P5T', series: 'Persona', ...PER },
  { id: 'krao', name: 'Raidou Kuzunoha vs. King Abaddon', short: 'Raidou 2', series: 'Devil Summoner', ...SMT },
  { id: 'sh2', name: 'Soul Hackers 2', short: 'SH2', series: 'Devil Summoner', ...SMT },
  { id: 'rrch', name: 'Raidou Remastered: The Mystery of the Soulless Army', short: 'Raidou R', series: 'Devil Summoner', ...SMT },
  { id: 'dso', name: 'Devil Survivor Overclocked', short: 'DeSu OC', series: 'Devil Survivor', ...SMT },
  { id: 'ds2br', name: 'Devil Survivor 2: Record Breaker', short: 'DeSu 2 RB', series: 'Devil Survivor', ...SMT },
];

export const AFFINITY_ELEMS_SMT = ['phy', 'fir', 'ice', 'ele', 'for', 'lig', 'dar', 'alm', 'ail', 'rec', 'sup'];

export function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
}

// Element icons from aqiu384's elem-sprites.svg (public domain), shown one at a time via #id.
// Maps copied from their smt4f / pq2 compendium.component.css.
const SMT_ICON: { [k: string]: string } = {
  thr: 'phy', phy: 'phy', cla: 'gun', bit: 'ear', wea: 'swo', gun: 'gun', fir: 'fir', ice: 'ice', ele: 'ele', for: 'for',
  win: 'win', eye: 'per-alm', exp: 'lig', lig: 'lig', dea: 'smt-dar', mys: 'smt-dar', rui: 'smt-dar', dar: 'smt-dar',
  ail: 'per-dar', min: 'per-dar', cur: 'poison', ner: 'paralyze', rec: 'smt-rec', alp: 'smt-alm', alm: 'smt-alm',
  com: 'smt-sup', sup: 'smt-sup', pas: 'smt-pas', sab: 'smt-sab', aut: 'smt-inn', rac: 'smt-inn', inv: 'smt-inn',
  tal: 'smt-inn', inn: 'smt-inn', oth: 'smt-spe', spe: 'smt-spe',
};
const PER_ICON: { [k: string]: string } = {
  cut: 'swo', sla: 'swo', phy: 'phy', bas: 'phy', str: 'phy', gun: 'gun', sta: 'gun', pie: 'gun', fir: 'fir', ice: 'ice',
  ele: 'ele', win: 'win', for: 'for', psy: 'psy', nuk: 'nuk', ble: 'lig', lig: 'lig', cur: 'per-dar', dar: 'per-dar',
  ail: 'per-ail', rec: 'per-rec', alm: 'per-alm', spa: 'per-tra', spb: 'per-tra', tra: 'per-tra', nav: 'per-tra',
  spe: 'per-tra', sup: 'per-sup', pas: 'per-pas',
};
export function iconUrl(family: string, elem: string) {
  const id = (family === 'persona' ? PER_ICON : SMT_ICON)[elem];
  return id ? 'elem-sprites.svg#' + id : '';
}

export const COMING_SOON = ['Persona 3 FES / Portable', 'Persona 4 Golden', 'Persona Q', 'SMT I and II', 'SMT if...'];
