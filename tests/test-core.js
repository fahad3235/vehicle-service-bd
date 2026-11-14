/* Vehicle Service BD — Node unit tests for js/core.js. Run: node tests/test-core.js */
'use strict';
const assert = require('node:assert');
const C = require('../js/core.js');

let passed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('ok  - ' + name); }
  catch (e) { console.error('FAIL - ' + name + ': ' + e.message); process.exitCode = 1; }
}

/* ---- digits / money ---- */
check('toBnDigits converts 0-9', () => {
  assert.strictEqual(C.toBnDigits('0123456789'), '০১২৩৪৫৬৭৮৯');
});
check('fromBnDigits converts back', () => {
  assert.strictEqual(C.fromBnDigits('১২৫০.৫০'), '1250.50');
});
check('parseAmount plain', () => { assert.strictEqual(C.parseAmount('850'), 85000); });
check('parseAmount decimals + commas', () => { assert.strictEqual(C.parseAmount('1,250.50'), 125050); });
check('parseAmount Bengali digits', () => { assert.strictEqual(C.parseAmount('১২৫০.৫০'), 125050); });
check('parseAmount rejects empty/letters/negative/3-decimals', () => {
  assert.strictEqual(C.parseAmount(''), null);
  assert.strictEqual(C.parseAmount('abc'), null);
  assert.strictEqual(C.parseAmount('-50'), null);
  assert.strictEqual(C.parseAmount('10.999'), null);
  assert.strictEqual(C.parseAmount('12.5.5'), null);
});
check('parseKm plain + Bengali + commas', () => {
  assert.strictEqual(C.parseKm('12500'), 12500);
  assert.strictEqual(C.parseKm('১২,৫০০'), 12500);
  assert.strictEqual(C.parseKm('12.5'), null);
  assert.strictEqual(C.parseKm('-3'), null);
  assert.strictEqual(C.parseKm(''), null);
});
check('fmtMoney exact', () => {
  assert.strictEqual(C.fmtMoney(205000, 'en'), '৳2,050.00');
  assert.strictEqual(C.fmtMoney(85000, 'en'), '৳850.00');
  assert.strictEqual(C.fmtMoney(85000, 'bn'), '৳৮৫০.০০');
  assert.strictEqual(C.fmtMoney(0, 'en'), '৳0.00');
});
check('fmtKm grouped + Bengali', () => {
  assert.strictEqual(C.fmtKm(12500, 'en'), '12,500');
  assert.strictEqual(C.fmtKm(12500, 'bn'), '১২,৫০০');
});

/* ---- dates ---- */
check('isValidDateStr accepts/rejects', () => {
  assert.strictEqual(C.isValidDateStr('2026-11-14'), true);
  assert.strictEqual(C.isValidDateStr('2026-02-30'), false);
  assert.strictEqual(C.isValidDateStr('14-11-2026'), false);
  assert.strictEqual(C.isValidDateStr('2026-13-01'), false);
});
check('addMonthsISO clamps month-end', () => {
  assert.strictEqual(C.addMonthsISO('2026-01-31', 1), '2026-02-28');
  assert.strictEqual(C.addMonthsISO('2026-11-01', 3), '2027-02-01');
  assert.strictEqual(C.addMonthsISO('2026-10-05', 6), '2027-04-05');
  assert.strictEqual(C.addMonthsISO('2024-01-31', 1), '2024-02-29');
});
check('daysBetween exact', () => {
  assert.strictEqual(C.daysBetween('2026-11-14', '2026-12-14'), 30);
  assert.strictEqual(C.daysBetween('2026-12-14', '2026-11-14'), -30);
  assert.strictEqual(C.daysBetween('2026-11-14', '2026-11-14'), 0);
});

/* ---- vehicle validation ---- */
function mkVehicle(over) {
  return Object.assign({ id: 'v1', name: 'Hero Splendor', type: 'bike', brand: 'Hero', plate: 'DHA-123', purchaseDate: '2024-01-15', odo: 12000 }, over || {});
}
check('validateVehicle accepts a good vehicle', () => {
  assert.deepStrictEqual(C.validateVehicle(mkVehicle(), '2026-11-14'), { ok: true, error: null });
});
check('validateVehicle rejects empty name / bad type / negative odo / future purchase', () => {
  assert.strictEqual(C.validateVehicle(mkVehicle({ name: '  ' }), '2026-11-14').ok, false);
  assert.strictEqual(C.validateVehicle(mkVehicle({ type: 'boat' }), '2026-11-14').ok, false);
  assert.strictEqual(C.validateVehicle(mkVehicle({ odo: -5 }), '2026-11-14').ok, false);
  assert.strictEqual(C.validateVehicle(mkVehicle({ odo: 12.5 }), '2026-11-14').ok, false);
  assert.strictEqual(C.validateVehicle(mkVehicle({ purchaseDate: '2027-01-01' }), '2026-11-14').ok, false);
  assert.strictEqual(C.validateVehicle(mkVehicle({ purchaseDate: '2026-02-30' }), '2026-11-14').ok, false);
});

/* ---- service validation + due engine ---- */
function baseState() {
  const st = C.emptyState();
  st.vehicles.push(mkVehicle());
  st.services.push(
    { id: 's1', vehicleId: 'v1', date: '2026-10-05', odo: 10800, type: 'brake-pad', workshop: 'Rahim Motors', costPaisa: 120000, notes: '', dueKm: null, dueMonths: null },
    { id: 's2', vehicleId: 'v1', date: '2026-11-01', odo: 11500, type: 'engine-oil', workshop: '', costPaisa: 85000, notes: '', dueKm: 12500, dueMonths: 3 },
  );
  return st;
}
function mkService(over) {
  return Object.assign({ id: 'sx', vehicleId: 'v1', date: '2026-11-10', odo: 11800, type: 'general', workshop: '', costPaisa: 50000, notes: '', dueKm: null, dueMonths: null }, over || {});
}
check('validateService accepts a good service', () => {
  assert.deepStrictEqual(C.validateService(mkService(), baseState(), '2026-11-14'), { ok: true, error: null });
});
check('validateService rejects future date / bad vehicle / bad type / zero cost', () => {
  const st = baseState();
  assert.strictEqual(C.validateService(mkService({ date: '2026-11-15' }), st, '2026-11-14').ok, false);
  assert.strictEqual(C.validateService(mkService({ vehicleId: 'nope' }), st, '2026-11-14').ok, false);
  assert.strictEqual(C.validateService(mkService({ type: 'warp-drive' }), st, '2026-11-14').ok, false);
  assert.strictEqual(C.validateService(mkService({ costPaisa: 0 }), st, '2026-11-14').ok, false);
  assert.strictEqual(C.validateService(mkService({ costPaisa: -100 }), st, '2026-11-14').ok, false);
});
check('validateService rejects decreased odometer (11,499 < last 11,500)', () => {
  assert.strictEqual(C.validateService(mkService({ odo: 11499 }), baseState(), '2026-11-14').error, 'odo-decreased');
});
check('validateService allows equal odometer', () => {
  assert.strictEqual(C.validateService(mkService({ odo: 11500 }), baseState(), '2026-11-14').ok, true);
});
check('validateService allows backfilling an older service (2026-10-05 @ 10,800)', () => {
  const st = C.emptyState();
  st.vehicles.push(mkVehicle());
  st.services.push({ id: 's2', vehicleId: 'v1', date: '2026-11-01', odo: 11500, type: 'engine-oil', workshop: '', costPaisa: 85000, notes: '', dueKm: null, dueMonths: null });
  const backfill = { id: 's1', vehicleId: 'v1', date: '2026-10-05', odo: 10800, type: 'brake-pad', workshop: '', costPaisa: 120000, notes: '', dueKm: null, dueMonths: null };
  assert.deepStrictEqual(C.validateService(backfill, st, '2026-11-14'), { ok: true, error: null });
});
check('validateService rejects out-of-range odo when inserting between dated services', () => {
  const st = baseState(); // 2026-10-05 @ 10,800 ; 2026-11-01 @ 11,500
  assert.strictEqual(C.validateService(mkService({ date: '2026-10-20', odo: 12000 }), st, '2026-11-14').error, 'odo-too-high');
  assert.strictEqual(C.validateService(mkService({ date: '2026-10-20', odo: 10000 }), st, '2026-11-14').error, 'odo-decreased');
  assert.strictEqual(C.validateService(mkService({ date: '2026-10-20', odo: 11100 }), st, '2026-11-14').ok, true);
});
check('validateService rejects dueKm <= odo and dueMonths out of range', () => {
  const st = baseState();
  assert.strictEqual(C.validateService(mkService({ dueKm: 11800 }), st, '2026-11-14').ok, false);
  assert.strictEqual(C.validateService(mkService({ dueKm: 11000 }), st, '2026-11-14').ok, false);
  assert.strictEqual(C.validateService(mkService({ dueMonths: 0 }), st, '2026-11-14').ok, false);
  assert.strictEqual(C.validateService(mkService({ dueMonths: 37 }), st, '2026-11-14').ok, false);
  assert.strictEqual(C.validateService(mkService({ dueKm: 13000, dueMonths: 6 }), st, '2026-11-14').ok, true);
});
check('lastServiceOdo returns max odo', () => {
  assert.strictEqual(C.lastServiceOdo(baseState(), 'v1'), 11500);
  assert.strictEqual(C.lastServiceOdo(C.emptyState(), 'v1'), null);
});

/* ---- computeDue boundaries (asOf 2026-11-14, vehicle odo 12,000) ---- */
check('computeDue: no due -> none', () => {
  const d = C.computeDue({ date: '2026-10-05', dueKm: null, dueMonths: null }, 12000, '2026-11-14');
  assert.strictEqual(d.status, 'none');
});
check('computeDue: km soon (500 km left) + date ok -> soon', () => {
  const d = C.computeDue({ date: '2026-11-01', dueKm: 12500, dueMonths: 3 }, 12000, '2026-11-14');
  assert.strictEqual(d.status, 'soon');
  assert.strictEqual(d.kmLeft, 500);
  assert.strictEqual(d.daysLeft, 79); // 2026-11-14 -> 2027-02-01
  assert.strictEqual(d.dueDate, '2027-02-01');
});
check('computeDue: km overdue (odo reached dueKm)', () => {
  const d = C.computeDue({ date: '2026-11-01', dueKm: 12000, dueMonths: 3 }, 12000, '2026-11-14');
  assert.strictEqual(d.status, 'overdue');
  assert.strictEqual(d.kmLeft, 0);
});
check('computeDue: date overdue beats km ok', () => {
  const d = C.computeDue({ date: '2026-05-01', dueKm: 99999, dueMonths: 3 }, 12000, '2026-11-14');
  assert.strictEqual(d.status, 'overdue');
  assert.strictEqual(d.daysLeft, -105); // due 2026-08-01
});
check('computeDue: date soon (within 30 days)', () => {
  const d = C.computeDue({ date: '2026-09-01', dueKm: null, dueMonths: 3 }, 12000, '2026-11-14');
  assert.strictEqual(d.status, 'soon');
  assert.strictEqual(d.daysLeft, 17); // due 2026-12-01
});
check('computeDue: km 501 left + date far -> ok', () => {
  const d = C.computeDue({ date: '2026-11-01', dueKm: 12501, dueMonths: 12 }, 12000, '2026-11-14');
  assert.strictEqual(d.status, 'ok');
  assert.strictEqual(d.kmLeft, 501);
});
check('computeDue: exactly 30 days left -> soon; 31 days -> ok', () => {
  const soon = C.computeDue({ date: '2026-09-14', dueKm: null, dueMonths: 3 }, 12000, '2026-11-14');
  assert.strictEqual(soon.daysLeft, 30);
  assert.strictEqual(soon.status, 'soon');
  const ok = C.computeDue({ date: '2026-09-15', dueKm: null, dueMonths: 3 }, 12000, '2026-11-14');
  assert.strictEqual(ok.daysLeft, 31);
  assert.strictEqual(ok.status, 'ok');
});

/* ---- summarize ---- */
check('summarize: hand-verified totals (850 + 1200 = 2050)', () => {
  const s = C.summarize(baseState(), '2026-11-14');
  assert.strictEqual(s.totalPaisa, 205000);
  assert.strictEqual(s.yearPaisa, 205000);
  assert.strictEqual(s.serviceCount, 2);
  assert.strictEqual(s.vehicleCount, 1);
  assert.strictEqual(s.perVehicle[0].total, 205000);
  assert.strictEqual(s.perVehicle[0].count, 2);
  assert.strictEqual(s.recent[0].id, 's2');
  assert.strictEqual(s.dues.length, 1);
  assert.strictEqual(s.dues[0].due.status, 'soon');
});
check('summarize: year filter excludes prior-year service', () => {
  const st = baseState();
  st.services.push({ id: 's0', vehicleId: 'v1', date: '2025-12-20', odo: 9000, type: 'general', workshop: '', costPaisa: 100000, notes: '', dueKm: null, dueMonths: null });
  const s = C.summarize(st, '2026-11-14');
  assert.strictEqual(s.totalPaisa, 305000);
  assert.strictEqual(s.yearPaisa, 205000);
  assert.strictEqual(s.serviceCount, 3);
});
check('upcomingDues: overdue sorts before soon', () => {
  const st = baseState();
  st.vehicles.push({ id: 'v2', name: 'Toyota Corolla', type: 'car', brand: 'Toyota', plate: '', purchaseDate: '', odo: 45000 });
  st.services.push({ id: 's3', vehicleId: 'v2', date: '2026-05-01', odo: 44000, type: 'engine-oil', workshop: '', costPaisa: 350000, notes: '', dueKm: 45000, dueMonths: 3 });
  const dues = C.upcomingDues(st, '2026-11-14');
  assert.strictEqual(dues.length, 2);
  assert.strictEqual(dues[0].vehicle.id, 'v2');
  assert.strictEqual(dues[0].due.status, 'overdue');
  assert.strictEqual(dues[1].vehicle.id, 'v1');
  assert.strictEqual(dues[1].due.status, 'soon');
});

/* ---- import validation ---- */
check('validateImport accepts a good export round-trip', () => {
  const st = baseState();
  const obj = JSON.parse(C.exportData(st));
  assert.deepStrictEqual(C.validateImport(obj), { ok: true, error: null });
});
check('validateImport rejects malformed shapes', () => {
  const good = JSON.parse(C.exportData(baseState()));
  assert.strictEqual(C.validateImport(null).ok, false);
  assert.strictEqual(C.validateImport({ version: 2, vehicles: [], services: [] }).ok, false);
  assert.strictEqual(C.validateImport({ version: 1, vehicles: {}, services: [] }).ok, false);
  assert.strictEqual(C.validateImport({ version: 1, vehicles: [], services: 'x' }).ok, false);
  const dup = JSON.parse(JSON.stringify(good));
  dup.vehicles.push(JSON.parse(JSON.stringify(good.vehicles[0])));
  assert.strictEqual(C.validateImport(dup).ok, false);
  const dangling = JSON.parse(JSON.stringify(good));
  dangling.services[0].vehicleId = 'ghost';
  assert.strictEqual(C.validateImport(dangling).ok, false);
  const badOdo = JSON.parse(JSON.stringify(good));
  badOdo.services[1].odo = 10000; // below earlier service 10,800 -> decreased
  assert.strictEqual(C.validateImport(badOdo).ok, false);
  const badCost = JSON.parse(JSON.stringify(good));
  badCost.services[0].costPaisa = 0;
  assert.strictEqual(C.validateImport(badCost).ok, false);
});

console.log('\n' + passed + ' unit checks passed');
