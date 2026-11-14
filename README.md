# Vehicle Service BD — ভেহিকল সার্ভিস বিডি

Offline bilingual (EN/বাংলা) service & maintenance log for Bangladeshi bike and car owners. Log every service, track what it cost, and never miss the next oil change: each service can carry a next-due odometer reading and/or a next-due interval in months, and the dashboard flags what is overdue or due soon.

## Problem

Bike and car owners in Bangladesh track servicing in notebooks or memory — oil changes, brake pads, chains, tyres. Missed intervals cost money (worn parts) and safety (brakes, tyres). Existing factory apps cover fuel (`fuel-tracker-bd`) and bills, but none logs **maintenance** with due reminders.

## Features

1. **Vehicle garage** — add bikes, cars, CNG/autos, microbuses with brand/model, plate, purchase date, current odometer; per-vehicle totals and last-service date; inline odometer update.
2. **Service log** — date, odometer, 11 service types (engine oil, filters, brake pad, chain, tyre, battery, clutch, general, repair, other), workshop, cost, notes, optional next-due km and next-due months.
3. **Due engine** — overdue if the due date passed *or* the odometer reached the due km; "due soon" within 30 days or 500 km; overdue sorts first on the dashboard.
4. **Dashboard** — total spent (all time / this year), service & vehicle counts, upcoming dues, spending per vehicle with bars, 5 most recent services.
5. **Smart odometer validation** — readings must stay consistent with the service timeline: never lower than an earlier-dated service, never higher than a later-dated one. Backfilling older services works.
6. **Data** — JSON export (download), JSON import with strict validation (malformed files rejected, data untouched), typed-`DELETE` erase-all.
7. **Bilingual + mobile** — EN/বাংলা toggle persisted, Bengali digits throughout, 390px mobile layout, print-friendly service history, zero network requests.

## Tech stack

- Vanilla HTML/CSS/JS — no build step, no dependencies, no framework.
- `js/core.js` — pure logic (money as integer paisa, odometer as integer km, ISO dates), shared by the browser app and the Node unit tests.
- `js/app.js` — DOM rendering, forms, i18n, localStorage persistence.
- All data lives in `localStorage` under `vsbd_v1`. Nothing leaves the browser.

## Prerequisites

Any modern browser. For tests: Node.js 18+ and a headless Chromium (tests use the Playwright `headless_shell` binary already cached on this machine; no install needed).

## Run locally

```bash
# just open it
open index.html
# or serve it
python3 -m http.server 8000
# then visit http://localhost:8000
```

Deterministic "today" for testing: open `index.html?asof=2026-11-14`.

## Testing

```bash
node tests/test-core.js     # 34 Node unit checks (money, dates, validators, due engine, import)
node tests/smoke.mjs        # 39 headless-Chrome checks driving the real UI (?asof=2026-11-14)
node tests/smoke.mjs 390 844  # 40 checks incl. 390px no-overflow check
```

Hand-verified scenario (also asserted in tests): Hero Splendor bike at 12,000 km; brake pad 2026-10-05 @ 10,800 km for ৳1,200; engine oil 2026-11-01 @ 11,500 km for ৳850 with next due 12,500 km / 3 months → dashboard total **৳2,050.00**, due status **Due soon (500 km left, due 2027-02-01)**. See `TEST_RESULTS.md` for the full list.

## Deployment

Static site — any static host works. GitHub Pages: push to `main` and enable Pages (branch `main`, folder `/ (root)`).

## Limitations

- Service intervals are **your own records**, not manufacturer schedules — always follow your vehicle manual and your mechanic's advice.
- Odometer readings are trusted as entered; the app only checks timeline consistency, it cannot detect a tampered meter.
- One browser, one device: data is local only, no sync, no accounts.
- Costs are stored as integer paisa (BDT); other currencies are not supported.

## Status

v1.0 — complete MVP. Factory run #329 (2026-11-14, 10:00 slot). 34/34 unit + 39/39 desktop smoke + 40/40 mobile smoke, 0 console/page errors.
