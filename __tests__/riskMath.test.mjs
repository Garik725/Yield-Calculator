// lib/riskMath.js
//
// Pure mathematical engine for realized volatility and correlation analytics.
// Knows nothing about HTTP, the API, or the UI. Takes in plain JavaScript
// objects representing price history and returns plain objects with stats.
// Designed to be called either from the API-driven flow or from the
// CSV-paste prototype with identical semantics.
//
// Input shape:
//   priceData = {
//     [ticker]: [{ date: 'YYYY-MM-DD', price: 123.45 }, ...]
//   }
//
// Convention: `price` is always the ADJUSTED close (split- and dividend-
// adjusted). Using raw close prices will silently produce wrong numbers
// on any corporate action — it is the caller's responsibility to feed
// adjusted prices.

export const TRADING_DAYS_PER_YEAR = 252;

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate the priceData input. Returns null if OK, or an error string.
 * Catches the silent-failure modes: empty input, single-ticker input
 * (correlation needs ≥2), missing price field, non-numeric prices.
 */
export const validatePriceData = (priceData) => {
  if (!priceData || typeof priceData !== 'object') {
    return 'priceData must be an object keyed by ticker';
  }
  const tickers = Object.keys(priceData);
  if (tickers.length < 2) {
    return `Need at least 2 tickers for correlation, got ${tickers.length}`;
  }
  for (const t of tickers) {
    const series = priceData[t];
    if (!Array.isArray(series)) return `${t}: price series must be an array`;
    if (series.length < 3) return `${t}: need at least 3 price observations, got ${series.length}`;
    for (let i = 0; i < series.length; i++) {
      const row = series[i];
      if (!row || typeof row !== 'object') return `${t}: row ${i} is not an object`;
      if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
        return `${t}: row ${i} has invalid date "${row.date}" (need YYYY-MM-DD)`;
      }
      if (typeof row.price !== 'number' || isNaN(row.price) || row.price <= 0) {
        return `${t}: row ${i} (${row.date}) has invalid price ${row.price}`;
      }
    }
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Alignment — the most important step.
// Inner-join on dates: keep only dates where every ticker has a price.
// No forward-fill, no interpolation, no "approximately equal" matching.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Align price series across tickers to a common date grid.
 * Returns:
 *   {
 *     tickers: [...],              // input order preserved
 *     dates: ['YYYY-MM-DD', ...],  // ascending, aligned across all tickers
 *     prices: { [ticker]: [n1, n2, ...] },  // index matches dates[]
 *     dropped: { [ticker]: [{date, reason}, ...] },  // diagnostic
 *     coverage: number,            // 0..1, aligned dates / longest series
 *   }
 */
export const alignSeries = (priceData) => {
  const tickers = Object.keys(priceData);

  // Build per-ticker date→price maps for O(1) lookup, and track the
  // longest series for the coverage metric.
  const byDate = {};
  let longest = 0;
  for (const t of tickers) {
    const series = priceData[t];
    const m = new Map();
    for (const row of series) m.set(row.date, row.price);
    byDate[t] = m;
    if (series.length > longest) longest = series.length;
  }

  // Universe of all dates seen across any ticker, sorted ascending.
  const allDates = new Set();
  for (const t of tickers) {
    for (const row of priceData[t]) allDates.add(row.date);
  }
  const sortedDates = [...allDates].sort();

  // Inner-join: keep only dates where every ticker has a price.
  const dates = [];
  const dropped = {};
  for (const t of tickers) dropped[t] = [];

  for (const d of sortedDates) {
    const missing = tickers.filter(t => !byDate[t].has(d));
    if (missing.length === 0) {
      dates.push(d);
    } else {
      // Record which tickers were missing on this date — useful diagnostic.
      for (const t of missing) dropped[t].push({ date: d, reason: 'no price on this date' });
    }
  }

  // Materialize aligned price vectors.
  const prices = {};
  for (const t of tickers) prices[t] = dates.map(d => byDate[t].get(d));

  return {
    tickers,
    dates,
    prices,
    dropped,
    coverage: longest > 0 ? dates.length / longest : 0,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Returns
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert aligned price vectors to log returns.
 * Log returns (ln(P_t / P_{t-1})) are used because they are time-additive
 * (sum of log returns over a period = log return of the period), which
 * makes the √252 annualization mathematically clean. Simple returns
 * (P_t/P_{t-1} - 1) would require a slightly different annualization
 * and don't compose as cleanly.
 */
export const computeLogReturns = (aligned) => {
  const { tickers, dates, prices } = aligned;
  const returns = {};
  const returnDates = dates.slice(1); // first date has no prior to compare to
  for (const t of tickers) {
    const arr = [];
    const p = prices[t];
    for (let i = 1; i < p.length; i++) {
      arr.push(Math.log(p[i] / p[i - 1]));
    }
    returns[t] = arr;
  }
  return { tickers, dates: returnDates, returns };
};

// ─────────────────────────────────────────────────────────────────────────────
// Statistical primitives
// ─────────────────────────────────────────────────────────────────────────────

const mean = (arr) => {
  if (!arr.length) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
};

const sampleStdev = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let s2 = 0;
  for (const v of arr) s2 += (v - m) * (v - m);
  // n-1 denominator (sample, not population) — appropriate for a return sample.
  return Math.sqrt(s2 / (arr.length - 1));
};

const pearsonCorrelation = (a, b) => {
  if (a.length !== b.length) throw new Error('Series length mismatch');
  if (a.length < 2) return 0;
  const ma = mean(a), mb = mean(b);
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - ma, db = b[i] - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  const denom = Math.sqrt(va * vb);
  if (denom === 0) return 0; // a constant series has zero variance
  return cov / denom;
};

// Export the primitives for testing — they're the building blocks.
export const _stats = { mean, sampleStdev, pearsonCorrelation };

// ─────────────────────────────────────────────────────────────────────────────
// Top-level analytics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute realized volatility for each ticker.
 * Returns: { [ticker]: { dailyMean, dailyStdev, annualizedVol } }
 * Values are in decimal form (0.02 = 2%). Caller multiplies by 100 for display.
 */
export const computeVolatility = (returnsByTicker) => {
  const result = {};
  for (const [ticker, r] of Object.entries(returnsByTicker)) {
    const dailyMean = mean(r);
    const dailyStdev = sampleStdev(r);
    result[ticker] = {
      dailyMean,
      dailyStdev,
      annualizedVol: dailyStdev * Math.sqrt(TRADING_DAYS_PER_YEAR),
      observations: r.length,
    };
  }
  return result;
};

/**
 * Compute the full pairwise Pearson correlation matrix.
 * Returns:
 *   {
 *     tickers: [...],
 *     matrix: number[][],  // matrix[i][j] = corr(tickers[i], tickers[j])
 *   }
 * The matrix is symmetric with 1.0 on the diagonal.
 */
export const computeCorrelationMatrix = (returnsByTicker) => {
  const tickers = Object.keys(returnsByTicker);
  const n = tickers.length;
  const matrix = Array.from({ length: n }, () => new Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else if (j > i) {
        matrix[i][j] = pearsonCorrelation(returnsByTicker[tickers[i]], returnsByTicker[tickers[j]]);
      } else {
        matrix[i][j] = matrix[j][i]; // symmetric
      }
    }
  }
  return { tickers, matrix };
};

// ─────────────────────────────────────────────────────────────────────────────
// One-call convenience: priceData → full report
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the full pipeline: validate → align → log returns → vol + correlation.
 * Returns null with console.warn on validation failure (consistent with
 * the bondMath module pattern).
 */
export const analyzeRisk = (priceData) => {
  const err = validatePriceData(priceData);
  if (err) {
    if (typeof console !== 'undefined') console.warn('[riskMath] ' + err);
    return null;
  }
  const aligned = alignSeries(priceData);
  if (aligned.dates.length < 5) {
    if (typeof console !== 'undefined') {
      console.warn(`[riskMath] Only ${aligned.dates.length} dates survived alignment; need at least 5`);
    }
    return null;
  }
  const { returns, dates: returnDates } = computeLogReturns(aligned);
  const volatility = computeVolatility(returns);
  const correlation = computeCorrelationMatrix(returns);
  return {
    tickers: aligned.tickers,
    alignedDates: aligned.dates,
    returnDates,
    coverage: aligned.coverage,
    dropped: aligned.dropped,
    volatility,
    correlation,
    annualizationFactor: TRADING_DAYS_PER_YEAR,
  };
};
