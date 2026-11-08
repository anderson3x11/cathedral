// Skill planner: finds short fusion chains that carry chosen skills into a target demon.
// Works on any GameEngine. A "mask" is a bitset over the wanted skills.

export interface PlanNode {
  demon: string;
  mask: number;          // wanted skills this demon ends up holding
  inherited: number;     // wanted skills it receives from its parents
  native: number;        // wanted skills it learns itself
  steps: number;         // fusions needed to make it with this mask
  maxLvl: number;        // highest base level of anything in the tree
  parents: PlanNode[];   // empty = obtain directly (recruit or plain fusion)
}

export interface PlanResult {
  skills: string[];
  plans: PlanNode[];
  missing: string[];     // skills nobody can pass to the target
  truncated: boolean;
}

type Eng = any;

function popcount(n: number) { let c = 0; while (n) { n &= n - 1; c++; } return c; }

export function inheritMaskFor(eng: Eng, demon: string, skills: string[]): number {
  const d = eng.demon(demon);
  const elems: string[] | undefined = eng.cfg.inheritElems;
  let m = 0;
  skills.forEach((s, i) => {
    const sk = eng.skill(s);
    if (!sk || !sk.inheritable) { return; }
    if (elems && d && d.affinities && d.affinities.length) {
      const idx = elems.indexOf(sk.inherit);
      if (idx >= 0 && !(d.affinities[idx] > 0)) { return; }
    }
    m |= 1 << i;
  });
  return m;
}

function nativeMaskFor(eng: Eng, demon: string, skills: string[], maxLevel: number): number {
  const d = eng.demon(demon);
  if (!d) { return 0; }
  let m = 0;
  skills.forEach((s, i) => {
    const hit = d.skills.find((k: any) => k.name === s);
    if (hit && (hit.level < 2 || (hit.level < 100 && hit.level <= maxLevel))) { m |= 1 << i; }
  });
  return m;
}

/**
 * maxDepth: number of fusion layers below the final fusion (0..3).
 * levelCap: ignore demons above this base level as ingredients (keeps plans realistic).
 */
export function planSkills(eng: Eng, target: string, skills: string[], opts: { maxDepth?: number; levelCap?: number; limit?: number; owned?: Set<string> } = {}): PlanResult {
  const maxDepth = opts.maxDepth ?? 2;
  const levelCap = opts.levelCap ?? 99;
  const limit = opts.limit ?? 8;
  const full = (1 << skills.length) - 1;
  const names: string[] = eng.demonNames().filter((n: string) => eng.isEnabled(n));
  const lvl = (n: string) => eng.demon(n)?.lvl ?? 99;
  const pool = names.filter(n => lvl(n) <= levelCap);

  const nativeCache = new Map<string, number>();
  const inheritCache = new Map<string, number>();
  const native = (n: string) => { let v = nativeCache.get(n); if (v === undefined) { v = nativeMaskFor(eng, n, skills, 99); nativeCache.set(n, v); } return v; };
  const inherits = (n: string) => { let v = inheritCache.get(n); if (v === undefined) { v = inheritMaskFor(eng, n, skills); inheritCache.set(n, v); } return v; };

  const recipeCache = new Map<string, string[][]>();
  const recipesOf = (n: string): string[][] => {
    let r = recipeCache.get(n);
    if (!r) {
      const sp = eng.special(n);
      r = sp.length > 1 ? [sp] : eng.reverse(n).map((p: any) => [p.a, p.b]);
      // ponytail: trios only for demons with no two-demon recipe, capped to the 40 easiest.
      // Computing trios for every demon takes ~20 s in P4G; lift this if the planner moves to a Web Worker.
      if (!r.length) {
        r = eng.reverseTriple(n).map((t: string[]) => [t, Math.max(...t.map(lvl))] as [string[], number])
          .sort((a: any, b: any) => a[1] - b[1]).slice(0, 40).map((x: any) => x[0]);
      }
      r = r.filter(group => group.every(g => lvl(g) <= levelCap && eng.isEnabled(g) && g !== target));
      recipeCache.set(n, r);
    }
    return r;
  };

  // Which skills could ever reach the target?
  const holders = skills.map(s => (eng.skill(s)?.learnedBy || []).filter((l: any) => l.level < 100 && pool.includes(l.demon)).map((l: any) => l.demon));
  const targetInherit = inherits(target) | native(target);
  const missing = skills.filter((s, i) => holders[i].length === 0 && !(native(target) & (1 << i)) || !(targetInherit & (1 << i)));

  // Layered DP. best: demon -> list of non-dominated nodes.
  type Table = Map<string, PlanNode[]>;
  const base: Table = new Map();
  for (const n of pool) {
    base.set(n, [{ demon: n, mask: native(n), inherited: 0, native: native(n), steps: 0, maxLvl: lvl(n), parents: [] }]);
  }

  const better = (a: PlanNode, b: PlanNode) =>
    a.steps !== b.steps ? a.steps < b.steps : a.maxLvl < b.maxLvl;

  function addNode(list: PlanNode[], node: PlanNode): boolean {
    for (const o of list) {
      if ((o.mask & node.mask) === node.mask && !better(node, o)) { return false; }
    }
    for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i];
      if ((node.mask & o.mask) === o.mask && !better(o, node)) { list.splice(i, 1); }
    }
    list.push(node);
    return true;
  }

  function combine(group: string[], table: Table, child: string): PlanNode[] {
    // Merge parent options; keep only useful masks.
    let partial: { mask: number; steps: number; maxLvl: number; parents: PlanNode[] }[] = [{ mask: 0, steps: 0, maxLvl: 0, parents: [] }];
    for (const g of group) {
      const opts = table.get(g);
      if (!opts) { return []; }
      const next: typeof partial = [];
      for (const p of partial) {
        for (const o of opts) {
          next.push({ mask: p.mask | o.mask, steps: p.steps + o.steps, maxLvl: Math.max(p.maxLvl, o.maxLvl), parents: p.parents.concat([o]) });
        }
      }
      // prune
      next.sort((a, b) => a.steps - b.steps || a.maxLvl - b.maxLvl);
      const kept: typeof partial = [];
      for (const n of next) {
        if (!kept.some(k => (k.mask & n.mask) === n.mask && k.steps <= n.steps && k.maxLvl <= n.maxLvl)) { kept.push(n); }
        if (kept.length > 24) { break; }
      }
      partial = kept;
    }
    const inh = inherits(child), nat = native(child);
    return partial.map(p => {
      const inherited = p.mask & inh & ~nat;
      return {
        demon: child, mask: inherited | nat, inherited, native: nat,
        steps: p.steps + 1, maxLvl: Math.max(p.maxLvl, lvl(child)), parents: p.parents
      };
    });
  }

  let table = base;
  let truncated = false;
  const started = Date.now();
  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: Table = new Map();
    for (const [k, v] of table) { next.set(k, v.slice()); }
    for (const n of pool) {
      if (Date.now() - started > 4000) { truncated = true; break; }
      if (n === target) { continue; }
      for (const group of recipesOf(n)) {
        // Skip groups that cannot add anything new.
        let possible = 0;
        for (const g of group) { for (const o of table.get(g) || []) { possible |= o.mask; } }
        if (!(possible & inherits(n) & ~native(n))) { continue; }
        for (const node of combine(group, table, n)) {
          if (node.inherited) { addNode(next.get(n)!, node); }
        }
      }
    }
    table = next;
  }

  // Final fusion into the target.
  const finals: PlanNode[] = [];
  const want = full & ~missingMask(skills, missing);
  for (const group of recipesOf(target)) {
    for (const node of combine(group, table, target)) {
      if (node.mask & want || want === 0) { finals.push(node); }
    }
  }
  finals.sort((a, b) => popcount(b.mask & want) - popcount(a.mask & want) || a.steps - b.steps || a.maxLvl - b.maxLvl);

  // Keep distinct top-level pairs.
  const seen = new Set<string>();
  const plans: PlanNode[] = [];
  for (const f of finals) {
    const key = f.parents.map(p => p.demon).sort().join('+');
    if (seen.has(key)) { continue; }
    seen.add(key);
    plans.push(f);
    if (plans.length >= limit) { break; }
  }
  return { skills, plans, missing, truncated };
}

function missingMask(skills: string[], missing: string[]) {
  let m = 0;
  skills.forEach((s, i) => { if (missing.includes(s)) { m |= 1 << i; } });
  return m;
}

export function maskToSkills(mask: number, skills: string[]): string[] {
  return skills.filter((_, i) => mask & (1 << i));
}
