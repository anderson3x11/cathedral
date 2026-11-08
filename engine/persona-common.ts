export function withPartyAndCodes(demons: any, parties: any, prereqs?: any, traits = false) {
  Object.assign(demons, parties);
  for (const demon of Object.values(demons) as any[]) {
    demon['code'] = 1;
    if (demon['itemr']) { demon['item'] = `${demon['item']}, ${demon['itemr']}`; }
    if (traits && demon['trait']) { demon['skills'][demon['trait']] = 0; }
  }
  for (const [name, prereq] of Object.entries(prereqs || {})) { demons[name].prereq = prereq; }
  for (const demon of Object.values(parties) as any[]) {
    demon['fusion'] = 'party';
  }
}
export const PERSONA_COST_TYPES = [2 << 10, (5 << 10) - 1000, (19 << 10) - 2001];
export const computePrice = (b: any) => 2000 + b.stats.reduce((acc: number, x: number) => acc + x, 0) ** 2;
