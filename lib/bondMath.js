// lib/bondMath.js
// Full bond mathematics: price, yield, accrued interest, duration, DV01

// ── Date helpers ──────────────────────────────────────────────────────────────
export function addBusinessDays(date, n) {
  let d = new Date(date);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

export function isoDate(d) {
  const p = n => n < 10 ? '0' + n : n;
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}

export function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

export function parseDate(s) {
  return new Date(s + 'T12:00:00');
}

export function fmtDate(d) {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Coupon schedule ───────────────────────────────────────────────────────────
export function couponDates(maturity, freq) {
  const mat = new Date(maturity);
  const intervalMonths = 12 / freq;
  const dates = [];
  let d = new Date(mat);
  for (let i = 0; i < freq * 65; i++) {
    dates.unshift(new Date(d));
    d.setMonth(d.getMonth() - intervalMonths);
  }
  return dates;
}

export function bracket(maturity, freq, settle) {
  const dates = couponDates(maturity, freq);
  let last = null, next = null;
  for (const d of dates) {
    if (d <= settle) { if (!last || d > last) last = new Date(d); }
    else { if (!next || d < next) next = new Date(d); }
  }
  return { last, next };
}

export function futureCoupons(maturity, freq, settle) {
  return couponDates(maturity, freq).filter(d => d > settle).sort((a, b) => a - b);
}

// ── Day count ─────────────────────────────────────────────────────────────────
export function days30360(d1, d2) {
  let y1=d1.getFullYear(), m1=d1.getMonth()+1, dy1=d1.getDate();
  let y2=d2.getFullYear(), m2=d2.getMonth()+1, dy2=d2.getDate();
  if (dy1===31) dy1=30;
  if (dy2===31 && dy1===30) dy2=30;
  return 360*(y2-y1) + 30*(m2-m1) + (dy2-dy1);
}

export function calcAccrued(bond, last, next, settle) {
  if (!last) return { ai: 0, days: 0 };
  const C = bond.coupon / bond.freq;
  if (bond.dc === 'ACT/ACT') {
    const period = daysBetween(last, next);
    const acc = daysBetween(last, settle);
    if (period <= 0 || acc < 0) return { ai: 0, days: 0 };
    return { ai: C * (acc / period), days: acc };
  } else {
    const acc = days30360(last, settle);
    if (acc < 0) return { ai: 0, days: 0 };
    return { ai: C * (acc / 180), days: acc };
  }
}

export function wFrac(bond, last, next, settle) {
  if (!last) return 1;
  if (bond.dc === 'ACT/ACT') {
    const period = daysBetween(last, next);
    return period > 0 ? daysBetween(settle, next) / period : 1;
  }
  return days30360(settle, next) / 180;
}

// ── Pricing ───────────────────────────────────────────────────────────────────
export function dirtyFromYtm(ytm, bond, settle) {
  const { last, next } = bracket(bond.maturity, bond.freq, settle);
  if (!next) return 100;
  const w = wFrac(bond, last, next, settle);
  const r = ytm / bond.freq;
  const C = bond.coupon / bond.freq;
  const fc = futureCoupons(bond.maturity, bond.freq, settle);
  const n = fc.length;
  if (!n) return 100;
  let px = 0;
  for (let k = 0; k < n; k++) px += C / Math.pow(1 + r, w + k);
  return px + 100 / Math.pow(1 + r, w + n - 1);
}

export function cleanFromYtm(ytm, bond, settle) {
  const { last, next } = bracket(bond.maturity, bond.freq, settle);
  const { ai } = calcAccrued(bond, last, next, settle);
  return dirtyFromYtm(ytm, bond, settle) - ai;
}

export function ytmFromClean(cleanPx, bond, settle) {
  const { last, next } = bracket(bond.maturity, bond.freq, settle);
  const { ai } = calcAccrued(bond, last, next, settle);
  const target = cleanPx + ai;
  let y = bond.coupon / 100;
  if (y < 0.001) y = 0.05;
  const h = 1e-5;
  for (let i = 0; i < 200; i++) {
    const p = dirtyFromYtm(y, bond, settle);
    const delta = p - target;
    if (Math.abs(delta) < 1e-8) break;
    const deriv = (dirtyFromYtm(y + h, bond, settle) - p) / h;
    if (Math.abs(deriv) < 1e-12) break;
    y -= delta / deriv;
    y = Math.max(0.0001, Math.min(y, 0.99));
  }
  return y;
}

// ── Risk metrics ──────────────────────────────────────────────────────────────
export function calcModDur(ytm, bond, settle) {
  const h = 1e-4;
  const p = dirtyFromYtm(ytm, bond, settle);
  const pu = dirtyFromYtm(ytm + h, bond, settle);
  const pd = dirtyFromYtm(ytm - h, bond, settle);
  return Math.abs(p) > 1e-6 ? -(pu - pd) / (2 * h * p) : 0;
}

export function calcDV01(ytm, bond, settle, face) {
  return Math.abs(calcModDur(ytm, bond, settle)) * (dirtyFromYtm(ytm, bond, settle) / 100) * face * 0.0001;
}

// ── Full calculation ──────────────────────────────────────────────────────────
export function fullCalc(bond, settle, face, enteredPrice, enteredYtm, lastEdited) {
  let cleanPx, ytm;

  if (lastEdited === 'price' && enteredPrice !== '') {
    cleanPx = parseFloat(enteredPrice);
    ytm = ytmFromClean(cleanPx, bond, settle);
  } else if (lastEdited === 'ytm' && enteredYtm !== '') {
    ytm = parseFloat(enteredYtm) / 100;
    cleanPx = cleanFromYtm(ytm, bond, settle);
  } else {
    return null;
  }

  const { last, next } = bracket(bond.maturity, bond.freq, settle);
  const { ai, days } = calcAccrued(bond, last, next, settle);
  const dirtyPx = cleanPx + ai;
  const modDur = calcModDur(ytm, bond, settle);
  const dv01 = calcDV01(ytm, bond, settle, face);

  const principalAmt = cleanPx / 100 * face;
  const aiAmt = ai / 100 * face;
  const totalAmt = dirtyPx / 100 * face;

  return {
    cleanPx, dirtyPx, ai, ytm, modDur, dv01,
    principalAmt, aiAmt, totalAmt,
    days, last, next, face,
    currentYield: (bond.coupon / cleanPx) * 100,
  };
}
