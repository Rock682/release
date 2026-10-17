# Backend (Supabase)

Project: `the-release` (ref `choynspqgiijvshdhjny`, region Mumbai).

All tables are locked (RLS on, no direct access). The app talks only to these functions:

| Function | What it does |
|---|---|
| `get_sky(visitor)` | Visible, not-yet-fallen stars (newest 400) + all-time count |
| `get_allowance(visitor)` | `{ free, credits, allFree, testMode }` |
| `release_star(visitor, body)` | First release free (falls after 48 h); paid releases are eternal. 5/hour per visitor, 15/hour per network. Errors: `payment_required`, `slow_down`, `empty` |
| `add_test_credit(visitor)` | Test mode only: stands in for a verified payment |
| `light_candle(visitor, star)` | One candle per visitor per star (test mode only for now) |
| `report_star(visitor, star)` | 3 different reporters hide a star |

Live updates: a database trigger broadcasts `star`, `hide` and `candle` events on the public Realtime channel `sky` (public fields only, never the owner).

## Switches (table `settings`)

- `launch_all_free` — `true` makes every release free (still 48 h) for a launch week.
- `free_lifespan_hours` — how long free stars stay (48).
- `payments_test_mode` — `true` until Razorpay/Cashfree is wired up through an Edge Function.

```sql
update public.settings set value = 'true' where key = 'launch_all_free';
```
