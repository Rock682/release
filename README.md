# The Release

Write the mistake you carry, watch it become a star, and let it go.
React 19 + TypeScript + Vite. The sky is a single HTML5 canvas.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production files in dist/
```

## What's in here

| Path | What it does |
| --- | --- |
| `src/sky/engine.ts` | The moving galaxy: spiral arms, ~1,500–3,400 stars in 3 depth layers turning slowly, golden mistake stars, shooting stars, falling (expired) stars, birth flare, grain, vignette. Drops detail on slow phones. |
| `src/sky/StarSky.tsx` | Puts the canvas on screen; mouse, touch and phone tilt (asks permission on iPhone). |
| `src/screens/` | Begin, Ritual (4.2 s: veil, glow, dissolve, birth, rise), Forgiveness, Care, Explore, Star sheet, Release again (payment), Share. |
| `src/data/store.ts` | Everything the app needs from "the server". **Currently stored only in this browser**, with starter stars. Swap `LocalSkyStore` for a backend version. |
| `src/lib/safety.ts` | Crisis check (shows the Care screen) and removal of numbers, emails, links and @handles. |
| `src/lib/wallet.ts` | First release free, then one paid release at a time. |
| `src/lib/payments.ts` | Prices: first release free, then ₹49 in India or $1 elsewhere per release; candles ₹19 / $1. `LAUNCH_ALL_FREE` makes every release free (launch week). **Test mode**: no money is taken. Razorpay goes here. |
| `src/lib/shareCard.ts` | The share card: a unique galaxy per star, story (1080×1920) or square (1080×1080), three line choices, shared through the phone's share sheet. Never contains the person's words. |

## Before launch

- Backend: shared stars across all visitors, real counter, server-side moderation, credits stored on the server.
- Razorpay: order created and verified on the server; set `PAYMENTS_LIVE = true`.
- Confirm the helpline on the Care screen (Tele-MANAS 14416, India) and add other countries.
- Privacy policy and terms.
