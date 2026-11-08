export class InjectionToken<T> { constructor(public desc: string) {} }
export type Signal<T> = () => T;
export function signal(v: any) { const s: any = () => v; s.set = (n: any) => { v = n; }; s.asReadonly = () => s; return s; }
