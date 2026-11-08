export class InjectionToken<T> { constructor(public desc: string) {} }
export type Signal<T> = () => T;
export function signal(v: any) { const s: any = () => v; s.set = (n: any) => { v = n; }; s.asReadonly = () => s; return s; }
export type WritableSignal<T> = Signal<T> & { set(v: T): void };
export function Injectable(_?: any) { return (t: any) => t; }
export function Inject(_: any) { return (_t: any, _k: any, _i: number) => {}; }
export function computed(f: () => any) { return f; }
