/* Vehicle Service BD — headless-Chrome smoke tests (raw CDP, no deps).
 * Usage: node tests/smoke.mjs [width] [height]
 * Loads file://.../index.html?asof=2026-11-14 and drives the real UI.
 * Exits non-zero if any check fails or any console/page error appears. */
import { spawn } from 'node:child_process';

const SHELL = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
const PAGE_URL = 'file://' + process.cwd() + '/index.html?asof=2026-11-14';
const WIDTH = parseInt(process.argv[2] || '1280', 10);
const HEIGHT = parseInt(process.argv[3] || '800', 10);
const PORT = 9333 + (WIDTH === 390 ? 1 : 0);

const errors = [];
let passed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log('ok  - ' + name); }
  else { console.error('FAIL - ' + name); process.exitCode = 1; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('DevTools endpoint never came up');
}

const child = spawn(SHELL, [
  '--headless', '--no-sandbox', '--disable-gpu',
  `--remote-debugging-port=${PORT}`,
  `--window-size=${WIDTH},${HEIGHT}`,
  PAGE_URL,
], { stdio: 'ignore' });

let ws;
try {
  const wsUrl = await getWsUrl();
  ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let nextId = 1;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errors.push('exception: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 500));
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push('console.error: ' + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
    } else if (msg.method === 'Network.loadingFailed') {
      errors.push('network failed: ' + JSON.stringify(msg.params).slice(0, 300));
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      errors.push('log error: ' + (msg.params.entry.text || '').slice(0, 300));
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evl = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page eval threw: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Log.enable');
  await sleep(1200);

  const text = (sel) => `(document.querySelector(${JSON.stringify(sel)})||{}).textContent||''`;
  const val = (sel) => `(document.querySelector(${JSON.stringify(sel)})||{}).value||''`;
  const setVal = async (sel, v) => evl(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); el.value=${JSON.stringify(v)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true;})()`);
  const click = async (sel) => evl(`(()=>{document.querySelector(${JSON.stringify(sel)}).click(); return true;})()`);
  const submit = async (sel) => evl(`(()=>{document.querySelector(${JSON.stringify(sel)}).dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); return true;})()`);

  // ---- initial render ----
  check('title renders', (await evl(text('h1'))).includes('Vehicle Service BD'));
  check('4 tabs present', await evl(`document.querySelectorAll('.tab').length`) === 4);
  check('dashboard stats start at zero', (await evl(text('#statsGrid'))).includes('0.00'));
  check('empty dues message shown', (await evl(text('#duesList'))).includes('No upcoming dues'));
  const vListTxt = await evl(`(()=>{document.querySelector('[data-tab="vehicles"]').click(); return document.querySelector('#vehicleList').textContent;})()`);
  check('empty vehicles message shown', vListTxt.includes('No vehicles yet'));
  check('service form blocked until a vehicle exists (hint visible)', await evl(`!document.querySelector('#noVehicleHint').hidden`));

  // ---- add vehicle ----
  await setVal('#vName', 'Hero Splendor');
  await setVal('#vType', 'bike');
  await setVal('#vBrand', 'Hero');
  await setVal('#vPlate', 'DHA-123');
  await setVal('#vPurchase', '2024-01-15');
  await setVal('#vOdo', '12000');
  await submit('#vehicleForm');
  await sleep(200);
  check('vehicle appears in list', (await evl(text('#vehicleList'))).includes('Hero Splendor'));
  check('vehicle card shows total 0.00', (await evl(text('#vehicleList'))).includes('0.00'));
  check('dashboard vehicle count is 1', await evl(`document.querySelectorAll('#statsGrid .stat')[3].textContent.includes('1')`));

  // ---- validation: empty name rejected ----
  await setVal('#vName', '   ');
  await setVal('#vOdo', '5000');
  await submit('#vehicleForm');
  await sleep(200);
  check('empty vehicle name shows inline error', (await evl(text('#err-vName'))).length > 0);
  check('bad vehicle NOT added (still 1 vehicle)', await evl(`document.querySelectorAll('#vehicleList .vehicle-row').length`) === 1);

  // ---- add service 1: engine oil 2026-11-01 @ 11,500, 850, due 12,500 km / 3 mo ----
  await click('[data-tab="services"]');
  await sleep(200);
  await setVal('#sVehicle', await evl(`document.querySelector('#sVehicle').value`));
  await setVal('#sDate', '2026-11-01');
  await setVal('#sOdo', '11500');
  await setVal('#sType', 'engine-oil');
  await setVal('#sWorkshop', 'Rahim Motors');
  await setVal('#sCost', '850');
  await setVal('#sDueKm', '12500');
  await setVal('#sDueMonths', '3');
  await submit('#serviceForm');
  await sleep(200);
  check('history has 1 row', await evl(`document.querySelectorAll('#historyBody tr').length`) === 1);
  check('history row shows 850.00', (await evl(text('#historyBody'))).includes('850.00'));
  check('history row shows Rahim Motors', (await evl(text('#historyBody'))).includes('Rahim Motors'));
  check('history row shows Due soon badge', (await evl(text('#historyBody'))).includes('Due soon'));
  check('history row shows 500 km left', (await evl(text('#historyBody'))).includes('500 km left'));

  // ---- validation: decreased odo rejected ----
  await setVal('#sDate', '2026-11-05');
  await setVal('#sOdo', '11000');
  await setVal('#sCost', '100');
  await submit('#serviceForm');
  await sleep(200);
  check('decreased odo shows inline error', (await evl(text('#err-sOdo'))).length > 0);
  check('bad service NOT added (still 1 row)', await evl(`document.querySelectorAll('#historyBody tr').length`) === 1);

  // ---- backfill older service: brake pad 2026-10-05 @ 10,800, 1200 ----
  await setVal('#sDate', '2026-10-05');
  await setVal('#sOdo', '10800');
  await setVal('#sType', 'brake-pad');
  await setVal('#sWorkshop', '');
  await setVal('#sCost', '1200');
  await setVal('#sDueKm', '');
  await setVal('#sDueMonths', '');
  await submit('#serviceForm');
  await sleep(200);
  check('backfilled service added (2 rows)', await evl(`document.querySelectorAll('#historyBody tr').length`) === 2);
  check('history sorted newest first', (await evl(`document.querySelector('#historyBody tr td').textContent`)).includes('2026-11-01'));

  // ---- dashboard totals: 850 + 1200 = 2050 ----
  await click('[data-tab="dashboard"]');
  await sleep(200);
  const stats = await evl(text('#statsGrid'));
  check('dashboard total is 2,050.00', stats.includes('2,050.00'));
  check('dashboard this-year is 2,050.00', stats.includes('2,050.00'));
  check('dashboard service count is 2', await evl(`document.querySelectorAll('#statsGrid .stat')[2].textContent.includes('2')`));
  check('dues list shows Hero Splendor soon', (await evl(text('#duesList'))).includes('Hero Splendor'));
  check('recent list shows brake pad', (await evl(text('#recentList'))).includes('Brake pad'));
  check('per-vehicle total 2,050.00', (await evl(text('#perVehicleList'))).includes('2,050.00'));

  // ---- BN toggle: Bengali digits render + persists across reload ----
  await click('#langBtn');
  await sleep(200);
  check('BN toggle renders Bengali digits in stats', (await evl(text('#statsGrid'))).includes('২,০৫০.০০'));
  check('BN toggle renders Bengali tab label', (await evl(text('[data-tab="dashboard"]'))).includes('ড্যাশবোর্ড'));
  await evl(`location.reload()`);
  await sleep(1200);
  check('BN toggle persists after reload', (await evl(text('#statsGrid'))).includes('২,০৫০.০০'));
  check('data persists after reload (2 services)', await evl(`(()=>{document.querySelector('[data-tab="services"]').click(); return document.querySelectorAll('#historyBody tr').length;})()`) === 2);
  await click('#langBtn');
  await sleep(200);

  // ---- export -> erase -> import round-trip ----
  const exported = await evl(`(()=>{const raw=localStorage.getItem('vsbd_v1'); return raw;})()`);
  check('localStorage holds exported state', exported && exported.includes('Hero Splendor') && exported.includes('engine-oil'));
  await click('[data-tab="data"]');
  await sleep(200);
  await setVal('#importText', '{"version": 1, "vehicles": [], "services": []}');
  await click('#importBtn');
  await sleep(200);
  check('import of empty state shows success', await evl(`!document.querySelector('#importOk').hidden`));
  check('import wiped data (dashboard total 0.00)', (await evl(`(()=>{document.querySelector('[data-tab="dashboard"]').click(); return document.querySelector('#statsGrid').textContent;})()`)).includes('0.00'));
  // malformed import rejected, data intact (still empty, no crash)
  await click('[data-tab="data"]');
  await sleep(100);
  await setVal('#importText', '{"version": 1, "vehicles": [{"id": "x"}], "services": []}');
  await click('#importBtn');
  await sleep(200);
  check('malformed import shows inline error', (await evl(text('#err-import'))).length > 0);
  // restore the real export
  await setVal('#importText', exported);
  await click('#importBtn');
  await sleep(200);
  check('export round-trip restores 2 services', await evl(`(()=>{document.querySelector('[data-tab="services"]').click(); return document.querySelectorAll('#historyBody tr').length;})()`) === 2);

  // ---- typed-DELETE erase ----
  await click('[data-tab="data"]');
  await sleep(100);
  check('erase button disabled until DELETE typed', await evl(`document.querySelector('#eraseBtn').disabled`));
  await setVal('#eraseText', 'DELETE');
  await sleep(100);
  check('erase button enabled after DELETE', await evl(`!document.querySelector('#eraseBtn').disabled`));
  await click('#eraseBtn');
  await sleep(200);
  check('erase wipes everything', (await evl(`(()=>{document.querySelector('[data-tab="dashboard"]').click(); return document.querySelector('#statsGrid').textContent;})()`)).includes('0.00'));

  // ---- zero network requests ----
  check('zero network requests observed', await evl(`performance.getEntriesByType('resource').length`) === 0);

  // ---- 390px overflow (only when run at 390) ----
  if (WIDTH === 390) {
    const overflow = await evl(`(()=>{let bad=[]; document.querySelectorAll('body *').forEach(el=>{const r=el.getBoundingClientRect(); if(r.width>391 && !el.classList.contains('table-wrap') && el.tagName!=='TABLE') bad.push(el.tagName+'.'+el.className);}); return bad.slice(0,5);})()`);
    check('no horizontal overflow at 390px (except table scroll)', overflow.length === 0);
  }
} catch (e) {
  console.error('HARNESS ERROR - ' + e.message);
  process.exitCode = 1;
} finally {
  if (ws) ws.close();
  child.kill();
}

if (errors.length > 0) {
  console.error('\nPAGE ERRORS (' + errors.length + '):');
  errors.forEach((e) => console.error(' - ' + e));
  process.exitCode = 1;
}
console.log('\n' + passed + ' smoke checks passed, ' + errors.length + ' page errors');
