/**
 * Release allowance: the first release is free; each later one is paid for
 * just before its ritual (a payment adds one credit, the ritual spends it).
 * Stored on this device for now; with a backend this moves server-side so it
 * can't be edited from the browser.
 */
import { LAUNCH_ALL_FREE } from './payments';

const KEY = 'rl.wallet.v1';

interface Wallet {
  freeUsed: boolean;
  credits: number;
}

function load(): Wallet {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const w = JSON.parse(raw) as Partial<Wallet>;
      return { freeUsed: !!w.freeUsed, credits: Math.max(0, Number(w.credits) || 0) };
    }
  } catch {
    /* ignore */
  }
  return { freeUsed: false, credits: 0 };
}

function save(w: Wallet) {
  try {
    localStorage.setItem(KEY, JSON.stringify(w));
  } catch {
    /* ignore */
  }
}

export const wallet = {
  get(): Wallet {
    return load();
  },
  canRelease(): boolean {
    if (LAUNCH_ALL_FREE) return true;
    const w = load();
    return !w.freeUsed || w.credits > 0;
  },
  /** Spend one release. Returns false if none are available. */
  spend(): boolean {
    if (LAUNCH_ALL_FREE) return true;
    const w = load();
    if (!w.freeUsed) {
      save({ ...w, freeUsed: true });
      return true;
    }
    if (w.credits > 0) {
      save({ ...w, credits: w.credits - 1 });
      return true;
    }
    return false;
  },
  add(n: number) {
    const w = load();
    save({ ...w, credits: w.credits + n });
  },
};
