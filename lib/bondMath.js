// lib/bondMath.js
// Pure-JavaScript bond mathematics utilities

export const parseDate = (s) => {
  if (s instanceof Date) return s;
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const isoDate = (d) => d.toISOString().slice(0, 10);
export const fmtDate = (d) => parseDate(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
export const addBusinessDays = (start, n) => {
  const d = new Date(start);
  let added = 0;
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) added++;
  }
  return d;
};

// Bracket: find prev/next coupon dates around settlement
export const bracket = (maturity, freq, settle) => {
  const intervalMonths = 12 / freq;
  const mD = parseDate(maturity);
  const sD = parseDate(settle);
  let prev = new Date(mD);
  let next = new Date(mD);
  while (prev > sD) {
    next = new Date(prev);
    prev = new Date(prev);
    prev.setUTCMonth(prev.getUTCMonth() - intervalMonths);
  }
  return { last: prev, next: next };
};

// Day count: 30/360 (US convention)
const dc30360 = (d1, d2) => {
  let y1 = d1.getUTCFullYear(), m1 = d1.getUTCMonth() + 1, day1 = d1.getUTCDate();
  let y2 = d2.getUTCFullYear(), m2 = d2.getUTCMonth() + 1, day2 = d2.getUTCDate();
  if (day1 === 31) day1 = 30;
  if (day2 === 31 && day1 === 30) day2 = 30;
  return ((y2 - y1) * 360 + (m2 - m1) * 30 + (day2 - day1));
};

// Day count between two dates — used for both period length AND accrued days.
// For ACT/* conventions this returns actual calendar days.
// For 30/360 this returns the 30/360 count.
const dcDays = (d1, d2, dc) => {
  if (dc === '30/360') return dc30360(d1, d2);
  return Math.round((d2 - d1) / 86400000);
};

// Period length basis for fixed-period conventions.
// Returns null for ACT/ACT (which uses actual coupon period length).
// Returns the fixed denominator for the others:
//   30/360  → 360/freq days per period
//   ACT/360 → 360/freq days per period
//   ACT/365 → 365/freq days per period (used by UK Gilts)
const dcFixedPeriodDays = (freq, dc) => {
  if (dc === '30/360')  return 360 / freq;
  if (dc === 'ACT/360') return 360 / freq;
  if (dc === 'ACT/365') return 365 / freq;
  return null; // ACT/ACT → use actual period
};

// Effective period length used in accrued-interest and yield math.
// For ACT/ACT it's the actual days between coupon dates.
// For fixed-period conventions it's the canonical fraction of a year.
const periodLength = (lastCpn, nextCpn, freq, dc) => {
  const fixed = dcFixedPeriodDays(freq, dc);
  if (fixed !== null) return fixed;
  return dcDays(lastCpn, nextCpn, dc);
};

const dcBasis = (d1, d2, dc) => {
  if (dc === '30/360') return 360;
  if (dc === 'ACT/360') return 360;
  if (dc === 'ACT/365') return 365;
  return 365; // ACT/ACT
};

// Accrued interest
export const calcAccrued = (bond, lastCpn, nextCpn, settle) => {
  const accruedDays = dcDays(lastCpn, settle, bond.dc);
  const periodDays = periodLength(lastCpn, nextCpn, bond.freq, bond.dc);
  const couponPerPeriod = bond.coupon / bond.freq;
  const ai = couponPerPeriod * (accruedDays / periodDays);
  return { ai, accruedDays, periodDays };
};

// Clean price from yield (Newton-Raphson via direct PV calc)
export const cleanFromYtm = (ytm, bond, settle) => {
  const { last, next } = bracket(bond.maturity, bond.freq, settle);
  const couponPerPeriod = bond.coupon / bond.freq;
  const yieldPerPeriod = ytm / bond.freq;
  const mD = parseDate(bond.maturity);
  const sD = parseDate(settle);

  // Count remaining periods
  const intervalMonths = 12 / bond.freq;
  let n = 0;
  let d = new Date(next);
  while (d <= mD) {
    n++;
    d = new Date(d);
    d.setUTCMonth(d.getUTCMonth() + intervalMonths);
  }
  if (n === 0) n = 1;

  const periodDays = periodLength(last, next, bond.freq, bond.dc);
  const remainingInPeriod = dcDays(sD, next, bond.dc);
  const w = remainingInPeriod / periodDays;

  // Sum of discounted cash flows
  let dirty = 0;
  for (let i = 1; i <= n; i++) {
    const cf = (i === n) ? couponPerPeriod + 100 : couponPerPeriod;
    dirty += cf / Math.pow(1 + yieldPerPeriod, w + (i - 1));
  }
  const ai = calcAccrued(bond, last, next, sD).ai;
  return dirty - ai;
};

// Yield from clean price (Newton-Raphson)
export const ytmFromClean = (cleanPx, bond, settle) => {
  let y = 0.05;
  for (let i = 0; i < 100; i++) {
    const px = cleanFromYtm(y, bond, settle);
    const dpx = (cleanFromYtm(y + 0.0001, bond, settle) - px) / 0.0001;
    if (Math.abs(dpx) < 1e-10) break;
    const newY = y - (px - cleanPx) / dpx;
    if (Math.abs(newY - y) < 1e-10) return newY;
    y = Math.max(-0.5, Math.min(0.99, newY));
  }
  return y;
};

// Macaulay duration in years
const macaulayDuration = (ytm, bond, settle) => {
  const { last, next } = bracket(bond.maturity, bond.freq, settle);
  const couponPerPeriod = bond.coupon / bond.freq;
  const yieldPerPeriod = ytm / bond.freq;
  const mD = parseDate(bond.maturity);
  const sD = parseDate(settle);

  const intervalMonths = 12 / bond.freq;
  let n = 0;
  let d = new Date(next);
  while (d <= mD) {
    n++;
    d = new Date(d);
    d.setUTCMonth(d.getUTCMonth() + intervalMonths);
  }
  if (n === 0) n = 1;

  const periodDays = periodLength(last, next, bond.freq, bond.dc);
  const remainingInPeriod = dcDays(sD, next, bond.dc);
  const w = remainingInPeriod / periodDays;

  let weightedSum = 0;
  let priceSum = 0;
  for (let i = 1; i <= n; i++) {
    const cf = (i === n) ? couponPerPeriod + 100 : couponPerPeriod;
    const t = (w + i - 1) / bond.freq; // time in years
    const pv = cf / Math.pow(1 + yieldPerPeriod, w + i - 1);
    weightedSum += t * pv;
    priceSum += pv;
  }
  return priceSum > 0 ? weightedSum / priceSum : 0;
};

// Full calculation: takes user inputs, returns everything the UI needs.
// `face` is in money units (e.g., 1000000 for $1M face).
// `priceInput` is per-100-face string, `ytmInput` is percentage string.
// `lastEdited` indicates which input the user typed in last ('price' or 'ytm').
export const fullCalc = (bond, settle, face, priceInput, ytmInput, lastEdited) => {
  if (!bond || !settle) return null;

  let ytm, cleanPx;
  if (lastEdited === 'price' && priceInput) {
    cleanPx = parseFloat(priceInput);
    if (isNaN(cleanPx) || cleanPx <= 0) return null;
    ytm = ytmFromClean(cleanPx, bond, settle);
  } else if (lastEdited === 'ytm' && ytmInput) {
    ytm = parseFloat(ytmInput) / 100;
    if (isNaN(ytm)) return null;
    cleanPx = cleanFromYtm(ytm, bond, settle);
  } else {
    return null;
  }

  const { last, next } = bracket(bond.maturity, bond.freq, settle);
  const ai = calcAccrued(bond, last, next, settle);
  const dirtyPx = cleanPx + ai.ai;

  // Money amounts — face is the face value in dollars/etc.
  const f = parseFloat(face) || 0;
  const principalAmt = (cleanPx / 100) * f;
  const aiAmt = (ai.ai / 100) * f;
  const totalAmt = (dirtyPx / 100) * f;

  // Risk metrics
  const macDur = macaulayDuration(ytm, bond, settle);
  const modDur = macDur / (1 + ytm / bond.freq);

  // DV01: change in dirty price (in money) for a 1bp parallel yield shift
  const cleanPxUp = cleanFromYtm(ytm + 0.0001, bond, settle);
  const dv01 = ((cleanPx - cleanPxUp) / 100) * f;

  return {
    ytm,
    cleanPx,
    dirtyPx,
    modDur,
    dv01,
    ai: ai.ai,
    aiAmt,
    principalAmt,
    totalAmt,
    days: ai.accruedDays,
    last,
    next,
  };
};
