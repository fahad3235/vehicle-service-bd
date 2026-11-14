# Vehicle Service BD — TEST RESULTS

Run #329 · 2026-11-14 (10:00 slot) · `?asof=2026-11-14` for deterministic dates

## Node unit tests — 34/34 passed

`node tests/test-core.js`

- Money: `parseAmount('1,250.50')` = 125050 paisa; Bengali `'১২৫০.৫০'` = 125050; rejects empty/letters/negative/3-decimals.
- Odometer: `parseKm('১২,৫০০')` = 12500; rejects decimals/negatives.
- Formatting: `fmtMoney(205000)` = `৳2,050.00` (EN) / `৳২,০৫০.০০` (BN); `fmtKm(12500)` = `12,500` / `১২,৫০০`.
- Dates: `isValidDateStr` rejects `2026-02-30`, `2026-13-01`; `addMonthsISO('2026-01-31', 1)` = `2026-02-28` (clamped); `2024-01-31 + 1` = `2024-02-29` (leap); `daysBetween` exact ±30.
- Vehicle validation: rejects empty name, bad type, negative/fractional odo, future/bad purchase date.
- Service validation: rejects future date, unknown vehicle, bad type, zero/negative cost, `dueKm <= odo`, `dueMonths` 0/37.
- Odometer timeline: 11,499 after 11,500 → `odo-decreased`; equal 11,500 allowed; **backfill** 2026-10-05 @ 10,800 after 2026-11-01 @ 11,500 allowed; inserting 2026-10-20 @ 12,000 → `odo-too-high`, @ 10,000 → `odo-decreased`, @ 11,100 allowed.
- Due engine (asOf 2026-11-14, odo 12,000): no due → `none`; dueKm 12,500 + due 2027-02-01 → `soon`, 500 km / 79 days left; dueKm 12,000 → `overdue`, 0 km left; due date 2026-08-01 → `overdue`, −105 days; due 2026-12-01 → `soon`, 17 days; 501 km left + far date → `ok`; exactly 30 days → `soon`, 31 days → `ok`.
- Summarize: 850 + 1,200 = **৳2,050.00** total & this-year; prior-year service excluded from year total; overdue sorts before soon.
- Import: export → parse → `validateImport` passes; rejects null, version 2, wrong shapes, duplicate ids, dangling vehicle refs, decreased odo, zero cost.

Repairs during this run: 1 real logic fix — `validateImport` first reused `validateService`'s global-max odo check, which wrongly rejected a valid export (earlier service below the later max); replaced with per-field checks + date-ordered monotonicity. 1 real UX fix — `validateService` first rejected backfilling older services; replaced with date-aware bounds (`odoBoundsFor`). 2 harness-only fixes (await-precedence in smoke assertions).

## Headless-Chrome smoke — 39/39 desktop + 40/40 mobile passed, 0 console/page errors

`node tests/smoke.mjs` (1280×800) and `node tests/smoke.mjs 390 844`

- Initial render: title, 4 tabs, zeroed stats, empty dues/vehicles messages, service-form hint visible until a vehicle exists.
- Add vehicle "Hero Splendor" (bike, 12,000 km): appears in list, dashboard vehicle count 1; empty name rejected inline, no second vehicle added.
- Add service engine-oil 2026-11-01 @ 11,500 km, ৳850, due 12,500 km / 3 mo: history row shows ৳850.00, "Rahim Motors", **Due soon**, **500 km left**.
- Decreased odo (11,000 on 2026-11-05) rejected inline; row count stays 1.
- Backfill brake-pad 2026-10-05 @ 10,800 km, ৳1,200: added (2 rows), newest-first order.
- Dashboard: total **৳2,050.00**, this-year **৳2,050.00**, 2 services, dues list shows Hero Splendor, recent shows Brake pad, per-vehicle total ৳2,050.00.
- BN toggle: stats render `৳২,০৫০.০০`, tab label `ড্যাশবোর্ড`; persists across reload; data persists across reload (2 services).
- Export → erase → import round-trip: localStorage holds state; empty-state import succeeds and wipes; malformed import (vehicle missing fields) rejected with data intact; restoring the export brings back 2 services.
- Typed-DELETE: erase button disabled until `DELETE` typed, enabled after, wipes everything.
- Zero network requests observed (`performance.getEntriesByType('resource')` = 0).
- 390px: no horizontal overflow outside the table scroll wrapper.

## Files

- `index.html` — app shell (pure ASCII; Bengali via JS i18n)
- `css/style.css` — styles, 390px + print rules
- `js/core.js` — pure logic (CommonJS + `window.VSBD`)
- `js/app.js` — UI + i18n (Bengali as `\uXXXX` escapes)
- `tests/test-core.js`, `tests/smoke.mjs`
- Sources verified pure ASCII: `grep -rP '[^\x00-\x7F]' index.html css js` → no matches.
