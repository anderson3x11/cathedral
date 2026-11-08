import { h, render, Fragment } from 'preact';
import { useState, useEffect, useMemo, useRef, useCallback } from 'preact/hooks';
import { ELEM_LABEL, ELEM_SHORT, RESIST_LABEL, RESIST_LONG, RESIST_RANK, GAMES, COMING_SOON, iconUrl, slugify } from './meta';
import { planSkills, maskToSkills, PlanNode, PlanResult } from './planner';
import { demonArt, Art } from './art';

type Eng = any;

// ---------- storage (best effort) ----------
const store = {
  get(key: string, fallback: any) {
    try { const v = localStorage.getItem('cathedral:' + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key: string, value: any) {
    try { localStorage.setItem('cathedral:' + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
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
      s.src = `games/${id}.js`;
      s.onload = ready;
      s.onerror = () => reject(new Error('Could not load game data'));
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

// ---------- routing ----------
interface Route { game: string; view: string; arg?: string }
const GAME_RE = new RegExp(`^(${GAMES.map(g => g.id).join('|')})(?:-(d|s)-(.+)|-(skills|planner|party|unlocks))?$`);
function parseHash(): Route {
  const raw = decodeURIComponent(location.hash.replace(/^#/, ''));
  const m = raw.match(GAME_RE);
  if (!m) { return { game: '', view: 'home' }; }
  if (m[2] === 'd') { return { game: m[1], view: 'demon', arg: m[3] }; }
  if (m[2] === 's') { return { game: m[1], view: 'skill', arg: m[3] }; }
  return { game: m[1], view: m[4] || 'list' };
}
function href(r: Route) {
  if (r.view === 'home') { return '#home'; }
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

// ---------- picker ----------
function Picker({ items, placeholder, onPick, id, render: renderItem }: { items: string[]; placeholder: string; onPick: (v: string) => void; id: string; render?: (v: string) => any }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) { return items.slice(0, 8); }
    const starts = items.filter(i => i.toLowerCase().startsWith(s));
    const has = items.filter(i => !i.toLowerCase().startsWith(s) && i.toLowerCase().includes(s));
    return starts.concat(has).slice(0, 8);
  }, [q, items]);
  const pick = (v: string) => { onPick(v); setQ(''); setOpen(false); setHi(0); };
  return (
    <div class="picker">
      <input id={id} type="search" autocomplete="off" placeholder={placeholder} value={q}
        onInput={e => { setQ((e.target as HTMLInputElement).value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { setHi(Math.min(hi + 1, list.length - 1)); e.preventDefault(); }
          else if (e.key === 'ArrowUp') { setHi(Math.max(hi - 1, 0)); e.preventDefault(); }
          else if (e.key === 'Enter' && list[hi]) { pick(list[hi]); e.preventDefault(); }
          else if (e.key === 'Escape') { setOpen(false); }
        }} />
      {open && list.length > 0 && (
        <ul class="picker-list" role="listbox">
          {list.map((v, i) => (
            <li role="option" aria-selected={i === hi} class={i === hi ? 'hi' : ''} onMouseDown={e => { e.preventDefault(); pick(v); }}>
              {renderItem ? renderItem(v) : v}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
  const th = (k: string, label: any, cls = '') => {
    const on = sort.k === k;
    const asc = on && (sort.dir > 0) === ['lvl', 'name', 'race'].includes(k);
    return (
      <th class={cls} aria-sort={on ? (asc ? 'ascending' : 'descending') : undefined}>
        <button class={on ? 'sortbtn on' : 'sortbtn'} title="Sort" onClick={() => setSort(s => ({ k, dir: s.k === k ? -s.dir : 1 }))}>{label}<span class="sortmark" aria-hidden="true">{on ? (asc ? '▲' : '▼') : '⇅'}</span></button>
      </th>
    );
  };

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

function DemonPage({ eng, slug, party, setParty }: { eng: Eng; slug: string; party: string[]; setParty: (p: string[]) => void }) {
  const name = eng.ix.bySlug[slug];
  const d = name && eng.demon(name);
  const meta = gameMeta(eng.cfg.id);
  if (!d) { return <section class="view"><h1>Not found</h1><p class="empty">No {meta.unit} matches this link. <a href={href({ game: eng.cfg.id, view: 'list' })}>Back to the compendium</a>.</p></section>; }
  const inParty = party.includes(d.name);
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
          <button class={inParty ? 'btn' : 'btn primary'} onClick={() => setParty(inParty ? party.filter(p => p !== d.name) : party.concat([d.name]).slice(-6))}>
            {inParty ? 'Remove from party' : 'Add to party'}
          </button>
          {!eng.cfg.noPlanner && <a class="btn" href={`${href({ game: eng.cfg.id, view: 'planner' })}`} onClick={() => store.set(eng.cfg.id + ':planTarget', d.name)}>Plan skills</a>}
        </div>
      </header>

      <div class="demon-grid">
        <div class="col">
          <DemonArt eng={eng} d={d} />
          <section class="panel"><h2>Stats</h2><Stats eng={eng} d={d} /></section>
          <section class="panel">
            <ResistStrip title="Resistances" elems={eng.cfg.resistElems} codes={d.resists} />
            {d.ailments.some((a: string) => a !== '-') && <ResistStrip title="Ailments" elems={ailments} codes={d.ailments} />}
            <Potential eng={eng} d={d} />
            <Inheritance eng={eng} d={d} />
          </section>
        </div>
        <section class="panel col-wide"><h2>Skills</h2><SkillTable eng={eng} d={d} /></section>
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
  const all = useMemo(() => eng.skillNames().map((n: string) => eng.skill(n)).filter(Boolean)
    .sort((a: any, b: any) => a.element.localeCompare(b.element) || a.rank - b.rank || a.name.localeCompare(b.name)), [eng]);
  const elems: string[] = useMemo(() => Array.from(new Set(all.map((s: any) => s.element))) as string[], [all]);
  const s = q.trim().toLowerCase();
  const rows = all.filter((k: any) => (!el || k.element === el) && (!s || k.name.toLowerCase().includes(s) || k.effect.toLowerCase().includes(s)));
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
          <thead><tr><th>Skill</th><th>Type</th><th class="num">Cost</th><th>Effect</th><th>Learned by</th></tr></thead>
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
function PlanSteps({ eng, plan, skills }: { eng: Eng; plan: PlanNode; skills: string[] }) {
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
            <li><DemonLink eng={eng} name={n.demon} /><span class="why">{l.length ? l.map(x => x.includes(' at Lv ') ? `learns ${x}` : `knows ${x}`).join(', ') : 'any copy, no skill needed'}</span></li>
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

function Planner({ eng }: { eng: Eng }) {
  const id = eng.cfg.id;
  const meta = gameMeta(id);
  const [target, setTarget] = useState<string>(() => store.get(id + ':planTarget', ''));
  const [skills, setSkills] = useState<string[]>(() => store.get(id + ':planSkills', []));
  const [depth, setDepth] = useState(2);
  const [cap, setCap] = useState(0);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const names = useMemo(() => eng.ix.demons.map((d: any) => d.name).sort(), [eng]);
  const skillNames = useMemo(() => eng.skillNames().filter((n: string) => eng.skill(n)?.inheritable).sort(), [eng]);
  const td = target ? eng.demon(target) : null;
  const slots = eng.cfg.maxSkillSlots;
  useEffect(() => { store.set(id + ':planTarget', target); store.set(id + ':planSkills', skills); setResult(null); }, [target, skills.join('|')]);

  const run = () => {
    if (!target || skills.length === 0) { return; }
    setBusy(true);
    setTimeout(() => {
      const r = planSkills(eng, target, skills, { maxDepth: depth, levelCap: cap || 99, limit: 6 });
      setResult(r); setBusy(false);
    }, 30);
  };

  const blocked = td ? skills.filter(s => {
    const k = eng.skill(s); const elems = eng.cfg.inheritElems;
    if (!elems || !k) { return false; }
    const i = elems.indexOf(k.inherit);
    return i >= 0 && !(td.affinities[i] > 0) && !td.skills.some((x: any) => x.name === s);
  }) : [];

  return (
    <section class="view">
      <header class="view-head"><div><h1>Skill planner</h1>
        <p class="lede">Pick the {meta.unit} you want and up to 8 skills it should end up with. The planner finds the shortest fusion chains where each skill is either passed down from an ingredient or learned by levelling.</p></div></header>
      <div class="planner-grid">
        <section class="panel plan-form">
          <label for="plan-target">{meta.unit === 'demon' ? 'Demon' : 'Persona'} you want</label>
          {td ? (
            <div class="picked"><DemonLink eng={eng} name={target} /><button class="x" aria-label="Clear target" onClick={() => setTarget('')}>Change</button></div>
          ) : (
            <Picker id="plan-target" items={names} placeholder={`Search ${meta.units}`} onPick={setTarget}
              render={v => { const d = eng.demon(v); return <span class="pick-row"><span class="lv">{d.lvl}</span>{v}<span class="rc">{d.race}</span></span>; }} />
          )}
          <label for="plan-skill">Skills it should have <span class="muted">({skills.length} of {Math.min(8, slots)})</span></label>
          <ul class="chips">
            {skills.map(s => { const k = eng.skill(s); return (
              <li class={blocked.includes(s) ? 'chip bad' : 'chip'}><Elem e={k?.element} /> {s}<button aria-label={`Remove ${s}`} onClick={() => setSkills(skills.filter(x => x !== s))}>×</button></li>
            ); })}
          </ul>
          {skills.length < Math.min(8, slots) && <Picker id="plan-skill" items={skillNames.filter((s: string) => !skills.includes(s))} placeholder="Add a skill" onPick={s => setSkills(skills.concat([s]))}
            render={v => { const k = eng.skill(v); return <span class="pick-row"><Elem e={k.element} />{v}<span class="rc">{k.cost}</span></span>; }} />}
          {blocked.length > 0 && <p class="note">{target} cannot inherit {blocked.join(', ')} ({td && td.inherit} inheritance).</p>}
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
          {!result && !busy && <div class="panel ghost"><p>Results show up here as step-by-step fusion lists: the {meta.units} to get first, then each fusion in order with the skills to pass down.</p>{id === 'smt5v' && <p class="muted">Example: Mothman with Me Patra, Mabufula and Media.</p>}{!target && id === 'smt5v' && <button class="btn" onClick={() => { setTarget('Mothman'); setSkills(['Me Patra', 'Mabufula', 'Media']); }}>Load the example</button>}</div>}
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
                    </header>
                    <PlanSteps eng={eng} plan={p} skills={result.skills} />
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

function Party({ eng, party, setParty }: { eng: Eng; party: string[]; setParty: (p: string[]) => void }) {
  const meta = gameMeta(eng.cfg.id);
  const elems: string[] = eng.cfg.resistElems;
  const members = party.map(n => eng.demon(n)).filter(Boolean);
  const names = useMemo(() => eng.ix.demons.map((d: any) => d.name).sort(), [eng]);
  const max = 6;

  const analysis = useMemo(() => {
    const weakCount = elems.map((_, i) => members.filter((m: any) => m.resists[i] === 'wk').length);
    const covered = elems.map((_, i) => members.filter((m: any) => RESIST_RANK[m.resists[i]] >= 2).length);
    const offense = new Set<string>();
    const support: { [k: string]: string[] } = { heal: [], revive: [], cure: [], buff: [], debuff: [] };
    for (const m of members as any[]) {
      for (const s of m.skills) {
        const k = eng.skill(s.name);
        if (!k) { continue; }
        if (elems.includes(k.element) && k.cost !== 'Passive' && /pwr|damage|hits|dmg/i.test(k.effect)) { offense.add(k.element); }
        if (k.element === 'alm' && k.cost !== 'Passive') { offense.add('alm'); }
        for (const t of classifySupport(eng, s.name)) { if (!support[t].includes(m.name)) { support[t].push(m.name); } }
      }
    }
    const avg = members.length ? Math.round(members.reduce((a: number, m: any) => a + m.lvl, 0) / members.length) : 0;
    const problems = elems.map((e, i) => ({ e, i, weak: weakCount[i], cover: covered[i] })).filter(p => p.weak >= 2);
    return { weakCount, covered, offense, support, avg, problems };
  }, [party.join('|'), eng]);

  const suggest = (i: number) => eng.ix.demons
    .filter((d: any) => !party.includes(d.name) && RESIST_RANK[d.resists[i]] >= 3 && Math.abs(d.lvl - analysis.avg) <= 12)
    .sort((a: any, b: any) => Math.abs(a.lvl - analysis.avg) - Math.abs(b.lvl - analysis.avg))
    .slice(0, 4);

  return (
    <section class="view">
      <header class="view-head"><div><h1>Party</h1>
        <p class="lede">{`Line up to six ${meta.units} and check what they leave exposed.`}</p></div></header>

      <section class="panel">
        <div class="party-top">
          <h2>Members <span class="muted">{members.length} / {max}</span></h2>
          {members.length < max && <div class="party-add"><Picker id="party-add" items={names.filter((n: string) => !party.includes(n))} placeholder={`Add a ${meta.unit}`} onPick={n => setParty(party.concat([n]))}
            render={v => { const d = eng.demon(v); return <span class="pick-row"><span class="lv">{d.lvl}</span>{v}<span class="rc">{d.race}</span></span>; }} /></div>}
          {members.length > 0 && <button class="btn subtle" onClick={() => setParty([])}>Clear</button>}
        </div>
        {members.length === 0 ? (
          <div class="ghost-inline">
            <p>No one here yet. Add from the box above or from any {meta.unit} page.</p>
            <button class="btn" onClick={() => setParty(eng.ix.demons.filter((d: any) => d.lvl >= 5 && d.lvl <= 30).sort((a: any, b: any) => a.lvl - b.lvl).filter((_: any, i: number) => i % 5 === 0).slice(0, 4).map((d: any) => d.name))}>Load an example party</button>
          </div>
        ) : (
          <div class="tablewrap">
            <table class="grid party">
              <thead><tr><th>{meta.unit === 'demon' ? 'Demon' : 'Persona'}</th>{elems.map(e => <th class="rescol"><Elem e={e} /></th>)}<th class="tagcol"><span class="sr">Remove</span></th></tr></thead>
              <tbody>
                {members.map((m: any) => (
                  <tr>
                    <td><DemonLink eng={eng} name={m.name} /></td>
                    {m.resists.map((r: string) => <td class="rescol"><ResistCell code={r} blank /></td>)}
                    <td class="tagcol"><button class="x" aria-label={`Remove ${m.name}`} onClick={() => setParty(party.filter(p => p !== m.name))}>×</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr class="sum">
                  <th scope="row">Weak</th>
                  {analysis.weakCount.map(c => <td class={`rescol cnt ${c >= 2 ? 'bad' : c === 1 ? 'meh' : ''}`}>{c || '·'}</td>)}<td />
                </tr>
                <tr class="sum">
                  <th scope="row">Resist or better</th>
                  {analysis.covered.map(c => <td class={`rescol cnt ${c ? 'good' : ''}`}>{c || '·'}</td>)}<td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {members.length > 0 && (
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
            <p class="hint">Lit types have at least one damaging skill in the party, counting learned skills only.</p>
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

// ---------- home ----------
function Home() {
  const series = Array.from(new Set(GAMES.map(g => g.series)));
  return (
    <section class="view home">
      <header class="home-head">
        <img src="logo.png" alt="" width="72" height="72" />
        <div>
          <h1>Cathedral Fusion Tools</h1>
          <p class="lede">Fusion calculator, skill planner and party builder for Megami Tensei games.</p>
        </div>
      </header>
      <div class="series-grid">
        {series.map(sr => (
          <section class="series">
            <h2>{sr}</h2>
            <ul class="gamelist">
              {GAMES.filter(g => g.series === sr).map(g => (
                <li>
                  <a class="gname" href={`#${g.id}`}>{g.name}</a>
                  <span class="glinks">
                    <a href={href({ game: g.id, view: 'skills' })}>Skills</a>
                    {!g.noPlanner && <a href={href({ game: g.id, view: 'planner' })}>Planner</a>}
                    <a href={href({ game: g.id, view: 'party' })}>Party</a>
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

// ---------- shell ----------
function App() {
  const [route, setRoute] = useState<Route>(parseHash());
  const [eng, setEng] = useState<Eng | null>(null);
  const [err, setErr] = useState('');
  const [rev, setRev] = useState(0);
  const [party, setPartyState] = useState<string[]>([]);

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
    loadGame(route.game).then(e => { if (live) { setEng(e); setPartyState(store.get(route.game + ':party', [])); } })
      .catch(e => { if (live) { setErr(String(e.message || e)); } });
    return () => { live = false; };
  }, [route.game]);

  const setParty = useCallback((p: string[]) => { setPartyState(p); store.set(route.game + ':party', p); }, [route.game]);
  if (eng) { eng.rev = rev; }
  curFamily = eng ? eng.cfg.iconSet || eng.cfg.family : '';

  const nav = [
    { view: 'list', label: 'Compendium' },
    { view: 'skills', label: 'Skills' },
    { view: 'planner', label: 'Skill planner' },
    { view: 'party', label: 'Party' + (party.length ? ` · ${party.length}` : '') },
    { view: 'unlocks', label: 'Unlocks' },
  ];
  const active = route.view === 'demon' ? 'list' : route.view === 'skill' ? 'skills' : route.view;
  const meta = gameMeta(route.game);
  const navShown = nav.filter(n => !(n.view === 'planner' && meta.noPlanner) && !(n.view === 'unlocks' && eng && !eng.cfg.unlocks.length));
  useEffect(() => { // sticky table headers sit right under the top bar, whose height varies
    const t = document.querySelector('.top') as HTMLElement | null;
    if (!t) { return; }
    const set = () => document.documentElement.style.setProperty('--top-h', Math.floor(t.getBoundingClientRect().height) + 'px');
    set();
    window.addEventListener('resize', set);
    return () => window.removeEventListener('resize', set);
  });
  useEffect(() => {
    const labels: { [v: string]: string } = { list: 'Compendium', skills: 'Skills', planner: 'Skill planner', party: 'Party', unlocks: 'Unlocks' };
    const page = !eng ? '' : route.view === 'demon' ? eng.ix.bySlug[route.arg!] : route.view === 'skill' ? eng.ix.skillBySlug[route.arg!] : labels[route.view];
    document.title = route.view === 'home' ? 'Cathedral Fusion Tools' : [page, meta.name, 'Cathedral'].filter(Boolean).join(' | ');
  }, [route, eng]);

  let body: any = route.view === 'home' ? <Home /> : <div class="loading"><span class="spin" aria-hidden="true" />Loading {meta.name}</div>;
  if (err) { body = <div class="view"><p class="note">{err}. Reload the page to try again.</p></div>; }
  else if (route.view !== 'home' && eng && eng.cfg.id === route.game) {
    if (route.view === 'demon') { body = <DemonPage eng={eng} slug={route.arg!} party={party} setParty={setParty} />; }
    else if (route.view === 'skill') { body = <SkillPage eng={eng} slug={route.arg!} />; }
    else if (route.view === 'skills') { body = <SkillList eng={eng} />; }
    else if (route.view === 'planner') { body = meta.noPlanner ? <div class="view"><p class="note">{meta.name} has fixed skill sets, so there is nothing to plan.</p></div> : <Planner eng={eng} />; }
    else if (route.view === 'party') { body = <Party eng={eng} party={party} setParty={setParty} />; }
    else if (route.view === 'unlocks') { body = <Unlocks eng={eng} onChange={() => setRev(r => r + 1)} />; }
    else { body = <Compendium eng={eng} />; }
  }

  return (
    <Fragment>
      {route.game && <header class="top">
        <div class="top-inner">
          <a class="brand" href="#home"><img src="logo.png" alt="" width="24" height="24" />Cathedral</a>
          {route.game && <Fragment><span class="sep" aria-hidden="true">/</span><a class="cur-game" href={href({ game: route.game, view: 'list' })}>{meta.name}</a></Fragment>}
          <a class="switch" href="#home">{route.game ? 'Change game' : ''}</a>
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
      </footer>
    </Fragment>
  );
}

const root = document.getElementById('app')!;
root.textContent = '';
render(<App />, root);
