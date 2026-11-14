/* Vehicle Service BD \u2014 pure logic core (no DOM).
 * Shared by the browser app (window.VSBD) and the Node unit tests.
 * Money is integer paisa; odometer is integer km; dates are ISO YYYY-MM-DD.
 * Pure ASCII source: Bengali is emitted by the app as \uXXXX escapes.
 */
'use strict';

const BN_DIGITS = ['\u09e6','\u09e7','\u09e8','\u09e9','\u09ea','\u09eb','\u09ec','\u09ed','\u09ee','\u09ef'];
const EN_DIGITS = ['0','1','2','3','4','5','6','7','8','9'];
const TAKA = '\u09f3';

function toBnDigits(s) {
  return String(s).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

function fromBnDigits(s) {
  return String(s).replace(/[\u09e6-\u09ef]/g, (d) => EN_DIGITS[BN_DIGITS.indexOf(d)]);
}

/* Parse a money amount ("1,250.50", "\u09e7\u09e8\u09eb\u09e6.\u09eb\u09e6", "850") -> integer paisa, or null. */
function parseAmount(str) {
  if (str === null || str === undefined) return null;
  let s = fromBnDigits(String(str)).replace(/[, ]/g, '').trim();
  if (s === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const v = Math.round(parseFloat(s) * 100);
  if (!Number.isFinite(v) || v < 0) return null;
  return v;
}

/* Parse an integer km reading ("12,500", "\u09e7\u09e8\u09eb\u09e6\u09e6") -> int, or null. */
function parseKm(str) {
  if (str === null || str === undefined) return null;
  const s = fromBnDigits(String(str)).replace(/[, ]/g, '').trim();
  if (s === '') return null;
  if (!/^\d+$/.test(s)) return null;
  const v = Number(s);
  if (!Number.isSafeInteger(v) || v < 0) return null;
  return v;
}

/* Format integer paisa as "\u09f31,250.00" (EN) or "\u09f3\u09e7,\u09e8\u09eb\u09e6.\u09e6\u09e6" (BN). */
function fmtMoney(paisa, lang) {
  const neg = paisa < 0;
  const abs = Math.abs(paisa);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let out = (neg ? '-' : '') + TAKA + grouped + '.' + frac;
  if (lang === 'bn') out = toBnDigits(out);
  return out;
}

function fmtKm(km, lang) {
  const grouped = String(km).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return lang === 'bn' ? toBnDigits(grouped) : grouped;
}

function isValidDateStr(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function todayStr(asOf) {
  if (asOf && isValidDateStr(asOf)) return asOf;
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/* Add months to an ISO date, clamping to the end of the target month. */
function addMonthsISO(dateStr, months) {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0], m = parts[1] - 1, d = parts[2];
  const target = new Date(Date.UTC(y, m + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  const out = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), day));
  return out.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00Z').getTime();
  const db = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((db - da) / 86400000);
}

const VEHICLE_TYPES = ['bike', 'car', 'cng', 'microbus', 'other'];
const SERVICE_TYPES = [
  'engine-oil', 'oil-filter', 'air-filter', 'brake-pad', 'chain',
  'tyre', 'battery', 'clutch', 'general', 'repair', 'other'
];

function uid() {
  return 'id-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e9).toString(36);
}

function emptyState() {
  return { version: 1, vehicles: [], services: [] };
}

function validateVehicle(v, asOf) {
  if (!v || typeof v !== 'object') return { ok: false, error: 'not-an-object' };
  if (typeof v.name !== 'string' || v.name.trim() === '') return { ok: false, error: 'name-required' };
  if (v.name.trim().length > 60) return { ok: false, error: 'name-too-long' };
  if (!VEHICLE_TYPES.includes(v.type)) return { ok: false, error: 'bad-type' };
  if (typeof v.odo !== 'number' || !Number.isSafeInteger(v.odo) || v.odo < 0) return { ok: false, error: 'bad-odo' };
  if (v.brand !== undefined && (typeof v.brand !== 'string' || v.brand.length > 60)) return { ok: false, error: 'bad-brand' };
  if (v.plate !== undefined && (typeof v.plate !== 'string' || v.plate.length > 20)) return { ok: false, error: 'bad-plate' };
  if (v.purchaseDate !== undefined && v.purchaseDate !== '' && !isValidDateStr(v.purchaseDate)) return { ok: false, error: 'bad-purchase-date' };
  if (v.purchaseDate && isValidDateStr(v.purchaseDate) && v.purchaseDate > todayStr(asOf)) return { ok: false, error: 'purchase-date-future' };
  return { ok: true, error: null };
}

function lastServiceOdo(state, vehicleId) {
  let max = null;
  for (const s of state.services) {
    if (s.vehicleId === vehicleId && (max === null || s.odo > max)) max = s.odo;
  }
  return max;
}

/* Odometer bounds for a new service at a given date: it must not be lower
 * than any earlier-dated service, nor higher than any later-dated one.
 * This allows backfilling older services while keeping the timeline sane. */
function odoBoundsFor(state, vehicleId, date) {
  let prevMax = null, nextMin = null;
  for (const s of state.services) {
    if (s.vehicleId !== vehicleId) continue;
    if (s.date < date && (prevMax === null || s.odo > prevMax)) prevMax = s.odo;
    if (s.date > date && (nextMin === null || s.odo < nextMin)) nextMin = s.odo;
  }
  return { prevMax, nextMin };
}

function validateService(s, state, asOf) {
  const today = todayStr(asOf);
  if (!s || typeof s !== 'object') return { ok: false, error: 'not-an-object' };
  if (typeof s.vehicleId !== 'string' || !state.vehicles.some((v) => v.id === s.vehicleId)) return { ok: false, error: 'bad-vehicle' };
  if (!isValidDateStr(s.date)) return { ok: false, error: 'bad-date' };
  if (s.date > today) return { ok: false, error: 'date-future' };
  if (typeof s.odo !== 'number' || !Number.isSafeInteger(s.odo) || s.odo < 0) return { ok: false, error: 'bad-odo' };
  const bounds = odoBoundsFor(state, s.vehicleId, s.date);
  if (bounds.prevMax !== null && s.odo < bounds.prevMax) return { ok: false, error: 'odo-decreased' };
  if (bounds.nextMin !== null && s.odo > bounds.nextMin) return { ok: false, error: 'odo-too-high' };
  if (!SERVICE_TYPES.includes(s.type)) return { ok: false, error: 'bad-type' };
  if (typeof s.costPaisa !== 'number' || !Number.isSafeInteger(s.costPaisa) || s.costPaisa <= 0) return { ok: false, error: 'bad-cost' };
  if (s.workshop !== undefined && (typeof s.workshop !== 'string' || s.workshop.length > 80)) return { ok: false, error: 'bad-workshop' };
  if (s.notes !== undefined && (typeof s.notes !== 'string' || s.notes.length > 300)) return { ok: false, error: 'bad-notes' };
  if (s.dueKm !== undefined && s.dueKm !== null) {
    if (!Number.isSafeInteger(s.dueKm) || s.dueKm <= s.odo) return { ok: false, error: 'bad-due-km' };
  }
  if (s.dueMonths !== undefined && s.dueMonths !== null) {
    if (!Number.isSafeInteger(s.dueMonths) || s.dueMonths < 1 || s.dueMonths > 36) return { ok: false, error: 'bad-due-months' };
  }
  return { ok: true, error: null };
}

/* Due status for one service, given the vehicle's CURRENT odometer.
 * Rules: overdue if due date passed OR current odo reached due km.
 * "Soon" if due within 30 days OR within 500 km. Worst of km/date wins. */
function computeDue(service, vehicleOdo, asOf) {
  const today = todayStr(asOf);
  const dueDate = (service.dueMonths !== undefined && service.dueMonths !== null)
    ? addMonthsISO(service.date, service.dueMonths) : null;
  const dueKm = (service.dueKm !== undefined && service.dueKm !== null) ? service.dueKm : null;
  if (dueDate === null && dueKm === null) {
    return { status: 'none', dueDate: null, dueKm: null, kmLeft: null, daysLeft: null };
  }
  let kmLeft = null, daysLeft = null;
  let status = 'ok';
  if (dueKm !== null) {
    kmLeft = dueKm - vehicleOdo;
    if (kmLeft <= 0) status = 'overdue';
    else if (kmLeft <= 500) status = 'soon';
  }
  if (dueDate !== null) {
    daysLeft = daysBetween(today, dueDate);
    if (daysLeft < 0) status = 'overdue';
    else if (daysLeft <= 30 && status !== 'overdue') status = 'soon';
  }
  return { status, dueDate, dueKm, kmLeft, daysLeft };
}

/* Upcoming dues: latest service per vehicle that carries a due, with status. */
function upcomingDues(state, asOf) {
  const today = todayStr(asOf);
  const out = [];
  for (const v of state.vehicles) {
    const mine = state.services
      .filter((s) => s.vehicleId === v.id && (s.dueKm != null || s.dueMonths != null))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    if (mine.length === 0) continue;
    const latest = mine[0];
    const due = computeDue(latest, v.odo, today);
    if (due.status === 'none') continue;
    out.push({ vehicle: v, service: latest, due });
  }
  out.sort((a, b) => {
    const rank = { overdue: 0, soon: 1, ok: 2 };
    if (rank[a.due.status] !== rank[b.due.status]) return rank[a.due.status] - rank[b.due.status];
    const da = a.due.daysLeft === null ? 1e9 : a.due.daysLeft;
    const db = b.due.daysLeft === null ? 1e9 : b.due.daysLeft;
    return da - db;
  });
  return out;
}

function summarize(state, asOf) {
  const today = todayStr(asOf);
  const year = today.slice(0, 4);
  let totalPaisa = 0, yearPaisa = 0;
  for (const s of state.services) {
    totalPaisa += s.costPaisa;
    if (s.date.slice(0, 4) === year) yearPaisa += s.costPaisa;
  }
  const perVehicle = state.vehicles.map((v) => {
    const mine = state.services.filter((s) => s.vehicleId === v.id);
    return {
      vehicle: v,
      count: mine.length,
      total: mine.reduce((a, s) => a + s.costPaisa, 0),
    };
  }).sort((a, b) => b.total - a.total);
  const recent = [...state.services]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 5);
  return {
    totalPaisa, yearPaisa,
    serviceCount: state.services.length,
    vehicleCount: state.vehicles.length,
    perVehicle, recent,
    dues: upcomingDues(state, asOf),
  };
}

/* Strict import validation: exact shape, sane types, service->vehicle refs. */
function validateImport(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: 'not-an-object' };
  if (obj.version !== 1) return { ok: false, error: 'bad-version' };
  if (!Array.isArray(obj.vehicles) || !Array.isArray(obj.services)) return { ok: false, error: 'bad-shape' };
  const ids = new Set();
  for (const v of obj.vehicles) {
    if (typeof v.id !== 'string' || v.id === '' || ids.has(v.id)) return { ok: false, error: 'bad-vehicle-id' };
    ids.add(v.id);
    const r = validateVehicle(v);
    if (!r.ok) return { ok: false, error: 'vehicle:' + r.error };
  }
  const sids = new Set();
  for (const s of obj.services) {
    if (typeof s.id !== 'string' || s.id === '' || sids.has(s.id)) return { ok: false, error: 'bad-service-id' };
    sids.add(s.id);
    if (typeof s.vehicleId !== 'string' || !ids.has(s.vehicleId)) return { ok: false, error: 'service:bad-vehicle' };
    if (!isValidDateStr(s.date)) return { ok: false, error: 'service:bad-date' };
    if (!SERVICE_TYPES.includes(s.type)) return { ok: false, error: 'service:bad-type' };
    if (typeof s.costPaisa !== 'number' || !Number.isSafeInteger(s.costPaisa) || s.costPaisa <= 0) return { ok: false, error: 'service:bad-cost' };
    if (typeof s.odo !== 'number' || !Number.isSafeInteger(s.odo) || s.odo < 0) return { ok: false, error: 'service:bad-odo' };
    if (s.workshop !== undefined && (typeof s.workshop !== 'string' || s.workshop.length > 80)) return { ok: false, error: 'service:bad-workshop' };
    if (s.notes !== undefined && (typeof s.notes !== 'string' || s.notes.length > 300)) return { ok: false, error: 'service:bad-notes' };
    if (s.dueKm !== undefined && s.dueKm !== null && (!Number.isSafeInteger(s.dueKm) || s.dueKm <= s.odo)) return { ok: false, error: 'service:bad-due-km' };
    if (s.dueMonths !== undefined && s.dueMonths !== null && (!Number.isSafeInteger(s.dueMonths) || s.dueMonths < 1 || s.dueMonths > 36)) return { ok: false, error: 'service:bad-due-months' };
  }
  // Odometer monotonicity per vehicle, in date order (a later-dated service
  // must not carry a lower reading than an earlier-dated one).
  for (const v of obj.vehicles) {
    const mine = obj.services.filter((s) => s.vehicleId === v.id)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    for (let i = 1; i < mine.length; i++) {
      if (mine[i].odo < mine[i - 1].odo) return { ok: false, error: 'service:odo-decreased' };
    }
  }
  return { ok: true, error: null };
}

function exportData(state) {
  return JSON.stringify({ version: 1, vehicles: state.vehicles, services: state.services }, null, 2);
}

const api = {
  BN_DIGITS, TAKA, toBnDigits, fromBnDigits,
  parseAmount, parseKm, fmtMoney, fmtKm,
  isValidDateStr, todayStr, addMonthsISO, daysBetween,
  VEHICLE_TYPES, SERVICE_TYPES, uid, emptyState,
  validateVehicle, validateService, lastServiceOdo, odoBoundsFor,
  computeDue, upcomingDues, summarize,
  validateImport, exportData,
};

if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.VSBD = api;
