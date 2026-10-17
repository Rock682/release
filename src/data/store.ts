import { SEED_MISTAKES } from './seeds';

/** One released mistake, shown as a golden star. x/y are fractions of the screen (0..1). */
export interface SkyStar {
  id: string;
  text: string;
  x: number;
  y: number;
  releasedAt: number;
  expiresAt: number;
  candles: number;
  mine: boolean;
}

export type StoreEvent =
  | { type: 'added'; star: SkyStar }
  | { type: 'removed'; id: string }
  | { type: 'changed' };

/**
 * Everything the screens need from "the server". The local implementation below
 * keeps data in this browser; a backend version only has to implement this.
 */
export interface SkyStore {
  getStars(): SkyStar[];
  getCount(): number;
  subscribe(fn: (e: StoreEvent) => void): () => void;
  release(text: string): Promise<SkyStar>;
  lightCandle(id: string): Promise<number>;
  report(id: string): Promise<void>;
  /** Called by the sky once an expired star has finished falling. */
  markFallen(id: string): void;
}

const DAY = 86_400_000;
/** How long a star stays in the sky before it falls as a golden shooting star. */
export const LIFESPAN_MS = 7 * DAY;
const MINE_KEY = 'rl.myStars.v1';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a spot that keeps stars from crowding each other. */
function pickSpot(existing: { x: number; y: number }[], rand: () => number) {
  let best = { x: 0.5, y: 0.2 };
  let bestD = -1;
  for (let i = 0; i < 40; i++) {
    const c = { x: 0.07 + rand() * 0.86, y: 0.2 + rand() * 0.64 };
    let d = Infinity;
    for (const s of existing) {
      const dx = (s.x - c.x) * 0.46; // screens are taller than wide
      const dy = s.y - c.y;
      d = Math.min(d, dx * dx + dy * dy);
    }
    if (d > bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

class LocalSkyStore implements SkyStore {
  private stars: SkyStar[] = [];
  private pool: string[] = [];
  private count = 0;
  private listeners = new Set<(e: StoreEvent) => void>();
  private rand = mulberry32(20261009);

  constructor() {
    const now = Date.now();
    const visible = SEED_MISTAKES.slice(0, 56);
    this.pool = SEED_MISTAKES.slice(56);

    visible.forEach((text, i) => {
      const spot = pickSpot(this.stars, this.rand);
      const releasedAt = now - this.rand() * 6.5 * DAY;
      this.stars.push({
        id: `seed-${i}`,
        text,
        x: spot.x,
        y: spot.y,
        releasedAt,
        expiresAt: releasedAt + LIFESPAN_MS,
        candles: Math.floor(this.rand() * 40),
        mine: false,
      });
    });

    // A few old stars fall during a visit, so the sky always feels alive.
    [7, 23, 41].forEach((idx, k) => {
      const s = this.stars[idx];
      if (s) s.expiresAt = now + 45_000 + k * 75_000;
    });

    for (const m of this.loadMine()) {
      if (m.expiresAt > now) this.stars.push(m);
    }
    this.count = this.stars.length;
    this.scheduleOtherRelease();
  }

  private loadMine(): SkyStar[] {
    const raw = safeGet(MINE_KEY);
    if (!raw) return [];
    try {
      const list = JSON.parse(raw) as SkyStar[];
      return Array.isArray(list) ? list.map((s) => ({ ...s, mine: true })) : [];
    } catch {
      return [];
    }
  }

  private saveMine() {
    safeSet(MINE_KEY, JSON.stringify(this.stars.filter((s) => s.mine)));
  }

  private emit(e: StoreEvent) {
    this.listeners.forEach((fn) => fn(e));
  }

  /** Local stand-in for other people releasing while you watch. */
  private scheduleOtherRelease() {
    const delay = 30_000 + Math.random() * 40_000;
    window.setTimeout(() => {
      const text = this.pool.shift();
      if (text) {
        const now = Date.now();
        const spot = pickSpot(this.stars, Math.random);
        const star: SkyStar = {
          id: `other-${now}`,
          text,
          ...spot,
          releasedAt: now,
          expiresAt: now + LIFESPAN_MS,
          candles: 0,
          mine: false,
        };
        this.stars.push(star);
        this.count++;
        this.emit({ type: 'added', star });
        this.scheduleOtherRelease();
      }
    }, delay);
  }

  getStars() {
    return this.stars.slice();
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

  async release(text: string): Promise<SkyStar> {
    const now = Date.now();
    const spot = pickSpot(this.stars, Math.random);
    const star: SkyStar = {
      id: `mine-${now}`,
      text,
      ...spot,
      releasedAt: now,
      expiresAt: now + LIFESPAN_MS,
      candles: 0,
      mine: true,
    };
    this.stars.push(star);
    this.count++;
    this.saveMine();
    this.emit({ type: 'added', star });
    return star;
  }

  async lightCandle(id: string) {
    const s = this.stars.find((x) => x.id === id);
    if (!s) return 0;
    s.candles++;
    if (s.mine) this.saveMine();
    this.emit({ type: 'changed' });
    return s.candles;
  }

  async report(id: string) {
    // Local mode hides the star at once; a backend would queue it for review.
    this.stars = this.stars.filter((s) => s.id !== id);
    this.emit({ type: 'removed', id });
  }

  markFallen(id: string) {
    const before = this.stars.length;
    this.stars = this.stars.filter((s) => s.id !== id);
    if (this.stars.length !== before) {
      this.saveMine();
      this.emit({ type: 'removed', id });
    }
  }
}

export const store: SkyStore = new LocalSkyStore();
