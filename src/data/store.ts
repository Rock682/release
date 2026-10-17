import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from '../lib/config';
import { SEED_MISTAKES } from './seeds';

/** One released mistake, shown as a golden star. x/y are fractions of the screen (0..1). */
export interface SkyStar {
  id: string;
  text: string;
  x: number;
  y: number;
  releasedAt: number;
  /** When it falls. Infinity = eternal (paid). */
  expiresAt: number;
  candles: number;
  mine: boolean;
}

/** What this visitor may do next, decided by the server. */
export interface Allowance {
  free: boolean;
  credits: number;
  allFree: boolean;
  testMode: boolean;
}

export type StoreEvent =
  | { type: 'added'; star: SkyStar }
  | { type: 'removed'; id: string }
  | { type: 'changed' };

/** Errors the server can give a release, in plain words for the app. */
export type ReleaseError = 'payment_required' | 'slow_down' | 'empty' | 'offline';

export interface SkyStore {
  getStars(): SkyStar[];
  getCount(): number;
  subscribe(fn: (e: StoreEvent) => void): () => void;
  getAllowance(): Promise<Allowance>;
  /** Test mode only: stands in for a verified payment. */
  addTestCredit(): Promise<Allowance>;
  release(text: string): Promise<SkyStar>;
  lightCandle(id: string): Promise<number>;
  report(id: string): Promise<void>;
  /** Called by the sky once an expired star has finished falling. */
  markFallen(id: string): void;
}

const VISITOR_KEY = 'rl.visitor.v1';
const REFRESH_MS = 60_000;

/** A random, anonymous id for this browser. No name, no account. */
function visitorId(): string {
  const make = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = make();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return make(); // private mode: a fresh id per visit
  }
}

interface RawStar {
  id: string;
  text: string;
  x: number;
  y: number;
  releasedAt: number;
  expiresAt: number | null;
  candles: number;
  mine?: boolean;
}

const toStar = (r: RawStar): SkyStar => ({
  id: r.id,
  text: r.text,
  x: r.x,
  y: r.y,
  releasedAt: r.releasedAt,
  expiresAt: r.expiresAt == null ? Infinity : r.expiresAt,
  candles: r.candles,
  mine: !!r.mine,
});

function errorCode(e: unknown): ReleaseError {
  const msg = String((e as { message?: string })?.message ?? e);
  if (msg.includes('payment_required')) return 'payment_required';
  if (msg.includes('slow_down')) return 'slow_down';
  if (msg.includes('empty')) return 'empty';
  return 'offline';
}

/** Shown only if the server can't be reached, so the sky is never empty. */
function offlineSky(): SkyStar[] {
  const now = Date.now();
  return SEED_MISTAKES.slice(0, 40).map((text, i) => ({
    id: `offline-${i}`,
    text,
    x: 0.07 + ((i * 0.6180339) % 1) * 0.86,
    y: 0.2 + ((i * 0.4142135) % 1) * 0.64,
    releasedAt: now - i * 3_600_000,
    expiresAt: Infinity,
    candles: (i * 7) % 30,
    mine: false,
  }));
}

/** The shared sky, kept in Supabase. Live updates arrive over Realtime. */
class SupabaseSkyStore implements SkyStore {
  private db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  private visitor = visitorId();
  private stars = new Map<string, SkyStar>();
  private hidden = new Set<string>(); // reported or fallen here; never bring back
  private count = 0;
  private offline = false;
  private listeners = new Set<(e: StoreEvent) => void>();

  constructor() {
    void this.load();
    window.setInterval(() => void this.load(), REFRESH_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.load();
    });
    this.listen();
  }

  private emit(e: StoreEvent) {
    this.listeners.forEach((fn) => fn(e));
  }

  /** Fetch the whole visible sky (also catches anything Realtime missed). */
  private async load() {
    const { data, error } = await this.db.rpc('get_sky', { visitor: this.visitor });
    if (error || !data) {
      if (this.stars.size === 0) {
        this.offline = true;
        offlineSky().forEach((s) => this.stars.set(s.id, s));
        this.count = this.stars.size;
        this.emit({ type: 'changed' });
      }
      return;
    }
    const payload = data as { count: number; stars: RawStar[] };
    const next = new Map<string, SkyStar>();
    for (const r of payload.stars) {
      if (this.hidden.has(r.id)) continue;
      const prev = this.stars.get(r.id);
      next.set(r.id, { ...toStar(r), mine: prev?.mine || !!r.mine });
    }
    // A release that landed while this request was in flight: keep it.
    for (const s of this.stars.values()) {
      if (s.mine && !next.has(s.id) && !this.hidden.has(s.id) && Date.now() - s.releasedAt < 120_000) next.set(s.id, s);
    }
    this.stars = next;
    this.offline = false;
    this.count = Math.max(payload.count, this.count);
    this.emit({ type: 'changed' });
  }

  private listen() {
    this.db
      .channel('sky')
      .on('broadcast', { event: 'star' }, ({ payload }) => {
        const r = payload as RawStar;
        if (!r?.id || this.stars.has(r.id) || this.hidden.has(r.id)) return;
        const star = toStar(r);
        this.stars.set(star.id, star);
        this.count++;
        this.emit({ type: 'added', star });
      })
      .on('broadcast', { event: 'hide' }, ({ payload }) => {
        const id = (payload as { id: string })?.id;
        if (id && this.stars.delete(id)) this.emit({ type: 'removed', id });
      })
      .on('broadcast', { event: 'candle' }, ({ payload }) => {
        const p = payload as { id: string; candles: number };
        const s = p?.id ? this.stars.get(p.id) : undefined;
        if (s && p.candles > s.candles) {
          s.candles = p.candles;
          this.emit({ type: 'changed' });
        }
      })
      .subscribe();
  }

  getStars() {
    return [...this.stars.values()];
  }
  getCount() {
    return this.count;
  }
  subscribe(fn: (e: StoreEvent) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  async getAllowance(): Promise<Allowance> {
    const { data, error } = await this.db.rpc('get_allowance', { visitor: this.visitor });
    if (error || !data) throw new Error(errorCode(error));
    return data as Allowance;
  }

  async addTestCredit(): Promise<Allowance> {
    const { data, error } = await this.db.rpc('add_test_credit', { visitor: this.visitor });
    if (error || !data) throw new Error(errorCode(error));
    return data as Allowance;
  }

  async release(text: string): Promise<SkyStar> {
    const { data, error } = await this.db.rpc('release_star', { visitor: this.visitor, body: text });
    if (error || !data) throw new Error(errorCode(error));
    const star = { ...toStar(data as RawStar), mine: true };
    if (!this.stars.has(star.id)) {
      this.stars.set(star.id, star);
      this.count++;
      this.emit({ type: 'added', star });
    } else {
      // Realtime got here first: keep the star, mark it ours.
      this.stars.get(star.id)!.mine = true;
    }
    return star;
  }

  async lightCandle(id: string) {
    const s = this.stars.get(id);
    if (this.offline || !s) return s?.candles ?? 0;
    const { data, error } = await this.db.rpc('light_candle', { visitor: this.visitor, star: id });
    if (error) throw new Error(errorCode(error));
    s.candles = Math.max(s.candles, Number(data) || 0);
    this.emit({ type: 'changed' });
    return s.candles;
  }

  async report(id: string) {
    // Hide it here at once; three different reports hide it for everyone.
    this.hidden.add(id);
    if (this.stars.delete(id)) this.emit({ type: 'removed', id });
    if (!this.offline) await this.db.rpc('report_star', { visitor: this.visitor, star: id });
  }

  markFallen(id: string) {
    this.hidden.add(id);
    if (this.stars.delete(id)) this.emit({ type: 'removed', id });
  }
}

export const store: SkyStore = new SupabaseSkyStore();
