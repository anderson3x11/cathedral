// Demon artwork, hotlinked from the Megami Tensei Fandom wiki at view time (nothing is stored in this repo).
// Set ART_WIKI to '' to remove all artwork.
export const ART_WIKI = 'https://megamitensei.fandom.com';

export interface Art { src: string; page: string; file: string }

// File-name tags per game, best first. Fandom names art like "Pixie P5R.jpg", "Abaddon SMTV.jpg", "SMT III Abaddon.png".
const B = (s: string) => new RegExp(`(^|[^a-z0-9])(${s})([^a-z0-9]|$)`, 'i');
const SMT5 = [B('smtv|smt v|smt5|smt 5')];
const P3 = [B('p3p'), B('fes'), B('p3')];
const P4 = [B('p4g'), B('p4')];
const P5 = [B('p5r'), B('p5')];
const RAIDOU = [B('raidou|krch|krao|rrch|dsr\\d?')];
const TAGS: { [game: string]: RegExp[] } = {
  smt1: [B('smt|smt1|psx')], smt2: [B('smt ?ii|smt2|psx')], smtif: [B('smtif|smt if')], smt9: [B('nine|dds9')],
  smt3: [B('smt ?iii|smt3|nocturne')], smtim: [B('imagine')], smtsj: [B('smtsj|sj|strange journey|smtds')],
  smtdsj: [B('dsj|sjr|redux'), B('smtsj|sj|strange journey|smtds')], smt4: [B('smt ?iv|smt4')], smt4f: [B('smt ?iva|smt4f|apocalypse'), B('smt ?iv|smt4')],
  smt5: SMT5, smt5v: SMT5,
  p1: [B('p1')], p2t: [B('is'), B('p2')], p2b: [B('ep'), B('p2')],
  p3: P3, p3f: P3, p3a: P3, p3p: P3, p3r: [B('p3r'), ...P3], p4: P4, p4g: P4,
  p5: P5, p5r: P5, p5s: [B('p5s'), ...P5], p5t: [B('p5t'), ...P5], pq: [B('pq')], pq2: [B('pq2'), B('pq')],
  dsum: [B('devil summoner|dsum')], dssh: [B('dssh|soul hackers')], krch: RAIDOU, krao: RAIDOU, rrch: [B('rrch|remastered'), ...RAIDOU],
  sh2: [B('sh2|soul hackers 2')], ds1: [B('desu|dsr1|devil survivor')], dso: [B('desu|dsr1|devil survivor')],
  ds2: [B('desu 2|ds2|devil survivor 2')], ds2br: [B('desu 2|ds2|devil survivor 2')],
  kmt1: [B('mt1|kmt')], mjn1: [B('mjt|majin')], mjn2: [B('mjt|majin')],
};
// Merchandise, sprites, cards, ads and other non-artwork uploads.
const SKIP = /icon|card|sprite|flag|logo|battle|anime|manga|movie|model|funko|puzzle|dx2|p5x|wallpaper|steam|daily|vol[ _]\d/i;
const IMAGE = /\.(png|jpe?g|webp)$/i;

const norm = (s: string) => s.normalize('NFKD').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
const cache = new Map<string, Promise<Art | null>>();

export function demonArt(game: string, demon: string): Promise<Art | null> {
  if (!ART_WIKI) { return Promise.resolve(null); }
  const key = game + '|' + demon;
  if (!cache.has(key)) { cache.set(key, lookup(game, demon).catch(() => null)); }
  return cache.get(key)!;
}

async function api(params: string) {
  const r = await fetch(`${ART_WIKI}/api.php?format=json&origin=*&redirects=1&${params}`);
  return r.json();
}

async function lookup(game: string, demon: string): Promise<Art | null> {
  const title = encodeURIComponent(demon);
  // 1. file names on the demon's page + the page's own infobox image (fallback)
  const data = await api(`action=query&titles=${title}&prop=images|pageimages&imlimit=500&piprop=thumbnail|name&pithumbsize=400`);
  const pg = (Object.values(data?.query?.pages || {}) as any[])[0];
  if (!pg || pg.missing !== undefined) { return null; }
  const name = norm(demon.replace(/ (A|B|P)$/, ''));
  // Drop the demon's own name so a glued tag ("PixieSMT3.jpg") still stands alone.
  const nameRe = new RegExp(demon.replace(/ (A|B|P)$/, '').split(/[^A-Za-z0-9]+/).filter(Boolean).join('[^a-z0-9]?'), 'ig');
  const bare = (t: string) => t.normalize('NFKD').replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(nameRe, ' ');
  const mine = ((pg.images || []) as any[]).map(i => i.title as string)
    .filter(t => IMAGE.test(t) && !SKIP.test(t) && norm(t).includes(name));
  const arty = (t: string) => /art|render/i.test(bare(t)) ? 0 : 1; // proper artwork before screenshots
  mine.sort((x, y) => arty(x) - arty(y));
  for (const tag of TAGS[game] || []) {
    const hit = mine.find(t => tag.test(bare(t)));
    if (hit) {
      // 2. thumbnail URL for the chosen file
      const info = await api(`action=query&titles=${encodeURIComponent(hit)}&prop=imageinfo&iiprop=url&iiurlwidth=400`);
      const f = (Object.values(info?.query?.pages || {}) as any[])[0];
      const ii = f?.imageinfo?.[0];
      if (ii) { return { src: ii.thumburl || ii.url, file: hit.replace(/^File:/, ''), page: ii.descriptionurl }; }
    }
  }
  if (pg.thumbnail?.source) {
    return { src: pg.thumbnail.source, file: pg.pageimage, page: `${ART_WIKI}/wiki/File:${encodeURIComponent(pg.pageimage)}` };
  }
  return null;
}
