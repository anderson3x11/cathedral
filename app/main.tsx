import { h, render, Fragment } from 'preact';
import { useState, useEffect, useMemo, useRef, useCallback } from 'preact/hooks';
import { ELEM_LABEL, ELEM_SHORT, RESIST_LABEL, RESIST_LONG, RESIST_RANK, GAMES, COMING_SOON, iconUrl, slugify, partyShape } from './meta';
import { planSkills, maskToSkills, PlanNode, PlanResult } from './planner';
import { demonArt, Art } from './art';
import { SHEETS } from './sheets';

type Eng = any;
declare const __BUILD__: string;

// ---------- storage (best effort) ----------
const store = {
  get(key: string, fallback: any) {
    try { const v = localStorage.getItem('cathedral:' + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key: string, value: any) {
    try { localStorage.setItem('cathedral:' + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
  del(key: string) {
    try { localStorage.removeItem('cathedral:' + key); } catch { /* storage unavailable */ }
  }
};

// ---------- engine loading ----------
const engines: { [id: string]: Promise<Eng> } = {};
function loadGame(id: string): Promise<Eng> {
  if (!engines[id]) {
    engines[id] = new Promise((resolve, reject) => {
      const w = window as any;
      const ready = () => {
        const eng = w.MegatenGames[id]();
        const saved = store.get(id + ':unlocks', null);
        if (saved) { eng.setToggles(saved); }
        indexEngine(eng);
        resolve(eng);
      };
      if (w.MegatenGames && w.MegatenGames[id]) { ready(); return; }
      const s = document.createElement('script');
      s.src = `games/${id}.js?v=${__BUILD__}`; // new build, new URL: no stale game data after an update
      s.onload = ready;
      s.onerror = () => { delete engines[id]; s.remove(); reject(new Error('Could not load the game data')); };
      document.head.appendChild(s);
    });
  }
  return engines[id];
}

function indexEngine(eng: Eng) {
  const bySlug: { [s: string]: string } = {};
  const slugOf: { [n: string]: string } = {};
  for (const n of eng.demonNames()) { let s = slugify(n); while (bySlug[s]) { s += '-x'; } bySlug[s] = n; slugOf[n] = s; }
  const skillBySlug: { [s: string]: string } = {};
  const skillSlug: { [n: string]: string } = {};
  for (const n of eng.skillNames()) { let s = slugify(n); while (skillBySlug[s]) { s += '-x'; } skillBySlug[s] = n; skillSlug[n] = s; }
  const demons = eng.demonNames().map((n: string) => eng.demon(n));
  const statMax = (eng.cfg.baseStats as string[]).map((_, i) => Math.max(1, ...demons.map((d: any) => d.stats[i] || 0)));
  eng.ix = { bySlug, slugOf, skillBySlug, skillSlug, demons, statMax };
}

// ---------- owned demons ----------
function useOwned(game: string): [string[], (o: string[]) => void] {
  const [owned, set] = useState<string[]>(() => store.get(game + ':owned', []));
  return [owned, (o: string[]) => { set(o); store.set(game + ':owned', o); }];
}

// ---------- party model ----------
// A member is a demon plus what the player changed in their playthrough: the skills it really has,
// resistances from items or passives, stat boosts. `reserve` = waiting outside the battle party.
interface Member { name: string; reserve?: boolean; skills?: string[]; resists?: { [elem: string]: string }; stats?: number[] }
const RESIST_CODES = ['wk', '-', 'rs', 'nu', 'rp', 'dr'];
const MAX_MEMBERS = 24;
function normParty(raw: any): Member[] {
  return (Array.isArray(raw) ? raw : []).map((x: any) => typeof x === 'string' ? { name: x } : x).filter((x: any) => x && x.name);
}
function activeSlots(id: string): number { return store.get(id + ':activeSlots', partyShape(id).active); }
// Anyone past the battle slots goes to reserve. Persona games have a single stock, no reserve.
function fitParty(p: Member[], id: string): Member[] {
  if (partyShape(id).persona) { return p.map(m => m.reserve ? { ...m, reserve: false } : m); }
  const slots = activeSlots(id);
  let n = 0;
  return p.map(m => { if (m.reserve) { return m; } n++; return n > slots ? { ...m, reserve: true } : m; });
}
// Adds a demon (or replaces the same demon, keeping its place); returns the party unchanged when full.
function addMember(p: Member[], m: Member, id: string): Member[] {
  const i = p.findIndex(x => x.name === m.name);
  if (i >= 0) { const out = p.slice(); out[i] = { ...m, reserve: p[i].reserve }; return out; }
  const shape = partyShape(id);
  if (p.length >= (shape.persona ? activeSlots(id) : MAX_MEMBERS)) { return p; }
  return fitParty(p.concat([{ ...m, reserve: false }]), id);
}
// The member as it is in the player's game: defaults with their changes applied.
function memberView(eng: Eng, m: Member) {
  const d = eng.demon(m.name);
  if (!d) { return null; }
  const elems: string[] = eng.cfg.resistElems;
  return {
    m, d,
    resists: elems.map((e, i) => (m.resists && m.resists[e]) || d.resists[i]) as string[],
    skills: (m.skills || d.skills.map((x: any) => x.name)) as string[],
    custom: !!(m.skills || m.stats || (m.resists && Object.keys(m.resists).length)),
  };
}
const capFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// ---------- theme ----------
// '' follows the system setting; 'light' / 'dark' override it (tokens in style.css key off data-theme).
const THEMES = ['', 'light', 'dark'];
function applyTheme(t: string) { if (t) { document.documentElement.dataset.theme = t; } else { delete document.documentElement.dataset.theme; } }
applyTheme(store.get('theme', ''));
const THEME_LABEL: { [t: string]: string } = { '': 'System', light: 'Light', dark: 'Dark' };
function ThemeIcon({ t }: { t: string }) {
  if (t === 'light') {
    return <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="currentColor" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>;
  }
  if (t === 'dark') { return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 10.2A6 6 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7z" fill="currentColor" /></svg>; }
  return <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor" /></svg>;
}
function ThemeButton() {
  const [t, setT] = useState<string>(() => store.get('theme', ''));
  const next = THEMES[(THEMES.indexOf(t) + 1) % THEMES.length];
  const tip = `Theme: ${THEME_LABEL[t]}. Switch to ${THEME_LABEL[next]}.`;
  return <button class="theme-btn" title={tip} aria-label={tip}
    onClick={() => { setT(next); store.set('theme', next); applyTheme(next); }}><ThemeIcon t={t} /></button>;
}

// ---------- routing ----------
interface Route { game: string; view: string; arg?: string }
const GAME_RE = new RegExp(`^(${GAMES.map(g => g.id).join('|')})(?:-(d|s|p)-(.+)|-(skills|planner|party|unlocks|chart|playthrough))?$`);
function parseHash(): Route {
  const raw = decodeURIComponent(location.hash.replace(/^#/, ''));
  const m = raw.match(GAME_RE);
  if (!m) { return { game: '', view: 'home' }; }
  if (m[2] === 'd') { return { game: m[1], view: 'demon', arg: m[3] }; }
  if (m[2] === 's') { return { game: m[1], view: 'skill', arg: m[3] }; }
  if (m[2] === 'p') { return { game: m[1], view: 'party', arg: m[3] }; }
  return { game: m[1], view: m[4] || 'list' };
}
function href(r: Route) {
  if (r.view === 'home') { return '#home'; }
  if (r.view === 'party' && r.arg) { return `#${r.game}-p-${r.arg}`; }
  if (r.view === 'demon') { return `#${r.game}-d-${r.arg}`; }
  if (r.view === 'skill') { return `#${r.game}-s-${r.arg}`; }
  if (r.view === 'list') { return `#${r.game}`; }
  return `#${r.game}-${r.view}`;
}
const demonHref = (eng: Eng, name: string) => href({ game: eng.cfg.id, view: 'demon', arg: eng.ix.slugOf[name] || slugify(name) });
const skillHref = (eng: Eng, name: string) => href({ game: eng.cfg.id, view: 'skill', arg: eng.ix.skillSlug[name] || slugify(name) });

function gameMeta(id: string) { return GAMES.find(g => g.id === id) || GAMES[0]; }

// ---------- small pieces ----------
let curFamily = '';
function Elem({ e, long }: { e: string; long?: boolean }) {
  const src = iconUrl(curFamily, e);
  const label = ELEM_LABEL[e] || (e ? e.charAt(0).toUpperCase() + e.slice(1) : '');
  return <span class={`elem el-${e}`} title={label}>{src ? <img class="ei" src={src} alt="" /> : <i aria-hidden="true" />}<span class="el-t">{long ? label : (ELEM_SHORT[e] || label.slice(0, 3))}</span></span>;
}

function ResistCell({ code, blank }: { code: string; blank?: boolean }) {
  return <span class={`res r-${code === '-' ? 'n' : code}`} title={RESIST_LONG[code]}>{blank && code === '-' ? '' : RESIST_LABEL[code] || code}</span>;
}

function DemonLink({ eng, name, showLvl = true }: { eng: Eng; name: string; showLvl?: boolean }) {
  const d = eng.demon(name);
  if (!d) { return <span>{name}</span>; }
  return (
    <a class="dlink" href={demonHref(eng, name)}>
      {showLvl && <span class="lv">{d.lvl}</span>}
      <span class="nm">{name}</span>
      <span class="rc">{d.race}</span>
    </a>
  );
}

function FusionTag({ eng, d }: { eng: Eng; d: any }) {
  const special = eng.special(d.name);
  if (d.isElement) { return <span class="tag">{eng.cfg.family === 'smt' ? 'Element' : 'Treasure'}</span>; }
  if (special.length > 1) { return <span class="tag tag-acc">Special</span>; }
  if (d.fusion === 'accident') { return <span class="tag">No fusion</span>; }
  if (d.prereq) { return <span class="tag tag-lock" title={d.prereq}>Unlock</span>; }
  return null;
}

// ---------- inline pick lists (no dropdowns) ----------
// Search box with live results (nothing listed until you type); click a result to pick it.
function DemonList({ eng, exclude, onPick, id, placeholder }: { eng: Eng; exclude: string[]; onPick: (n: string) => void; id: string; placeholder: string }) {
  const [q, setQ] = useState('');
  const sorted = useMemo(() => eng.ix.demons.slice().sort((a: any, b: any) => a.lvl - b.lvl || a.name.localeCompare(b.name)), [eng]);
  const t = q.trim().toLowerCase();
  const rows = !t ? [] : sorted.filter((d: any) => !exclude.includes(d.name) && (d.name.toLowerCase().includes(t) || d.race.toLowerCase().includes(t)));
  return (
    <div class="pick">
      <input id={id} type="search" autocomplete="off" placeholder={placeholder} value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} />
      {t && <ul class="pick-list">
        {rows.map((d: any) => <li><button type="button" onClick={() => { onPick(d.name); setQ(''); }}><span class="lv">{d.lvl}</span><span class="pk-name">{d.name}</span><span class="pk-meta">{d.race}</span></button></li>)}
        {rows.length === 0 && <li class="pick-empty">Nothing matches.</li>}
      </ul>}
    </div>
  );
}

// Search box with live skill results (nothing listed until you type); click a result to add or remove it. `why` explains a skill that cannot be used.
function SkillPick({ eng, names, chosen, max, id, why, onToggle }: { eng: Eng; names: string[]; chosen: string[]; max: number; id: string; why?: (n: string) => string; onToggle: (n: string) => void }) {
  const [q, setQ] = useState('');
  const [el, setEl] = useState('');
  const all = useMemo(() => names.map(n => eng.skill(n)).filter(Boolean), [eng, names]);
  const elems = useMemo(() => Array.from(new Set(all.map((k: any) => k.element))) as string[], [all]);
  const t = q.trim().toLowerCase();
  const rows = !t ? [] : all.filter((k: any) => (!el || k.element === el) && (k.name.toLowerCase().includes(t) || k.effect.toLowerCase().includes(t)));
  const full = chosen.length >= max;
  return (
    <div class="pick">
      <div class="pick-tools">
        <input id={id} type="search" autocomplete="off" placeholder="Type a skill name or effect" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} />
        <select aria-label="Skill type" value={el} onChange={e => setEl((e.target as HTMLSelectElement).value)}>
          <option value="">All types</option>
          {elems.map(e => <option value={e}>{ELEM_LABEL[e] || capFirst(e)}</option>)}
        </select>
      </div>
      {t && <ul class="pick-list">
        {rows.map((k: any) => {
          const on = chosen.includes(k.name);
          const no = !on && why ? why(k.name) : '';
          return (
            <li><button type="button" class={on ? 'on' : no ? 'blocked' : ''} aria-pressed={on} disabled={!on && (full || !!no)} title={k.effect} onClick={() => { onToggle(k.name); setQ(''); }}>
              <Elem e={k.element} /><span class="pk-name">{k.name}</span><span class="pk-meta">{k.cost}</span>
              <span class="pk-sub">{no || k.effect}</span>
            </button></li>
          );
        })}
        {rows.length === 0 && <li class="pick-empty">No skill matches.</li>}
      </ul>}
    </div>
  );
}

// Sortable header cell. Keys in `ascFirst` sort A to Z / low to high on the first click, the others high to low.
type Sort = { k: string; dir: number };
function makeTh(sort: Sort, setSort: (f: (s: Sort) => Sort) => void, ascFirst: string[]) {
  return (k: string, label: any, cls = '') => {
    const on = sort.k === k;
    const asc = on && (sort.dir > 0) === ascFirst.includes(k);
    return (
      <th class={cls} aria-sort={on ? (asc ? 'ascending' : 'descending') : undefined}>
        <button class={on ? 'sortbtn on' : 'sortbtn'} title="Sort" onClick={() => setSort(s => ({ k, dir: s.k === k ? -s.dir : 1 }))}>{label}<span class="sortmark" aria-hidden="true">{on ? (asc ? '▲' : '▼') : '⇅'}</span></button>
      </th>
    );
  };
}

// ---------- compendium ----------
function Compendium({ eng }: { eng: Eng }) {
  const meta = gameMeta(eng.cfg.id);
  const [q, setQ] = useState('');
  const [race, setRace] = useState('');
  const [sort, setSort] = useState<{ k: string; dir: number }>({ k: 'lvl', dir: 1 });
  const resistElems: string[] = eng.cfg.resistElems;
  const statNames: string[] = eng.cfg.baseStats;
  const affElems: string[] = eng.cfg.affinityElems || [];
  const races: string[] = useMemo(() => {
    const present = new Set(eng.ix.demons.map((d: any) => d.race));
    return (eng.cfg.races as string[]).filter(r => present.has(r));
  }, [eng]);
  const raceOrder = useMemo(() => races.reduce((a: any, r, i) => { a[r] = i; return a; }, {}), [races]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = eng.ix.demons.filter((d: any) =>
      (!race || d.race === race) &&
      (!s || d.name.toLowerCase().includes(s) || d.race.toLowerCase().includes(s)));
    const k = sort.k;
    list = list.slice().sort((a: any, b: any) => {
      let c = 0;
      if (k === 'lvl') { c = a.lvl - b.lvl; }
      else if (k === 'name') { c = a.name.localeCompare(b.name); }
      else if (k === 'race') { c = raceOrder[a.race] - raceOrder[b.race] || a.lvl - b.lvl; }
      else if (k.startsWith('r')) { const i = +k.slice(1); c = RESIST_RANK[b.resists[i]] - RESIST_RANK[a.resists[i]] || a.lvl - b.lvl; }
      else if (k.startsWith('s')) { const i = +k.slice(1); c = (b.stats[i] || 0) - (a.stats[i] || 0); }
      else if (k.startsWith('a')) { const i = +k.slice(1); c = (b.affinities[i] || 0) - (a.affinities[i] || 0); }
      return c * sort.dir || a.lvl - b.lvl;
    });
    return list;
  }, [eng, q, race, sort, raceOrder]);

  // lvl, name, race sort ascending first; stats, resists, affinities sort highest first.
  const th = makeTh(sort, setSort, ['lvl', 'name', 'race']);

  return (
    <section class="view">
      <header class="view-head">
        <div>
          <h1>Compendium</h1>
        </div>
        <p class="count">{rows.length} of {eng.ix.demons.length} {meta.units}</p>
      </header>
      <div class="toolbar">
        <input id="comp-search" type="search" placeholder={`Search ${meta.units} or ${meta.kind.toLowerCase()}`} value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} />
        <select id="comp-race" value={race} onChange={e => setRace((e.target as HTMLSelectElement).value)} aria-label={meta.kind}>
          <option value="">All {meta.kind === 'Race' ? 'races' : 'arcana'}</option>
          {races.map(r => <option value={r}>{r}</option>)}
        </select>
      </div>
      <div class="tablewrap comp-wrap">
        <table class="grid comp">
          <thead>
            <tr class="groups">
              <th colSpan={3} class="g-id" />
              <th colSpan={statNames.length} class="g-start">Stats</th>
              <th colSpan={resistElems.length} class="g-start">Resistances</th>
              {affElems.length > 0 && <th colSpan={affElems.length} class="g-start">Affinities</th>}
            </tr>
            <tr>
              {th('lvl', 'Lv', 'num stick-lv')}
              {th('name', 'Name', 'stick-nm')}
              {th('race', meta.kind, 'racecol')}
              {statNames.map((l, i) => th('s' + i, l, 'num statcol' + (i === 0 ? ' g-start' : '')))}
              {resistElems.map((e, i) => th('r' + i, <Elem e={e} />, 'rescol' + (i === 0 ? ' g-start' : '')))}
              {affElems.map((e, i) => th('a' + i, <Elem e={e} />, 'rescol' + (i === 0 ? ' g-start' : '')))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d: any) => (
              <tr key={d.name} onClick={() => { location.hash = demonHref(eng, d.name); }}>
                <td class="num stick-lv">{d.lvl}</td>
                <td class="name stick-nm"><a href={demonHref(eng, d.name)} onClick={e => e.stopPropagation()}>{d.name}</a></td>
                <td class="muted racecol">{d.race}</td>
                {statNames.map((_, i) => <td class={'num statcol' + (i === 0 ? ' g-start' : '')}>{d.stats[i]}</td>)}
                {d.resists.map((r: string, i: number) => <td class={'rescol' + (i === 0 ? ' g-start' : '')}><ResistCell code={r} blank /></td>)}
                {affElems.map((_, i) => { const v = d.affinities[i] || 0; return <td class={'rescol aff' + (i === 0 ? ' g-start' : '') + (v > 0 ? ' up' : v < 0 ? ' down' : '')}>{v > 0 ? '+' + v : v < 0 ? v : ''}</td>; })}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p class="empty">Nothing matches “{q}”. Try a race name or part of a name.</p>}
      </div>
    </section>
  );
}

// ---------- demon page ----------
function Stats({ eng, d }: { eng: Eng; d: any }) {
  const labels: string[] = eng.cfg.baseStats;
  return (
    <dl class="stats">
      {labels.map((l, i) => (
        <div class="stat">
          <dt>{l}</dt>
          <dd><span class="bar"><span style={{ width: `${Math.round(100 * (d.stats[i] || 0) / eng.ix.statMax[i])}%` }} /></span><span class="v">{d.stats[i]}</span></dd>
        </div>
      ))}
    </dl>
  );
}

function ResistStrip({ elems, codes, title }: { elems: string[]; codes: string[]; title: string }) {
  return (
    <div class="strip">
      <h3>{title}</h3>
      <div class="strip-row" style={{ gridTemplateColumns: `repeat(${elems.length}, minmax(0, 1fr))` }}>
        {elems.map((e, i) => (
          <div class="strip-cell">
            <span class="strip-k">{ELEM_SHORT[e] || iconUrl(curFamily, e) ? <Elem e={e} /> : e}</span>
            <ResistCell code={codes[i] || '-'} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Potential({ eng, d }: { eng: Eng; d: any }) {
  const elems: string[] = eng.cfg.affinityElems || [];
  if (!d.affinities.length || !elems.length) { return null; }
  return (
    <div class="strip">
      <h3>Skill potential</h3>
      <div class="strip-row" style={{ gridTemplateColumns: `repeat(${elems.length}, minmax(0, 1fr))` }}>
        {elems.map((e, i) => {
          const v = d.affinities[i] || 0;
          return (
            <div class="strip-cell">
              <span class="strip-k"><Elem e={e} /></span>
              <span class={`pot ${v > 0 ? 'up' : v < 0 ? 'down' : ''}`}>{v > 0 ? '+' + v : v === 0 ? '0' : v}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Inheritance({ eng, d }: { eng: Eng; d: any }) {
  const elems: string[] = eng.cfg.inheritElems || [];
  if (!elems.length) { return null; }
  const blocked = elems.filter((_, i) => !(d.affinities[i] > 0));
  return (
    <div class="strip">
      <h3>Inheritance</h3>
      <p class="inherit-line">
        {blocked.length === 0 ? 'Can inherit every skill type.' : blocked.length === elems.length ? 'Cannot inherit skills.' : <Fragment>Cannot inherit {blocked.map((e, i) => <Fragment>{i > 0 && ' '}<Elem e={e} long /></Fragment>)}</Fragment>}
      </p>
    </div>
  );
}

function SkillTable({ eng, d }: { eng: Eng; d: any }) {
  return (
    <div class="tablewrap">
      <table class="grid skills">
        <thead><tr><th class="num">Lv</th><th>Skill</th><th>Type</th><th class="num">Cost</th><th>Effect</th></tr></thead>
        <tbody>
          {d.skills.map((k: any) => {
            const s = eng.skill(k.name);
            const label = eng.cfg.id === 'p3r' && /^T\d$/.test(k.label) ? 'Theurgy' : k.label;
            return (
              <tr>
                <td class="num lvcell">{label}</td>
                <td class="name">{s ? <a href={skillHref(eng, k.name)}>{k.name}</a> : k.name}<span class="sub-eff">{s?.effect}</span></td>
                <td>{s && <Elem e={s.element} />}</td>
                <td class="num">{s?.cost}</td>
                <td class="effect">{s?.effect}{s?.target && s.target !== 'Self' && s.cost !== 'Passive' ? <span class="target"> · {s.target}</span> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Recipes({ eng, d }: { eng: Eng; d: any }) {
  const [tab, setTab] = useState<'from' | 'into'>('from');
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const [allTri, setAllTri] = useState(false);
  useEffect(() => { setQ(''); setAll(false); setAllTri(false); }, [d.name]);
  const special = eng.special(d.name);
  const pairs = useMemo(() => eng.reverse(d.name).map((p: any) => {
    const a = eng.demon(p.a), b = eng.demon(p.b);
    const [x, y] = a.lvl <= b.lvl ? [a, b] : [b, a];
    return { x, y, hi: Math.max(a.lvl, b.lvl), sum: a.lvl + b.lvl };
  }).sort((p: any, r: any) => p.hi - r.hi || p.sum - r.sum), [eng, d.name, eng.rev]);
  const trios = useMemo(() => eng.reverseTriple(d.name).map((t: string[]) => {
    const ds = t.map(n => eng.demon(n)).sort((a: any, b: any) => a.lvl - b.lvl);
    return { ds, hi: ds[2].lvl, sum: ds[0].lvl + ds[1].lvl + ds[2].lvl };
  }).sort((p: any, r: any) => p.hi - r.hi || p.sum - r.sum), [eng, d.name, eng.rev]);
  const forward = useMemo(() => eng.forward(d.name).map((p: any) => ({ o: eng.demon(p.other), r: eng.demon(p.result) }))
    .filter((p: any) => p.o && p.r).sort((p: any, r: any) => p.r.lvl - r.r.lvl || p.o.lvl - r.o.lvl), [eng, d.name, eng.rev]);

  const s = q.trim().toLowerCase();
  const match = (x: any) => x.name.toLowerCase().includes(s) || x.race.toLowerCase().includes(s);
  const fromRows = pairs.filter((p: any) => !s || match(p.x) || match(p.y));
  const triRows = trios.filter((p: any) => !s || p.ds.some(match));
  const triShown = allTri ? triRows.slice(0, 1000) : triRows.slice(0, 20);
  const intoRows = forward.filter((p: any) => !s || match(p.o) || match(p.r));
  const rows = tab === 'from' ? fromRows : intoRows;
  const shown = all ? rows : rows.slice(0, 40);
  const unit = gameMeta(eng.cfg.id).unit;

  return (
    <section class="panel recipes">
      <div class="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'from'} class={tab === 'from' ? 'on' : ''} onClick={() => { setTab('from'); setAll(false); }}>
          Made from <span class="n">{special.length > 1 ? 1 : pairs.length + trios.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'into'} class={tab === 'into' ? 'on' : ''} onClick={() => { setTab('into'); setAll(false); }}>
          Fuses into <span class="n">{forward.length}</span>
        </button>
        <input id="recipe-filter" type="search" placeholder="Filter by name or race" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} />
      </div>

      {tab === 'from' && special.length > 1 && (
        <div class="special">
          <p>Special fusion. Fuse these {special.length} together:</p>
          <ul class="chips">{special.map((n: string) => <li><DemonLink eng={eng} name={n} /></li>)}</ul>
        </div>
      )}
      {tab === 'from' && special.length <= 1 && pairs.length === 0 && trios.length === 0 && (
        <p class="empty">{d.isElement ? `Elements come from fusing two ${unit}s of the same ${eng.cfg.family === 'smt' ? 'race' : 'arcana'}. See “Fuses into” on any of them.` : d.prereq ? `Not fusable with your current unlocks. ${d.prereq}.` : `This ${unit} cannot be fused. ${d.prereq || ''}`}</p>
      )}
      {tab === 'from' && special.length <= 1 && pairs.length > 0 && (
        <Fragment>
          <p class="hint">Sorted by the highest-level ingredient, so the easiest recipes come first.</p>
          {trios.length > 0 && <h3 class="rec-h">Two {unit}s</h3>}
          <div class="tablewrap">
            <table class="grid pairs">
              <thead><tr><th>Ingredient</th><th class="plus" aria-hidden="true" /><th>Ingredient</th><th class="num">Max Lv</th></tr></thead>
              <tbody>
                {shown.map((p: any) => (
                  <tr>
                    <td><DemonLink eng={eng} name={p.x.name} /></td>
                    <td class="plus" aria-hidden="true">×</td>
                    <td><DemonLink eng={eng} name={p.y.name} /></td>
                    <td class="num muted">{p.hi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Fragment>
      )}
      {tab === 'from' && rows.length > shown.length && <button class="more" onClick={() => setAll(true)}>Show all {rows.length}</button>}
      {tab === 'from' && special.length <= 1 && trios.length > 0 && (
        <Fragment>
          <h3 class="rec-h">Three {unit}s <span class="muted">(triple fusion)</span></h3>
          <div class="tablewrap">
            <table class="grid pairs trios">
              <thead><tr><th>Ingredient</th><th class="plus" aria-hidden="true" /><th>Ingredient</th><th class="plus" aria-hidden="true" /><th>Ingredient</th><th class="num">Max Lv</th></tr></thead>
              <tbody>
                {triShown.map((p: any) => (
                  <tr>
                    <td><DemonLink eng={eng} name={p.ds[0].name} /></td>
                    <td class="plus" aria-hidden="true">×</td>
                    <td><DemonLink eng={eng} name={p.ds[1].name} /></td>
                    <td class="plus" aria-hidden="true">×</td>
                    <td><DemonLink eng={eng} name={p.ds[2].name} /></td>
                    <td class="num muted">{p.hi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {triRows.length > triShown.length && (allTri
            ? <p class="hint">Showing the 1000 easiest of {triRows.length}. Use the filter to narrow it down.</p>
            : <button class="more" onClick={() => setAllTri(true)}>Show more ({triRows.length} in total)</button>)}
        </Fragment>
      )}
      {tab === 'into' && (
        forward.length === 0 ? <p class="empty">No normal fusions use this {unit}.</p> :
        <div class="tablewrap">
          <table class="grid pairs">
            <thead><tr><th>Fuse with</th><th class="plus" aria-hidden="true" /><th>Result</th></tr></thead>
            <tbody>
              {shown.map((p: any) => (
                <tr>
                  <td><DemonLink eng={eng} name={p.o.name} /></td>
                  <td class="plus" aria-hidden="true">→</td>
                  <td><DemonLink eng={eng} name={p.r.name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'into' && rows.length > shown.length && <button class="more" onClick={() => setAll(true)}>Show all {rows.length}</button>}
      {s && rows.length === 0 && triRows.length === 0 && <p class="empty">No recipe includes “{q}”.</p>}
    </section>
  );
}

function DemonPage({ eng, slug, party, setParty }: { eng: Eng; slug: string; party: Member[]; setParty: (p: Member[]) => void }) {
  const name = eng.ix.bySlug[slug];
  const d = name && eng.demon(name);
  const meta = gameMeta(eng.cfg.id);
  if (!d) { return <section class="view"><h1>Not found</h1><p class="empty">No {meta.unit} matches this link. <a href={href({ game: eng.cfg.id, view: 'list' })}>Back to the compendium</a>.</p></section>; }
  const inParty = party.some(m => m.name === d.name);
  const [owned, setOwned] = useOwned(eng.cfg.id);
  const isOwned = owned.includes(d.name);
  const align = d.align && d.align.startsWith('align-') ? alignLabel(d.align) : '';
  const ailments: string[] = eng.cfg.ailmentElems;
  return (
    <section class="view demon">
      <header class="demon-head">
        <div class="demon-title">
          <p class="eyebrow">Lv {d.lvl} <span class="sep">/</span> {d.race}{align && <Fragment> <span class="sep">/</span> {align}</Fragment>}</p>
          <h1>{d.name}</h1>
          <div class="badges"><FusionTag eng={eng} d={d} />{d.prereq && <span class="prereq">{d.prereq}</span>}</div>
        </div>
        <div class="actions">
          <button class={inParty ? 'btn' : 'btn primary'} onClick={() => setParty(inParty ? party.filter(m => m.name !== d.name) : addMember(party, { name: d.name }, eng.cfg.id))}>
            {inParty ? 'Remove from party' : 'Add to party'}
          </button>
          {!eng.cfg.noPlanner && <button class="btn" aria-pressed={isOwned} title="Owned demons are preferred by the skill planner"
            onClick={() => setOwned(isOwned ? owned.filter(n => n !== d.name) : owned.concat([d.name]))}>{isOwned ? 'Owned ✓' : 'Mark as owned'}</button>}
          {!eng.cfg.noPlanner && <a class="btn" href={`${href({ game: eng.cfg.id, view: 'planner' })}`} onClick={() => store.set(eng.cfg.id + ':planFor', d.name)}>Plan skills</a>}
        </div>
      </header>

      <div class="demon-grid">
        <div class="col">
          <DemonArt eng={eng} d={d} />
          <section class="panel"><h2>Stats</h2><Stats eng={eng} d={d} /></section>
        </div>
        <div class="col">
          <section class="panel">
            <ResistStrip title="Resistances" elems={eng.cfg.resistElems} codes={d.resists} />
            {d.ailments.some((a: string) => a !== '-') && <ResistStrip title="Ailments" elems={ailments} codes={d.ailments} />}
            <Potential eng={eng} d={d} />
            <Inheritance eng={eng} d={d} />
          </section>
          <section class="panel"><h2>Skills</h2><SkillTable eng={eng} d={d} /></section>
        </div>
      </div>
      <Recipes eng={eng} d={d} />
    </section>
  );
}

function DemonArt({ eng, d }: { eng: Eng; d: any }) {
  const [art, setArt] = useState<Art | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setArt(undefined);
    demonArt(eng.cfg.id, d.name).then(a => { if (live) { setArt(a); } });
    return () => { live = false; };
  }, [eng.cfg.id, d.name]);
  if (art === null) { return null; }
  return (
    <figure class="art">
      {art ? <img src={art.src} alt={`${d.name} artwork`} referrerpolicy="no-referrer" onError={() => setArt(null)} /> : <div class="art-wait" aria-hidden="true" />}
      {art && <figcaption><a href={art.page} target="_blank" rel="noopener">Art: Megami Tensei Wiki</a></figcaption>}
    </figure>
  );
}

function alignLabel(a: string) {
  const ld: any = { l: 'Light', n: 'Neutral', d: 'Dark' };
  const lc: any = { l: 'Law', n: 'Neutral', c: 'Chaos' };
  const code = a.replace('align-', '');
  const x = ld[code[0]], y = lc[code[1]];
  if (!x || !y) { return ''; }
  return x === 'Neutral' && y === 'Neutral' ? 'Neutral' : `${x}-${y}`;
}

// ---------- skills ----------
function SkillList({ eng }: { eng: Eng }) {
  const [q, setQ] = useState('');
  const [el, setEl] = useState('');
  const [sort, setSort] = useState<Sort>({ k: 'type', dir: 1 });
  const all = useMemo(() => eng.skillNames().map((n: string) => eng.skill(n)).filter(Boolean)
    .sort((a: any, b: any) => a.element.localeCompare(b.element) || a.rank - b.rank || a.name.localeCompare(b.name)), [eng]);
  const elems: string[] = useMemo(() => Array.from(new Set(all.map((s: any) => s.element))) as string[], [all]);
  const s = q.trim().toLowerCase();
  const found = all.filter((k: any) => (!el || k.element === el) && (!s || k.name.toLowerCase().includes(s) || k.effect.toLowerCase().includes(s)));
  // 'type' is the default order (type, then rank); costs without a number (Passive, Gauge...) go last.
  const costNum = (c: string) => { const m = /^\d+/.exec(c); return m ? +m[0] : Infinity; };
  const byCost = (a: any, b: any) => {
    const x = costNum(a.cost), y = costNum(b.cost);
    return x === y ? 0 : x === Infinity ? 1 : y === Infinity ? -1 : (x - y) * sort.dir; // no number: last both ways
  };
  const rows = sort.k === 'type' ? (sort.dir > 0 ? found : found.slice().reverse())
    : found.slice().sort(sort.k === 'name' ? (a: any, b: any) => a.name.localeCompare(b.name) * sort.dir : byCost);
  const th = makeTh(sort, setSort, ['type', 'name', 'cost']);
  const [n, setN] = useState(80);
  return (
    <section class="view">
      <header class="view-head"><div><h1>Skills</h1></div><p class="count">{rows.length} skills</p></header>
      <div class="toolbar">
        <input id="skill-search" type="search" placeholder="Search name or effect" value={q} onInput={e => { setQ((e.target as HTMLInputElement).value); setN(80); }} />
        <select id="skill-elem" value={el} onChange={e => { setEl((e.target as HTMLSelectElement).value); setN(80); }} aria-label="Type">
          <option value="">All types</option>
          {elems.map(e => <option value={e}>{ELEM_LABEL[e] || e}</option>)}
        </select>
      </div>
      <div class="tablewrap">
        <table class="grid skilllist">
          <thead><tr>{th('name', 'Skill')}{th('type', 'Type')}{th('cost', 'Cost', 'num')}<th>Effect</th><th>Learned by</th></tr></thead>
          <tbody>
            {rows.slice(0, n).map((k: any) => {
              const learners = k.learnedBy.filter((l: any) => eng.ix.slugOf[l.demon]);
              return (
                <tr>
                  <td class="name"><a href={skillHref(eng, k.name)}>{k.name}</a>{!k.inheritable && <span class="tag small" title="Cannot be inherited">Unique</span>}</td>
                  <td><Elem e={k.element} /></td>
                  <td class="num">{k.cost}</td>
                  <td class="effect">{k.effect}</td>
                  <td class="learners">{learners.slice(0, 3).map((l: any, i: number) => <Fragment>{i > 0 && ', '}<a href={demonHref(eng, l.demon)}>{l.demon}</a>{l.label !== 'Base' && <span class="muted"> ({l.label})</span>}</Fragment>)}{learners.length > 3 && <span class="muted"> +{learners.length - 3}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > n && <button class="more" onClick={() => setN(rows.length)}>Show all {rows.length}</button>}
    </section>
  );
}

function SkillPage({ eng, slug }: { eng: Eng; slug: string }) {
  const name = eng.ix.skillBySlug[slug];
  const k = name && eng.skill(name);
  if (!k) { return <section class="view"><h1>Not found</h1><p class="empty"><a href={href({ game: eng.cfg.id, view: 'skills' })}>Back to skills</a></p></section>; }
  const learners = k.learnedBy.filter((l: any) => eng.ix.slugOf[l.demon]).map((l: any) => ({ ...l, d: eng.demon(l.demon) }))
    .sort((a: any, b: any) => a.d.lvl - b.d.lvl);
  return (
    <section class="view">
      <header class="view-head">
        <div>
          <p class="eyebrow"><Elem e={k.element} long /> <span class="sep">/</span> {k.cost}{k.target && k.cost !== 'Passive' ? <Fragment> <span class="sep">/</span> {k.target}</Fragment> : null}</p>
          <h1>{k.name}</h1>
          <p class="lede">{k.effect || 'No effect text in the source data.'}</p>
          {!k.inheritable && <p class="note">Unique skill. It cannot be passed down through fusion.</p>}
        </div>
      </header>
      <section class="panel">
        <h2>Learned by</h2>
        {learners.length === 0 ? <p class="empty">No {gameMeta(eng.cfg.id).unit} learns this.</p> :
        <div class="tablewrap">
          <table class="grid">
            <thead><tr><th class="num">Lv</th><th>Name</th><th>{gameMeta(eng.cfg.id).kind}</th><th>Learns at</th></tr></thead>
            <tbody>
              {learners.map((l: any) => (
                <tr onClick={() => { location.hash = demonHref(eng, l.demon); }}>
                  <td class="num">{l.d.lvl}</td>
                  <td class="name"><a href={demonHref(eng, l.demon)} onClick={e => e.stopPropagation()}>{l.demon}</a></td>
                  <td class="muted">{l.d.race}</td>
                  <td>{l.label === 'Base' ? 'Starts with it' : /^\d+$/.test(l.label) ? `Lv ${l.label}` : l.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </section>
    </section>
  );
}

// ---------- planner ----------
function SkillChips({ eng, names }: { eng: Eng; names: string[] }) {
  return <span class="skchips">{names.map(n => <span class="skchip"><Elem e={eng.skill(n)?.element} />{n}</span>)}</span>;
}

// Flattens a plan tree into what the player does: demons to get first, then fusions in order.
function PlanSteps({ eng, plan, skills, owned }: { eng: Eng; plan: PlanNode; skills: string[]; owned: string[] }) {
  const leaves: PlanNode[] = [];
  const fusions: PlanNode[] = [];
  const walk = (n: PlanNode) => { if (!n.parents.length) { leaves.push(n); return; } n.parents.forEach(walk); fusions.push(n); };
  walk(plan);
  const learnAt = (n: PlanNode) => {
    const d = eng.demon(n.demon);
    return maskToSkills(n.native & n.mask, skills).map(s => {
      const k = d.skills.find((x: any) => x.name === s);
      return k && k.level >= 2 && k.level < 100 ? `${s} at Lv ${k.level}` : s;
    });
  };
  return (
    <Fragment>
      <div class="plan-get">
        <h4>Get these first</h4>
        <ul>
          {leaves.map(n => { const l = learnAt(n); return (
            <li><DemonLink eng={eng} name={n.demon} />{owned.includes(n.demon) && <span class="tag owned">owned</span>}<span class="why">{l.length ? l.map(x => x.includes(' at Lv ') ? `learns ${x}` : `knows ${x}`).join(', ') : 'any copy, no skill needed'}</span></li>
          ); })}
        </ul>
      </div>
      <ol class="plan-steps">
        {fusions.map((n, i) => {
          const inh = maskToSkills(n.inherited, skills);
          const lrn = learnAt(n);
          const last = i === fusions.length - 1;
          return (
            <li class={last ? 'final' : ''}>
              <div class="fuse">
                {n.parents.map((p, j) => <Fragment>{j > 0 && <span class="op">+</span>}<DemonLink eng={eng} name={p.demon} /></Fragment>)}
                <span class="op">=</span><DemonLink eng={eng} name={n.demon} />
              </div>
              {inh.length > 0 && <div class="pass">Pass down <SkillChips eng={eng} names={inh} /></div>}
              {lrn.length > 0 && <div class="pass">Then learns <span class="muted">{lrn.join(', ')}</span></div>}
            </li>
          );
        })}
      </ol>
    </Fragment>
  );
}

function Planner({ eng, party, setParty }: { eng: Eng; party: Member[]; setParty: (p: Member[]) => void }) {
  const id = eng.cfg.id;
  const meta = gameMeta(id);
  // The planner starts empty every time. "Plan skills" on a demon page hands over one demon, read once then dropped.
  const [target, setTarget] = useState<string>(() => {
    const handoff = store.get(id + ':planFor', '');
    store.del(id + ':planFor'); store.del(id + ':planTarget'); store.del(id + ':planSkills'); // older versions saved the last plan
    return handoff;
  });
  const [owned, setOwned] = useOwned(id);
  const [skills, setSkills] = useState<string[]>([]);
  const [depth, setDepth] = useState(2);
  const [cap, setCap] = useState(0);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(-1);
  const skillNames = useMemo(() => eng.skillNames().filter((n: string) => eng.skill(n)?.inheritable).sort(), [eng]);
  const td = target ? eng.demon(target) : null;
  const slots = eng.cfg.maxSkillSlots;
  const maxSkills = Math.min(8, slots);
  useEffect(() => { setResult(null); setAdded(-1); }, [target, skills.join('|')]);

  const run = () => {
    if (!target || skills.length === 0) { return; }
    setBusy(true);
    setTimeout(() => {
      // ponytail: owned demons only re-rank finished plans (fewest starting demons you lack first);
      // weight them inside the search if this proves too coarse.
      const r = planSkills(eng, target, skills, { maxDepth: depth, levelCap: cap || 99, limit: owned.length ? 20 : 6 });
      if (owned.length) {
        const lacking = (p: PlanNode): number => p.parents.length ? p.parents.reduce((a, c) => a + lacking(c), 0) : owned.includes(p.demon) ? 0 : 1;
        r.plans = r.plans.map((p, i) => ({ p, i, l: lacking(p) })).sort((a, b) => a.l - b.l || a.i - b.i).slice(0, 6).map(x => x.p);
      }
      setResult(r); setBusy(false); setAdded(-1);
    }, 30);
  };

  // Persona: the target's inheritance type rules out some skill types (unless it learns the skill itself).
  const cannot = (n: string) => {
    const k = eng.skill(n); const elems = eng.cfg.inheritElems;
    if (!td || !elems || !k) { return ''; }
    const i = elems.indexOf(k.inherit);
    return i >= 0 && !(td.affinities[i] > 0) && !td.skills.some((x: any) => x.name === n) ? `${target} cannot inherit this type` : '';
  };
  const blocked = skills.filter(n => cannot(n));
  const toggleSkill = (n: string) => setSkills(skills.includes(n) ? skills.filter(x => x !== n) : skills.concat([n]));
  // The finished demon joins the party with the planned skills plus the ones it starts with.
  const addToParty = (p: PlanNode, i: number) => {
    const base = td.skills.filter((k: any) => k.level < 2).map((k: any) => k.name);
    const got = maskToSkills(p.mask, result!.skills);
    setParty(addMember(party, { name: target, skills: Array.from(new Set(got.concat(base))).slice(0, slots) }, id));
    setAdded(i);
  };

  return (
    <section class="view">
      <header class="view-head"><div><h1>Skill planner</h1>
        <p class="lede">Pick the {meta.unit} you want and up to 8 skills it should end up with. The planner finds the shortest fusion chains where each skill is either passed down from an ingredient or learned by levelling.</p></div></header>
      <div class="planner-grid">
        <section class="panel plan-form">
          <div class="field">
            <label for="plan-target">{meta.unit === 'demon' ? 'Demon' : 'Persona'} you want</label>
            {td ? (
              <div class="picked"><DemonLink eng={eng} name={target} /><button class="x" aria-label="Pick another" onClick={() => setTarget('')}>Change</button></div>
            ) : (
              <DemonList eng={eng} id="plan-target" exclude={[]} placeholder={`Type a name or ${meta.kind.toLowerCase()}`} onPick={setTarget} />
            )}
          </div>
          <div class="field">
            <label for="plan-skill">Skills it should have <span class="muted">({skills.length} of {maxSkills})</span></label>
            {skills.length > 0 && <ul class="chips">
              {skills.map(n => { const k = eng.skill(n); return (
                <li class={blocked.includes(n) ? 'chip bad' : 'chip'}><Elem e={k?.element} /> {n}<button aria-label={`Remove ${n}`} onClick={() => toggleSkill(n)}>×</button></li>
              ); })}
            </ul>}
            {blocked.length > 0 && <p class="note">{target} cannot inherit {blocked.join(', ')} ({td && td.inherit} inheritance).</p>}
            <SkillPick eng={eng} id="plan-skill" names={skillNames} chosen={skills} max={maxSkills} why={cannot} onToggle={toggleSkill} />
          </div>
          <details class="owned-box" open={owned.length > 0}>
            <summary>{meta.unit === 'demon' ? 'Demons' : 'Personas'} you own <span class="muted">(optional{owned.length ? `, ${owned.length}` : ''})</span></summary>
            <p class="hint">The planner prefers chains that start from these.</p>
            {owned.length > 0 && <ul class="chips">
              {owned.map(n => <li class="chip">{n}<button aria-label={`Remove ${n}`} onClick={() => setOwned(owned.filter(x => x !== n))}>×</button></li>)}
            </ul>}
            <DemonList eng={eng} id="plan-owned" exclude={owned} placeholder="Type a name to add" onPick={n => setOwned(owned.concat([n]))} />
          </details>
          <div class="form-row">
            <label for="plan-depth">Search depth
              <select id="plan-depth" value={depth} onChange={e => setDepth(+(e.target as HTMLSelectElement).value)}>
                <option value={1}>Short chains</option>
                <option value={2}>Normal</option>
                <option value={3}>Long chains (slower)</option>
              </select>
            </label>
            <label for="plan-cap">Ingredient level cap
              <input id="plan-cap" type="number" min={1} max={99} placeholder="none" value={cap || ''} onInput={e => setCap(+(e.target as HTMLInputElement).value || 0)} />
            </label>
          </div>
          <button class="btn primary wide" disabled={!target || skills.length === 0 || busy} onClick={run}>{busy ? 'Searching…' : 'Find chains'}</button>
        </section>
        <section class="plan-results">
          {!result && !busy && <div class="panel ghost"><p>Results show up here as step-by-step fusion lists: the {meta.units} to get first, then each fusion in order with the skills to pass down.</p></div>}
          {busy && <div class="panel ghost"><p>Searching fusion chains…</p></div>}
          {result && (
            <Fragment>
              {result.missing.length > 0 && <p class="note">Not reachable: {result.missing.join(', ')}. {eng.cfg.family === 'persona' ? 'Either nothing can pass it down or the target’s inheritance type blocks it.' : 'Nothing in range can pass it down.'}</p>}
              {result.plans.length === 0 && <p class="empty">No chain found. Try more fusion layers, remove the level cap, or drop a skill.</p>}
              {result.plans.map((p, i) => {
                const got = maskToSkills(p.mask, result.skills);
                const fusions = p.steps;
                return (
                  <article class="plan">
                    <header class="plan-head">
                      <h3>Option {i + 1}</h3>
                      <p><b>{fusions}</b> {fusions === 1 ? 'fusion' : 'fusions'} <span class="sep">/</span> highest ingredient <b>Lv {p.maxLvl}</b> <span class="sep">/</span> <span class={got.length === result.skills.length ? 'allok' : 'partial'}>{got.length === result.skills.length ? 'all skills' : `${got.length} of ${result.skills.length} skills`}</span></p>
                      <button class="btn" disabled={added === i} onClick={() => addToParty(p, i)}>{added === i ? 'Added to party ✓' : 'Add to party'}</button>
                    </header>
                    <PlanSteps eng={eng} plan={p} skills={result.skills} owned={owned} />
                  </article>
                );
              })}
              {result.truncated && <p class="note">The search hit its time limit. Results may not be the shortest possible.</p>}
            </Fragment>
          )}
        </section>
      </div>
    </section>
  );
}

// ---------- party ----------
function classifySupport(eng: Eng, skillName: string): string[] {
  const k = eng.skill(skillName);
  if (!k) { return []; }
  const n = k.name.toLowerCase(), e = k.effect.toLowerCase();
  const tags: string[] = [];
  if (k.element === 'rec' && (/^(dia|media|me patra|patra|mediarahan|diarahan|diarama|mediarama)/.test(n) || /heal|restore.*hp|hp recovery/.test(e))) { tags.push('heal'); }
  if (/recarm|samarecarm|revive/.test(n + ' ' + e)) { tags.push('revive'); }
  if (/patra|cure|amrita/.test(n + ' ' + e)) { tags.push('cure'); }
  if (/kaja|heat riser|raise|increase.*(attack|defense|accuracy|evasion)|luster candy/.test(n + ' ' + e)) { tags.push('buff'); }
  if (/nda\b|unda$|debilitate|lower|decrease.*(attack|defense|accuracy|evasion)/.test(n + ' ' + e)) { tags.push('debuff'); }
  return tags;
}

// Edits one member to match the player's game: skills it really has, resistances, stats.
function MemberEditor({ eng, member, onChange, onClose }: { eng: Eng; member: Member; onChange: (m: Member) => void; onClose: () => void }) {
  const d = eng.demon(member.name);
  const elems: string[] = eng.cfg.resistElems;
  const statNames: string[] = eng.cfg.baseStats;
  const allSkills = useMemo(() => eng.skillNames().slice().sort(), [eng]);
  // Opens as a modal dialog over the page; Esc, Done or a click on the backdrop closes it.
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dlg = ref.current; if (dlg && !dlg.open) { dlg.showModal(); } }, []);
  const close = () => ref.current?.close();
  const skills = member.skills || d.skills.map((x: any) => x.name);
  const set = (patch: Partial<Member>) => onChange({ ...member, ...patch });
  const toggle = (n: string) => set({ skills: skills.includes(n) ? skills.filter((x: string) => x !== n) : skills.concat([n]) });
  const stats: number[] = member.stats || d.stats;
  return (
    <dialog class="editor-dialog" ref={ref} onClose={onClose} onClick={e => { if (e.target === ref.current) { close(); } }}>
    <section class="panel editor">
      <div class="editor-head">
        <h2>Edit {member.name}</h2>
        <span class="muted">Match your playthrough: inherited skills, resistances from items or passives, stat boosts.</span>
        <button class="btn subtle" onClick={() => onChange({ name: member.name, reserve: member.reserve })}>Reset to default</button>
        <button class="btn primary" onClick={close}>Done</button>
      </div>
      <div class="editor-grid">
        <div class="field">
          <h3>Skills <span class="muted">{skills.length > (eng.cfg.maxSkillSlots || 8)
            ? `(${skills.length} learnable, the game keeps ${eng.cfg.maxSkillSlots || 8}: remove the ones you dropped)`
            : `(${skills.length} of ${eng.cfg.maxSkillSlots || 8})`}</span></h3>
          {skills.length > 0 && <ul class="chips">
            {skills.map((n: string) => <li class="chip"><Elem e={eng.skill(n)?.element} /> {n}<button aria-label={`Remove ${n}`} onClick={() => toggle(n)}>×</button></li>)}
          </ul>}
          <SkillPick eng={eng} id="edit-skill" names={allSkills} chosen={skills} max={eng.cfg.maxSkillSlots || 8} onToggle={toggle} />
        </div>
        <div class="field">
          <h3>Resistances</h3>
          <div class="res-edit">
            {elems.map((e, i) => {
              const base = d.resists[i];
              const cur = (member.resists && member.resists[e]) || base;
              return (
                <label class={cur !== base ? 'changed' : ''}>
                  <Elem e={e} />
                  <select value={cur} onChange={ev => {
                    const v = (ev.target as HTMLSelectElement).value;
                    const r = { ...(member.resists || {}) };
                    if (v === base) { delete r[e]; } else { r[e] = v; }
                    set({ resists: Object.keys(r).length ? r : undefined });
                  }}>{RESIST_CODES.map(c => <option value={c}>{RESIST_LONG[c]}</option>)}</select>
                </label>
              );
            })}
          </div>
          {statNames.length > 0 && <Fragment>
            <h3>Stats</h3>
            <div class="stat-edit">
              {statNames.map((st, i) => {
                const base = d.stats[i] || 0;
                return (
                  <label class={(stats[i] || 0) !== base ? 'changed' : ''}>{st}
                    <input type="number" min={0} max={9999} value={stats[i] || 0} onInput={ev => {
                      const arr = stats.slice(); arr[i] = +(ev.target as HTMLInputElement).value || 0;
                      set({ stats: arr.every((x, j) => (x || 0) === (d.stats[j] || 0)) ? undefined : arr });
                    }} />
                  </label>
                );
              })}
            </div>
          </Fragment>}
        </div>
      </div>
    </section>
    </dialog>
  );
}

function Party({ eng, party: mine, setParty: saveParty, shared }: { eng: Eng; party: Member[]; setParty: (p: Member[]) => void; shared?: string }) {
  const id = eng.cfg.id;
  const meta = gameMeta(id);
  const shape = partyShape(id);
  const unitWord = (n: number) => n === 1 ? meta.unit : meta.units;
  const [slots, setSlotsState] = useState<number>(() => activeSlots(id));
  const partyHome = href({ game: id, view: 'party' });
  // A shared link (#game-p-slug.slug) shows that lineup; editing it or "Use this party" makes it yours.
  const sharedParty = shared ? fitParty(shared.split('.').map(sl => eng.ix.bySlug[sl]).filter(Boolean).slice(0, MAX_MEMBERS).map((name: string) => ({ name })), id) : null;
  const party: Member[] = sharedParty || mine;
  const setParty = (p: Member[]) => { saveParty(p); if (sharedParty) { location.hash = partyHome; } };
  const [editing, setEditing] = useState('');
  const [adding, setAdding] = useState(false);
  const [link, setLink] = useState('');
  const views = party.map(m => memberView(eng, m)).filter(Boolean) as any[];
  const fighting = views.filter(v => !v.m.reserve);
  const bench = views.filter(v => v.m.reserve);
  const team = shape.persona ? views : fighting;
  const full = party.length >= (shape.persona ? slots : MAX_MEMBERS);
  const elems: string[] = eng.cfg.resistElems;
  const setSlots = (n: number) => {
    const v = Math.max(1, Math.min(shape.persona ? 12 : 6, n || 1));
    setSlotsState(v); store.set(id + ':activeSlots', v); setParty(fitParty(party, id));
  };
  const update = (m: Member) => setParty(party.map(x => x.name === m.name ? m : x));
  const remove = (n: string) => { setParty(party.filter(x => x.name !== n)); if (editing === n) { setEditing(''); } };
  const move = (n: string) => setParty(party.map(x => x.name === n ? { ...x, reserve: !x.reserve } : x));
  const share = () => {
    const order = fighting.concat(bench).map(v => eng.ix.slugOf[v.m.name]);
    const url = location.href.split('#')[0] + href({ game: id, view: 'party', arg: order.join('.') });
    setLink(url);
    try { navigator.clipboard.writeText(url).catch(() => {}); } catch { /* clipboard unavailable: the link is shown instead */ }
  };

  const analysis = useMemo(() => {
    const weakCount = elems.map((_, i) => team.filter(v => v.resists[i] === 'wk').length);
    const covered = elems.map((_, i) => team.filter(v => RESIST_RANK[v.resists[i]] >= 2).length);
    const offense = new Set<string>();
    const support: { [k: string]: string[] } = { heal: [], revive: [], cure: [], buff: [], debuff: [] };
    for (const v of team) {
      for (const n of v.skills) {
        const k = eng.skill(n);
        if (!k) { continue; }
        if (elems.includes(k.element) && k.cost !== 'Passive' && /pwr|damage|hits|dmg/i.test(k.effect)) { offense.add(k.element); }
        if (k.element === 'alm' && k.cost !== 'Passive') { offense.add('alm'); }
        for (const t of classifySupport(eng, n)) { if (!support[t].includes(v.m.name)) { support[t].push(v.m.name); } }
      }
    }
    const avg = team.length ? Math.round(team.reduce((a: number, v: any) => a + v.d.lvl, 0) / team.length) : 0;
    const problems = elems.map((e, i) => ({ e, i, weak: weakCount[i], cover: covered[i] })).filter(p => p.weak >= 2);
    return { weakCount, covered, offense, support, avg, problems };
  }, [JSON.stringify(party), eng, slots]);

  const suggest = (i: number) => eng.ix.demons
    .filter((d: any) => !party.some(m => m.name === d.name) && RESIST_RANK[d.resists[i]] >= 3 && Math.abs(d.lvl - analysis.avg) <= 12)
    .sort((a: any, b: any) => Math.abs(a.lvl - analysis.avg) - Math.abs(b.lvl - analysis.avg))
    .slice(0, 4);

  const table = (list: any[]) => (
    <div class="tablewrap">
      <table class="grid party">
        <thead><tr><th>{meta.unit === 'demon' ? 'Demon' : 'Persona'}</th>{elems.map(e => <th class="rescol"><Elem e={e} /></th>)}<th class="tagcol"><span class="sr">Actions</span></th></tr></thead>
        <tbody>
          {list.map(v => (
            <tr class={editing === v.m.name ? 'editing' : ''}>
              <td><DemonLink eng={eng} name={v.m.name} />{v.custom && <span class="tag small" title="Changed from the default">custom</span>}</td>
              {v.resists.map((r: string, i: number) => <td class={'rescol' + (v.m.resists && v.m.resists[elems[i]] ? ' changed' : '')}><ResistCell code={r} blank /></td>)}
              <td class="tagcol"><span class="row-acts">
                <button class="mini edit" onClick={() => setEditing(v.m.name)}>Edit</button>
                {!shape.persona && <button class="mini" disabled={v.m.reserve && fighting.length >= slots} title={v.m.reserve && fighting.length >= slots ? 'The battle party is full' : ''} onClick={() => move(v.m.name)}>{v.m.reserve ? 'To battle' : 'To reserve'}</button>}
                <button class="mini danger" aria-label={`Remove ${v.m.name}`} onClick={() => remove(v.m.name)}>Remove</button>
              </span></td>
            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
  const editMember = party.find(m => m.name === editing);

  return (
    <section class="view">
      <header class="view-head">
        <div><h1>Party</h1>
          <p class="lede">{shape.persona
            ? `Your persona stock, up to ${slots} personas. Edit one to match your playthrough: skills, resistances, stats.`
            : `${capFirst(shape.lead)} plus ${slots} ${unitWord(slots)} in battle; the rest wait in reserve. Edit a member to match your playthrough: skills, resistances, stats.`}</p></div>
        <label class="slots">{shape.persona ? 'Stock size' : `${capFirst(meta.units)} in battle`}
          <input type="number" min={1} max={shape.persona ? 12 : 6} value={slots} onInput={e => setSlots(+(e.target as HTMLInputElement).value)} />
        </label>
      </header>

      {sharedParty && (
        <div class="note shared-box">
          <p>Shared party. Your own party is unchanged until you use this one.</p>
          <button class="btn primary" onClick={() => setParty(sharedParty)}>Use this party</button>
          <a href={partyHome}>Back to my party</a>
        </div>
      )}
      <section class="panel">
        <div class="party-top">
          <h2>{shape.persona ? 'Persona stock' : 'In battle'} <span class="muted">{shape.persona ? party.length : fighting.length} / {slots}</span></h2>
          {!full && <button class={adding ? 'btn' : 'btn primary'} onClick={() => setAdding(!adding)}>{adding ? 'Done adding' : `Add ${meta.units}`}</button>}
          {party.length > 0 && <button class="btn subtle" onClick={share}>Share link</button>}
          {party.length > 0 && !sharedParty && <button class="btn subtle" onClick={() => { setParty([]); setEditing(''); }}>Clear</button>}
        </div>
        {link && <p class="share-line">Link copied (names only; your changes stay on this device): <input readOnly value={link} onFocus={e => (e.target as HTMLInputElement).select()} /></p>}
        {adding && !full && <DemonList eng={eng} id="party-add" exclude={party.map(m => m.name)} placeholder={`Type a ${meta.unit} name to add`} onPick={n => setParty(addMember(party, { name: n }, id))} />}
        {team.length === 0
          ? (!adding && <p class="empty">No one here yet. Add {meta.units} above, from any {meta.unit} page, or from a skill planner result.</p>)
          : table(team)}
        {team.length > 0 && (
          <div class="strip team-res">
            <h3>Team resistances <span class="muted">({shape.persona ? 'whole stock' : 'battle party'})</span></h3>
            <div class="strip-row" style={{ gridTemplateColumns: `repeat(${elems.length}, minmax(0, 1fr))` }}>
              {elems.map((e, i) => {
                const weak = analysis.weakCount[i], res = analysis.covered[i];
                return (
                  <div class="strip-cell">
                    <span class="strip-k"><Elem e={e} /></span>
                    <span class={`tcount ${weak >= 2 ? 'bad' : weak ? 'meh' : 'none'}`} title={`${weak} weak to ${ELEM_LABEL[e] || e}`}>{weak ? `${weak} weak` : 'no weak'}</span>
                    <span class={`tcount ${res ? 'good' : 'none'}`} title={`${res} resist ${ELEM_LABEL[e] || e} or better`}>{res ? `${res} resist` : '·'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {!shape.persona && bench.length > 0 && (
        <section class="panel">
          <h2>Reserve <span class="muted">{bench.length}</span></h2>
          {table(bench)}
        </section>
      )}

      {editMember && <MemberEditor key={editMember.name} eng={eng} member={editMember} onChange={update} onClose={() => setEditing('')} />}

      {team.length > 0 && (
        <div class="party-grid">
          <section class="panel">
            <h2>Shared weaknesses</h2>
            {analysis.problems.length === 0 ? <p class="ok">No element hits two or more members for weakness damage.</p> :
              <ul class="problems">
                {analysis.problems.map(p => {
                  const sug = suggest(p.i);
                  return (
                    <li>
                      <p><Elem e={p.e} long /> hits {p.weak} members. {p.cover ? `${p.cover} can take it.` : 'Nobody resists it.'}</p>
                      {sug.length > 0 && <p class="sug">Around Lv {analysis.avg}, these null, repel or drain it: {sug.map((d: any, i: number) => <Fragment>{i > 0 && ', '}<a href={demonHref(eng, d.name)}>{d.name}</a> <span class="muted">{d.lvl}</span></Fragment>)}</p>}
                    </li>
                  );
                })}
              </ul>}
          </section>
          <section class="panel">
            <h2>Attack coverage</h2>
            <div class="cover">
              {elems.concat(eng.cfg.family === 'smt' ? ['alm'] : []).map(e => <span class={analysis.offense.has(e) ? 'cv on' : 'cv'}><Elem e={e} /></span>)}
            </div>
            <p class="hint">Lit types have at least one damaging skill in the {shape.persona ? 'stock' : 'battle party'}.</p>
          </section>
          <section class="panel">
            <h2>Support</h2>
            <dl class="support">
              {[['heal', 'Healing'], ['revive', 'Revive'], ['cure', 'Ailment cure'], ['buff', 'Buffs'], ['debuff', 'Debuffs']].map(([k, label]) => (
                <div><dt>{label}</dt><dd class={analysis.support[k].length ? '' : 'missing'}>{analysis.support[k].length ? analysis.support[k].join(', ') : 'Missing'}</dd></div>
              ))}
            </dl>
          </section>
        </div>
      )}
    </section>
  );
}

// ---------- fusion chart ----------
// Races that appear in the game's own race x race chart (getRaceFusion from aqiu384's chart models).
function chartRaces(eng: Eng): string[] {
  const chart = eng.cfg.chart;
  if (!chart || typeof chart.getRaceFusion !== 'function') { return []; }
  if (!eng.ix.chartRaces) {
    const present = new Set(eng.ix.demons.map((d: any) => d.race));
    eng.ix.chartRaces = (eng.cfg.races as string[]).filter(r => {
      if (!present.has(r)) { return false; }
      try { return Object.keys(chart.getRaceFusions(r) || {}).length > 0; } catch { return false; }
    });
  }
  return eng.ix.chartRaces;
}

function ChartView({ eng }: { eng: Eng }) {
  const meta = gameMeta(eng.cfg.id);
  const races = chartRaces(eng);
  const [race, setRace] = useState<string>(races[0] || '');
  const kind = meta.kind === 'Race' ? 'race' : 'arcana';
  const fuse = (a: string, b: string) => { try { return eng.cfg.chart.getRaceFusion(a, b) || ''; } catch { return ''; } };
  if (!races.length) { return <section class="view"><h1>Fusion chart</h1><p class="empty">No {kind} chart for this game.</p></section>; }
  const into = races.map(b => ({ b, r: fuse(race, b) })).filter(x => x.r);
  const from: [string, string][] = [];
  races.forEach((a, i) => races.slice(i).forEach(b => { if (fuse(a, b) === race) { from.push([a, b]); } }));
  const link = (r: string) => <button class="race-link" onClick={() => setRace(r)}>{r}</button>;
  return (
    <section class="view">
      <header class="view-head"><div><h1>Fusion chart</h1>
        <p class="lede">Pick a {kind} to see what it fuses into and which pairs make it. Special fusions and elements are listed on each {meta.unit}'s page.</p></div></header>
      <div class="race-chips" role="group" aria-label={capFirst(kind)}>
        {races.map(r => <button class={r === race ? 'on' : ''} aria-pressed={r === race} onClick={() => setRace(r)}>{r}</button>)}
      </div>
      <div class="chart-grid">
        <section class="panel">
          <h2>{race} fused with…</h2>
          <div class="tablewrap">
            <table class="grid">
              <thead><tr><th>Fused with</th><th>Gives</th></tr></thead>
              <tbody>{into.map(x => <tr><td>{link(x.b)}</td><td>{link(x.r)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
        <section class="panel">
          <h2>Ways to make {race} <span class="muted">{from.length}</span></h2>
          {from.length === 0 ? <p class="empty">No normal pair gives {race}.</p> :
            <div class="tablewrap">
              <table class="grid">
                <thead><tr><th>First</th><th>Second</th></tr></thead>
                <tbody>{from.map(([a, b]) => <tr><td>{link(a)}</td><td>{link(b)}</td></tr>)}</tbody>
              </table>
            </div>}
        </section>
      </div>
    </section>
  );
}

// ---------- playthrough sheet (v0.3) ----------
// The player's run: social links, social stats, checklists, requests, equipment. Saved in this browser only;
// export / import moves it between devices. Names stay hidden until met so the list does not spoil the story.
const REQ_STATUS = ['Not started', 'In progress', 'Done'];
// Laid out like a spreadsheet: cards side by side in columns, each a vertical list showing everything
// (nothing scrolls inside a card). Equipment is full width so each character fits on one line. Phones: one card at a time.
function Playthrough({ eng }: { eng: Eng }) {
  const id = eng.cfg.id;
  const def = SHEETS[id];
  const meta = gameMeta(id);
  const [sheet, setSheet] = useState<any>(() => store.get(id + ':sheet', {}));
  const [tab, setTab] = useState('links');
  const [msg, setMsg] = useState('');
  const save = (patch: any) => { const next = { ...sheet, ...patch }; setSheet(next); store.set(id + ':sheet', next); };
  const links = sheet.links || {}, stats = sheet.stats || {}, checks = sheet.checks || {};
  const requests: { name: string; status: number }[] = sheet.requests || [];
  const gear: { who: string; slots: { [k: string]: string } }[] = Array.isArray(sheet.gear) ? sheet.gear : [{ who: def.gear ? def.gear.lead : '', slots: {} }];
  const rankOf = (a: string) => (links[a] && links[a].rank) || 0;
  const links_ = def.links || [], stats_ = def.stats || [], linkMax = def.linkMax || 10, statRanks = def.statRanks || 5;
  const maxed = links_.filter(([a]) => rankOf(a) >= linkMax).length;
  const setGear = (rows: typeof gear) => save({ gear: rows });

  const exportSheet = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ game: id, sheet }, null, 2)], { type: 'application/json' }));
    const el = document.createElement('a'); el.href = url; el.download = `pyxi-${id}-playthrough.json`; el.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importSheet = (f?: File) => {
    if (!f) { return; }
    f.text().then(t => {
      const data = JSON.parse(t);
      if (!data || data.game !== id || typeof data.sheet !== 'object') { throw new Error('not a ' + meta.name + ' playthrough file'); }
      setSheet(data.sheet); store.set(id + ':sheet', data.sheet); setMsg('Playthrough imported.');
    }).catch(e => setMsg('Could not import: ' + (e.message || e)));
  };
  const reset = () => { if (confirm(`Erase your ${meta.name} playthrough sheet on this device?`)) { setSheet({}); store.set(id + ':sheet', {}); setMsg('Sheet cleared.'); } };

  const cards: { k: string; title: string; count?: string; pct?: number; wide?: boolean; body: any }[] = [];
  const statSum = stats_.reduce((a, st) => a + (stats[st] || 1), 0);
  const pickCard = (k: string) => { setTab(k); document.getElementById('card-' + k)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  if (links_.length) cards.push({ k: 'links', title: def.linksTitle || 'Social links', count: `${maxed}/${links_.length} max`, pct: maxed / links_.length, body: (
    <Fragment>
      <label class="srow spoil"><input type="checkbox" checked={!!sheet.showNames} onChange={e => save({ showNames: (e.target as HTMLInputElement).checked })} /> Show names I haven't met</label>
      {links_.map(([arcana, who]) => {
        const r = rankOf(arcana);
        return (
          <div class={'srow link' + (r >= linkMax ? ' maxed' : r > 0 ? ' met' : '')}>
            <span class="arc">{arcana}</span>
            <span class="who-wrap">
              <span class="who">{r > 0 || sheet.showNames ? who : <span class="muted" title="Hidden until you meet them">???</span>}</span>
              {r > 0 && <span class="rb" aria-hidden="true"><span style={{ width: `${(r / linkMax) * 100}%` }} /></span>}
            </span>
            <select aria-label={`${arcana} rank`} value={r} onChange={e => save({ links: { ...links, [arcana]: { rank: +(e.target as HTMLSelectElement).value } } })}>
              {Array.from({ length: linkMax + 1 }, (_, i) => <option value={i}>{i === 0 ? '–' : i === linkMax ? 'Max' : i}</option>)}
            </select>
          </div>
        );
      })}
    </Fragment>
  ) });
  if (stats_.length) cards.push({ k: 'stats', title: 'Social stats', count: `${statSum}/${stats_.length * statRanks}`, pct: statSum / (stats_.length * statRanks), body: stats_.map(st => {
    const cur = stats[st] || 1;
    return (
      <div class={'srow stat' + (cur >= statRanks ? ' maxed' : '')}>
        <span class="st-name">{st}</span>
        <span class="pips" role="group" aria-label={`${st} rank`}>
          {Array.from({ length: statRanks }, (_, i) => (
            <button class={i < cur ? 'on' : ''} aria-label={`${st} rank ${i + 1}`} aria-pressed={i < cur} onClick={() => save({ stats: { ...stats, [st]: i + 1 } })} />
          ))}
        </span>
        <span class="rank-t" title={`Rank ${cur} of ${statRanks}`}>{((def.rankNames || {})[st] || [])[cur - 1] || `Rank ${cur}`}</span>
      </div>
    );
  }) });
  def.lists.forEach((l, li) => {
    const keys = l.groups.flatMap(g => g.items.map(it => `${l.title}:${g.name}:${it}`));
    const done = keys.filter(k => checks[k]).length;
    cards.push({ k: 'list' + li, title: l.title, count: `${done}/${keys.length}`, pct: done / keys.length, wide: keys.length > 30, body: l.groups.map(g => (
      <div class={l.groups.length > 1 ? 'sgroup-box' : 'sgroup-flat'}>
        {l.groups.length > 1 && <div class="sgroup">{g.name} <span class="muted">{g.items.filter(it => checks[`${l.title}:${g.name}:${it}`]).length}/{g.items.length}</span></div>}
        {g.items.map(it => { const k = `${l.title}:${g.name}:${it}`; return (
          <label class={'srow check' + (checks[k] ? ' done' : '')}><input type="checkbox" checked={!!checks[k]} onChange={e => save({ checks: { ...checks, [k]: (e.target as HTMLInputElement).checked } })} /> {it}</label>
        ); })}
      </div>
    )) });
  });
  if (def.freeRequests) {
    const doneReq = requests.filter(r => r.status === 2).length;
    cards.push({ k: 'req', title: 'Requests', count: `${doneReq}/${requests.length}`, pct: requests.length ? doneReq / requests.length : 0, body: (
      <Fragment>
        {requests.map((rq, i) => {
          const set = (patch: any) => save({ requests: requests.map((x, j) => j === i ? { ...x, ...patch } : x) });
          return (
            <div class={'srow req' + (rq.status === 2 ? ' maxed' : '')}>
              <input class="cell-input" aria-label="Request" placeholder="Request name" value={rq.name} onInput={e => set({ name: (e.target as HTMLInputElement).value })} />
              <select aria-label="Status" value={rq.status} onChange={e => set({ status: +(e.target as HTMLSelectElement).value })}>{REQ_STATUS.map((st, k) => <option value={k}>{st}</option>)}</select>
              <button class="x" aria-label="Remove request" onClick={() => save({ requests: requests.filter((_, j) => j !== i) })}>×</button>
            </div>
          );
        })}
        <div class="srow"><button class="mini" onClick={() => save({ requests: requests.concat([{ name: '', status: 0 }]) })}>Add a request</button></div>
      </Fragment>
    ) });
  }
  const slots_ = def.gear ? def.gear.slots : [];
  const gearCols = { gridTemplateColumns: `minmax(6em, 1.1fr) repeat(${slots_.length}, minmax(0, 1fr)) 1.4em` };
  if (def.gear) cards.push({ k: 'gear', title: 'Equipment', count: `${gear.length} ${gear.length === 1 ? 'member' : 'members'}`, body: (
    <Fragment>
      <div class="gear-row gear-head" style={gearCols}><span>Character</span>{slots_.map(sl => <span>{sl}</span>)}<span /></div>
      {gear.map((g, i) => (
        <div class="gear-row" style={gearCols}>
          <input class="cell-input who" aria-label="Character" value={g.who} placeholder="Party member" onInput={e => setGear(gear.map((x, j) => j === i ? { ...x, who: (e.target as HTMLInputElement).value } : x))} />
          {slots_.map(sl => <input class="cell-input" aria-label={`${g.who || 'Member'} ${sl}`} placeholder="–" value={g.slots[sl] || ''}
            onInput={e => setGear(gear.map((x, j) => j === i ? { ...x, slots: { ...x.slots, [sl]: (e.target as HTMLInputElement).value } } : x))} />)}
          {i > 0 ? <button class="x" aria-label="Remove member" onClick={() => setGear(gear.filter((_, j) => j !== i))}>×</button> : <span />}
        </div>
      ))}
      <div class="srow"><button class="mini" onClick={() => setGear(gear.concat([{ who: '', slots: {} }]))}>Add a party member</button></div>
    </Fragment>
  ) });

  // Packs the board like a masonry wall: each card spans as many 8px grid rows as its real height needs.
  const boardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const board = boardRef.current;
    if (!board || typeof ResizeObserver === 'undefined') { return; }
    const fit = (el: HTMLElement) => { el.style.gridRowEnd = `span ${Math.ceil((el.getBoundingClientRect().height + 16) / 8)}`; };
    const ro = new ResizeObserver(entries => entries.forEach(e => fit(e.target as HTMLElement)));
    Array.from(board.children).forEach(el => ro.observe(el));
    return () => ro.disconnect();
  }, [id, cards.length]);
  const card = (c: typeof cards[0], body = '') => (
    <section id={'card-' + c.k} class={'sheet-card' + (c.wide ? ' wide' : '') + (tab === c.k ? ' on' : '')}>
      <header class="sheet-card-h"><h2>{c.title}</h2>{c.count && <span class="muted">{c.count}</span>}</header>
      <div class={('sheet-body ' + (c.wide ? 'cols2 ' : '') + body).trim()}>{c.body}</div>
    </section>
  );

  return (
    <section class="view sheet">
      <header class="view-head">
        <div><h1>Playthrough</h1>
          <p class="lede">Your run at a glance. Saved in this browser; export a file to keep it or move it to another device.</p></div>
        <div class="sheet-tools">
          <button class="mini" onClick={exportSheet}>Export</button>
          <label class="mini">Import<input type="file" accept="application/json,.json" class="sr" onChange={e => importSheet((e.target as HTMLInputElement).files?.[0])} /></label>
          <button class="mini danger" onClick={reset}>Reset</button>
        </div>
      </header>
      {msg && <p class="note">{msg}</p>}
      <div class="sheet-overview" role="tablist" aria-label="Sheet sections">
        {cards.map(c => (
          <button role="tab" aria-selected={tab === c.k} class={'tile' + (tab === c.k ? ' on' : '')} onClick={() => pickCard(c.k)}>
            <span class="tile-t">{c.title}</span><span class="tile-n">{c.count}</span>
            {c.pct !== undefined && <span class="tile-bar" aria-hidden="true"><span style={{ width: `${Math.round(c.pct * 100)}%` }} /></span>}
          </button>
        ))}
      </div>
      {/* one checklist only (SMT games): it spans the full width with as many columns as fit */}
      <div class={'sheet-board' + (cards.filter(c => c.k !== 'gear').length === 1 ? ' solo' : '')} ref={boardRef}>{cards.filter(c => c.k !== 'gear').map(c => card(c))}</div>
      {cards.filter(c => c.k === 'gear').map(c => card(c))}
    </section>
  );
}

// ---------- unlocks ----------
function Unlocks({ eng, onChange }: { eng: Eng; onChange: () => void }) {
  const groups = eng.unlockGroups;
  const toggles = eng.toggles;
  const set = (key: string, v: boolean) => {
    eng.setToggles({ [key]: v });
    store.set(eng.cfg.id + ':unlocks', eng.toggles);
    onChange();
  };
  const setAll = (keys: string[], v: boolean) => {
    eng.setToggles(keys.reduce((a: any, k) => { a[k] = v; return a; }, {}));
    store.set(eng.cfg.id + ':unlocks', eng.toggles);
    onChange();
  };
  return (
    <section class="view">
      <header class="view-head"><div><h1>Unlocks</h1>
        <p class="lede">Turn off anything you have not unlocked or do not own. Recipes everywhere update to match, since a locked {gameMeta(eng.cfg.id).unit} changes what a fusion produces.</p></div></header>
      {groups.length === 0 && <p class="empty">{gameMeta(eng.cfg.id).name} has no unlock settings.</p>}
      <div class="unlock-grid">
        {groups.map((g: any) => {
          const keys = g.items.map((i: any) => i.key);
          const allOn = keys.every((k: string) => toggles[k]);
          return (
            <section class="panel">
              <div class="unlock-head"><h2>{g.category}</h2><button class="btn subtle" onClick={() => setAll(keys, !allOn)}>{allOn ? 'Lock all' : 'Unlock all'}</button></div>
              <ul class="unlocks">
                {g.items.map((it: any) => (
                  <li>
                    <label class="toggle">
                      <input type="checkbox" id={`u-${slugify(it.key)}`} checked={!!toggles[it.key]} onChange={e => set(it.key, (e.target as HTMLInputElement).checked)} />
                      <span class="tg-names">{it.names.join(', ')}</span>
                      <span class="tg-cond">{it.condition}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}

// ---------- search (homepage) ----------
type Hit = { name: string; games: { id: string; slug: string; lvl: number; race: string }[] };
let searchIndex: Promise<Hit[]> | null = null;
function loadSearch(): Promise<Hit[]> {
  if (!searchIndex) {
    searchIndex = fetch(`search.json?v=${__BUILD__}`).then(r => r.json()).then((idx: { [id: string]: [string, number, string][] }) => {
      const byName = new Map<string, Hit>();
      for (const g of GAMES) {
        const seen: { [s: string]: boolean } = {};
        for (const [name, lvl, race] of idx[g.id] || []) {
          let slug = slugify(name); while (seen[slug]) { slug += '-x'; } seen[slug] = true; // same as indexEngine
          const key = name.toLowerCase();
          if (!byName.has(key)) { byName.set(key, { name, games: [] }); }
          byName.get(key)!.games.push({ id: g.id, slug, lvl, race });
        }
      }
      return Array.from(byName.values());
    }).catch(e => { searchIndex = null; throw e; });
  }
  return searchIndex;
}

function Search() {
  const [q, setQ] = useState('');
  const [all, setAll] = useState<Hit[] | null>(null);
  const [failed, setFailed] = useState(false);
  const ready = () => { if (!all) { loadSearch().then(setAll).catch(() => setFailed(true)); } };
  const s = q.trim().toLowerCase();
  const hits = !all || s.length < 2 ? [] : all
    .filter(h => h.name.toLowerCase().includes(s))
    .sort((a, b) => Number(!a.name.toLowerCase().startsWith(s)) - Number(!b.name.toLowerCase().startsWith(s)) || a.name.localeCompare(b.name))
    .slice(0, 12);
  return (
    <section class="search">
      <label class="sr" for="home-search">Search every game</label>
      <input id="home-search" type="search" autocomplete="off" placeholder="Search every game, e.g. Alice"
        value={q} onFocus={ready} onInput={e => { ready(); setQ((e.target as HTMLInputElement).value); }} />
      {failed && <p class="note">Could not load the search index. Reload the page to try again.</p>}
      {s.length >= 2 && all && (hits.length === 0 ? <p class="empty">No demon or persona named like “{q}”.</p> : (
        <ul class="hits">
          {hits.map(hit => (
            <li>
              <span class="hit-name">{hit.name}</span>
              <span class="hit-games">{hit.games.map(g => <a href={`#${g.id}-d-${g.slug}`} title={`${gameMeta(g.id).name}: Lv ${g.lvl} ${g.race}`}>{gameMeta(g.id).short}</a>)}</span>
            </li>
          ))}
        </ul>
      ))}
    </section>
  );
}

// ---------- home ----------
function Home() {
  const series = Array.from(new Set(GAMES.map(g => g.series)));
  return (
    <section class="view home">
      <div class="home-tools"><ThemeButton /></div>
      <header class="home-head">
        <img src={`logo.png?v=${__BUILD__}`} alt="" width="140" height="140" />
        <div>
          <h1>Pyxi</h1>
          <p class="lede">Your Megaten companion: fusion calculator, skill planner, party builder and playthrough sheets for 41 games.</p>
        </div>
      </header>
      <Search />
      <div class="series-grid">
        {series.map(sr => (
          <section class="series">
            <h2>{sr} <span class="muted">{GAMES.filter(g => g.series === sr).length}</span></h2>
            <ul class="gamelist">
              {GAMES.filter(g => g.series === sr).map(g => (
                <li>
                  <a class="gname" href={`#${g.id}`}>{g.name}</a>
                  <span class="glinks">
                    <a href={href({ game: g.id, view: 'skills' })}>Skills</a>
                    {!g.noPlanner && <a href={href({ game: g.id, view: 'planner' })}>Planner</a>}
                    <a href={href({ game: g.id, view: 'party' })}>Party</a>
                    {SHEETS[g.id] && <a href={href({ game: g.id, view: 'playthrough' })}>Playthrough</a>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {COMING_SOON.length > 0 && <p class="muted soon">Not yet supported: {COMING_SOON.join(', ')}.</p>}
    </section>
  );
}

// ---------- header game switcher ----------
// The current game's name doubles as a switcher. Stays on the same section; demon and skill pages land on the list.
function GameSelect({ route }: { route: Route }) {
  const series = Array.from(new Set(GAMES.map(g => g.series)));
  const go = (id: string) => {
    let view = route.view === 'demon' ? 'list' : route.view === 'skill' ? 'skills' : route.view;
    if (view === 'planner' && gameMeta(id).noPlanner) { view = 'list'; }
    location.hash = href({ game: id, view });
  };
  return (
    <select class="game-select" aria-label="Game" value={route.game} onChange={e => go((e.target as HTMLSelectElement).value)}>
      {series.map(sr => <optgroup label={sr}>{GAMES.filter(g => g.series === sr).map(g => <option value={g.id}>{g.name}</option>)}</optgroup>)}
    </select>
  );
}

// ---------- shell ----------
function App() {
  const [route, setRoute] = useState<Route>(parseHash());
  const [eng, setEng] = useState<Eng | null>(null);
  const [err, setErr] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [rev, setRev] = useState(0);
  const [party, setPartyState] = useState<Member[]>([]);

  useEffect(() => {
    const on = () => { setRoute(parseHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    setEng(null); setErr('');
    if (!route.game) { delete document.documentElement.dataset.game; return; }
    document.documentElement.dataset.game = route.game;
    let live = true; // ignore a load that finishes after the user switched game
    loadGame(route.game).then(e => { if (live) { setEng(e); setPartyState(normParty(store.get(route.game + ':party', []))); } })
      .catch(e => { if (live) { setErr(String(e.message || e)); } });
    return () => { live = false; };
  }, [route.game, attempt]);

  const setParty = useCallback((p: Member[]) => { setPartyState(p); store.set(route.game + ':party', p); }, [route.game]);
  if (eng) { eng.rev = rev; }
  curFamily = eng ? eng.cfg.iconSet || eng.cfg.family : '';

  const nav = [
    { view: 'list', label: 'Compendium' },
    { view: 'skills', label: 'Skills' },
    { view: 'planner', label: 'Skill planner' },
    { view: 'party', label: 'Party' + (party.length ? ` · ${party.length}` : '') },
    { view: 'chart', label: 'Fusion chart' },
    { view: 'playthrough', label: 'Playthrough' },
    { view: 'unlocks', label: 'Unlocks' },
  ];
  const active = route.view === 'demon' ? 'list' : route.view === 'skill' ? 'skills' : route.view;
  const meta = gameMeta(route.game);
  const navShown = nav.filter(n => !(n.view === 'playthrough' && !SHEETS[route.game]) && !(n.view === 'planner' && meta.noPlanner) && !(n.view === 'chart' && eng && !chartRaces(eng).length) && !(n.view === 'unlocks' && eng && !eng.cfg.unlocks.length));
  useEffect(() => { // sticky table headers sit right under the top bar, whose height varies
    const t = document.querySelector('.top') as HTMLElement | null;
    if (!t) { return; }
    const set = () => document.documentElement.style.setProperty('--top-h', Math.floor(t.getBoundingClientRect().height) + 'px');
    set();
    window.addEventListener('resize', set);
    return () => window.removeEventListener('resize', set);
  });
  useEffect(() => {
    const labels: { [v: string]: string } = { list: 'Compendium', skills: 'Skills', planner: 'Skill planner', party: 'Party', unlocks: 'Unlocks', chart: 'Fusion chart', playthrough: 'Playthrough' };
    const page = !eng ? '' : route.view === 'demon' ? eng.ix.bySlug[route.arg!] : route.view === 'skill' ? eng.ix.skillBySlug[route.arg!] : labels[route.view];
    document.title = route.view === 'home' ? 'Pyxi: Megaten Fusion Calculator for SMT, Persona and more' : [page, meta.name, 'Pyxi'].filter(Boolean).join(' | ');
  }, [route, eng]);

  let body: any = route.view === 'home' ? <Home /> : <div class="loading"><span class="spin" aria-hidden="true" />Loading {meta.name}</div>;
  if (err) {
    body = (
      <div class="view">
        <div class="note error-box">
          <p>{err} for {meta.name}. Check your connection and try again.</p>
          <button class="btn" onClick={() => setAttempt(a => a + 1)}>Retry</button>
        </div>
      </div>
    );
  }
  else if (route.view !== 'home' && eng && eng.cfg.id === route.game) {
    if (route.view === 'demon') { body = <DemonPage eng={eng} slug={route.arg!} party={party} setParty={setParty} />; }
    else if (route.view === 'skill') { body = <SkillPage eng={eng} slug={route.arg!} />; }
    else if (route.view === 'skills') { body = <SkillList eng={eng} />; }
    else if (route.view === 'planner') { body = meta.noPlanner ? <div class="view"><p class="note">{meta.name} has fixed skill sets, so there is nothing to plan.</p></div> : <Planner eng={eng} party={party} setParty={setParty} />; }
    else if (route.view === 'party') { body = <Party eng={eng} party={party} setParty={setParty} shared={route.arg} />; }
    else if (route.view === 'chart') { body = <ChartView eng={eng} />; }
    else if (route.view === 'playthrough') { body = SHEETS[route.game] ? <Playthrough eng={eng} /> : <div class="view"><p class="note">No playthrough sheet for {meta.name} yet.</p></div>; }
    else if (route.view === 'unlocks') { body = <Unlocks eng={eng} onChange={() => setRev(r => r + 1)} />; }
    else { body = <Compendium eng={eng} />; }
  }

  return (
    <Fragment>
      {route.game && <header class="top">
        <div class="top-inner">
          <a class="brand" href="#home" title="All games"><img src={`logo.png?v=${__BUILD__}`} alt="" width="24" height="24" />Pyxi</a>
          <span class="sep" aria-hidden="true">/</span>
          <GameSelect route={route} />
          <ThemeButton />
        </div>
        {route.game && (
          <nav class="nav" aria-label="Sections">
            <div class="nav-inner">
              {navShown.map(n => <a class={active === n.view ? 'on' : ''} aria-current={active === n.view ? 'page' : undefined} href={href({ game: route.game, view: n.view })}>{n.label}</a>)}
            </div>
          </nav>
        )}
      </header>}
      <main class="main">{body}</main>
      <footer class="foot">
        <p>Fusion data and logic from <a href="https://github.com/aqiu384/megaten-fusion-tool" target="_blank" rel="noopener">aqiu384’s Megami Tensei Fusion Tools</a>, released into the public domain. Unofficial fan tool, not affiliated with Atlus or Sega.</p>
        <p>Spotted a wrong result or a bug? <a href="https://github.com/anderson3x11/pyxi/issues" target="_blank" rel="noopener">Report it on GitHub</a>.</p>
      </footer>
    </Fragment>
  );
}

const root = document.getElementById('app')!;
root.textContent = '';
render(<App />, root);
