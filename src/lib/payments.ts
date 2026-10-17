/**
 * Payments. Until Razorpay is connected this runs in TEST MODE: nothing is
 * charged and the payment succeeds immediately so the flow can be tried.
 *
 * To go live: create the order on your server (never in the browser), open
 * Razorpay Checkout with that order id, then verify the payment signature on
 * the server before allowing the release. The server should also decide the
 * region (Cloudflare tells it the visitor's country); the guess below is only
 * for showing the right price.
 */
export const PAYMENTS_LIVE = false;

/**
 * Launch switch: when true, every release is free and no payment screen
 * appears. Useful for a launch week (e.g. a Reddit post).
 */
export const LAUNCH_ALL_FREE = false;

export interface Price {
  amount: number;
  currency: 'INR' | 'USD';
  label: string;
}

/** Visitors in India pay in rupees; everyone else in dollars. */
export const IN_INDIA: boolean = (() => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta';
  } catch {
    return false;
  }
})();

/** The first release is free; every release after it costs this much. */
export const RELEASE_PRICE: Price = IN_INDIA
  ? { amount: 49, currency: 'INR', label: '₹49' }
  : { amount: 1, currency: 'USD', label: '$1' };

export const CANDLE_PRICE: Price = IN_INDIA
  ? { amount: 19, currency: 'INR', label: '₹19' }
  : { amount: 1, currency: 'USD', label: '$1' };

export async function pay(_amount: number, _currency: string, _purpose: string): Promise<{ ok: boolean }> {
  if (!PAYMENTS_LIVE) {
    await new Promise((r) => setTimeout(r, 500));
    return { ok: true };
  }
  // Razorpay Checkout goes here once the server endpoint exists.
  return { ok: false };
}
