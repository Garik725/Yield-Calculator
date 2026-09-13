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

    if (!Array.isArray(series)) {
      return `${t}: price series must be an array`;
    }

    if (series.length < 3) {
      return `${t}: need at least 3 price observations, got ${series.length}`;
    }

    for (let i = 0; i < series.length; i++) {
      const row = series[i];

      if (!row || typeof row !== 'object') {
        return `${t}: row ${i} is not an object`;
      }

      if (
        typeof row.date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row.date)
      ) {
        return `${t}: row ${i} has invalid date "${row.date}" (need YYYY-MM-DD)`;
      }

      if (
        typeof row.price !== 'number' ||
        isNaN(row.price) ||
        row.price <= 0
      ) {
        return `${t}: row ${i} (${row.date}) has invalid price ${row.price}`;
      }
    }
  }

  return null;
};


// ─────────────────────────────────────────────────────────────────────────────
// Alignment
// ─────────────────────────────────────────────────────────────────────────────
//
// Inner-join on dates: keep only dates where every ticker has a price.
// No forward-fill, no interpolation, no "approximately equal" matching.

/**
 * Align price series across tickers to a common date grid.
 *
 * Returns:
 * {
 *   tickers: [...],
 *   dates: ['YYYY-MM-DD', ...],
 *   prices: { [ticker]: [n1, n2, ...] },
 *   dropped: { [ticker]: [{date, reason}, ...] },
 *   coverage: number,
 * }
 */
export const alignSeries = (priceData) => {
  const tickers = Object.keys(priceData);

  const byDate = {};
  let longest = 0;

  for (const t of tickers) {
    const series = priceData[t];
    const m = new Map();

    for (const row of series) {
      m.set(row.date, row.price);
    }

    byDate[t] = m;

    if (series.length > longest) {
      longest = series.length;
    }
  }

  const allDates = new Set();

  for (const t of tickers) {
    for (const row of priceData[t]) {
      allDates.add(row.date);
    }
  }

  const sortedDates = [...allDates].sort();

  const dates = [];

  const dropped = {};

  for (const t of tickers) {
    dropped[t] = [];
  }

  for (const d of sortedDates) {
    const missing = tickers.filter(
      t => !byDate[t].has(d)
    );

    if (missing.length === 0) {
      dates.push(d);
    } else {
      for (const t of missing) {
        dropped[t].push({
          date: d,
          reason: 'no price on this date'
        });
      }
    }
  }

  const prices = {};

  for (const t of tickers) {
    prices[t] = dates.map(
      d => byDate[t].get(d)
    );
  }

  return {
    tickers,
    dates,
    prices,
    dropped,
    coverage:
      longest > 0
        ? dates.length / longest
        : 0,
  };
};


// ─────────────────────────────────────────────────────────────────────────────
// Returns
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert aligned price vectors to log returns.
 */
export const computeLogReturns = (aligned) => {
  const {
    tickers,
    dates,
    prices
  } = aligned;

  const returns = {};

  const returnDates =
    dates.slice(1);

  for (const t of tickers) {
    const arr = [];
    const p = prices[t];

    for (
      let i = 1;
      i < p.length;
      i++
    ) {
      arr.push(
        Math.log(
          p[i] /
          p[i - 1]
        )
      );
    }

    returns[t] = arr;
  }

  return {
    tickers,
    dates: returnDates,
    returns
  };
};


// ─────────────────────────────────────────────────────────────────────────────
// Statistical primitives
// ─────────────────────────────────────────────────────────────────────────────

const mean = (arr) => {
  if (!arr.length) {
    return 0;
  }

  let s = 0;

  for (const v of arr) {
    s += v;
  }

  return s / arr.length;
};


const sampleStdev = (arr) => {
  if (arr.length < 2) {
    return 0;
  }

  const m = mean(arr);

  let s2 = 0;

  for (const v of arr) {
    s2 +=
      (v - m) *
      (v - m);
  }

  return Math.sqrt(
    s2 /
    (arr.length - 1)
  );
};


const pearsonCorrelation = (a, b) => {
  if (a.length !== b.length) {
    throw new Error(
      'Series length mismatch'
    );
  }

  if (a.length < 2) {
    return 0;
  }

  const ma = mean(a);
  const mb = mean(b);

  let cov = 0;
  let va = 0;
  let vb = 0;

  for (
    let i = 0;
    i < a.length;
    i++
  ) {
    const da =
      a[i] - ma;

    const db =
      b[i] - mb;

    cov +=
      da * db;

    va +=
      da * da;

    vb +=
      db * db;
  }

  const denom =
    Math.sqrt(
      va * vb
    );

  if (denom === 0) {
    return 0;
  }

  return cov / denom;
};


// KEEP THIS EXACTLY FOR EXISTING TESTS
export const _stats = {
  mean,
  sampleStdev,
  pearsonCorrelation
};


// ─────────────────────────────────────────────────────────────────────────────
// Existing top-level analytics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute realized volatility for each ticker.
 */
export const computeVolatility = (returnsByTicker) => {
  const result = {};

  for (
    const [
      ticker,
      r
    ] of Object.entries(
      returnsByTicker
    )
  ) {
    const dailyMean =
      mean(r);

    const dailyStdev =
      sampleStdev(r);

    result[ticker] = {
      dailyMean,
      dailyStdev,

      annualizedVol:
        dailyStdev *
        Math.sqrt(
          TRADING_DAYS_PER_YEAR
        ),

      observations:
        r.length,
    };
  }

  return result;
};


/**
 * Compute the full pairwise Pearson correlation matrix.
 */
export const computeCorrelationMatrix = (
  returnsByTicker
) => {
  const tickers =
    Object.keys(
      returnsByTicker
    );

  const n =
    tickers.length;

  const matrix =
    Array.from(
      { length: n },
      () => new Array(n)
    );

  for (
    let i = 0;
    i < n;
    i++
  ) {
    for (
      let j = 0;
      j < n;
      j++
    ) {
      if (i === j) {
        matrix[i][j] = 1;
      }

      else if (j > i) {
        matrix[i][j] =
          pearsonCorrelation(
            returnsByTicker[
              tickers[i]
            ],
            returnsByTicker[
              tickers[j]
            ]
          );
      }

      else {
        matrix[i][j] =
          matrix[j][i];
      }
    }
  }

  return {
    tickers,
    matrix
  };
};


// ─────────────────────────────────────────────────────────────────────────────
// Existing one-call convenience
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the existing pipeline:
 * validate → align → log returns → vol + correlation.
 *
 * THIS FUNCTION REMAINS BACKWARD-COMPATIBLE.
 */
export const analyzeRisk = (priceData) => {
  const err =
    validatePriceData(
      priceData
    );

  if (err) {
    if (
      typeof console !==
      'undefined'
    ) {
      console.warn(
        '[riskMath] ' +
        err
      );
    }

    return null;
  }

  const aligned =
    alignSeries(
      priceData
    );

  if (
    aligned.dates.length <
    5
  ) {
    if (
      typeof console !==
      'undefined'
    ) {
      console.warn(
        `[riskMath] Only ${aligned.dates.length} dates survived alignment; need at least 5`
      );
    }

    return null;
  }

  const {
    returns,
    dates:
      returnDates
  } =
    computeLogReturns(
      aligned
    );

  const volatility =
    computeVolatility(
      returns
    );

  const correlation =
    computeCorrelationMatrix(
      returns
    );

  return {
    tickers:
      aligned.tickers,

    alignedDates:
      aligned.dates,

    returnDates,

    coverage:
      aligned.coverage,

    dropped:
      aligned.dropped,

    volatility,

    correlation,

    annualizationFactor:
      TRADING_DAYS_PER_YEAR,
  };
};


// ============================================================================
// NEW PORTFOLIO RISK ENGINE
// ============================================================================
//
// Everything below this point is new.
//
// The existing Risk page does not depend on these functions.
// They are intended for the Portfolio module.


// ─────────────────────────────────────────────────────────────────────────────
// Variance / covariance
// ─────────────────────────────────────────────────────────────────────────────

export const sampleVariance = (arr) => {
  if (
    !Array.isArray(arr) ||
    arr.length < 2
  ) {
    return 0;
  }

  const sd =
    sampleStdev(arr);

  return sd * sd;
};


export const sampleCovariance = (a, b) => {
  if (
    !Array.isArray(a) ||
    !Array.isArray(b)
  ) {
    throw new Error(
      'Covariance inputs must be arrays'
    );
  }

  if (
    a.length !== b.length
  ) {
    throw new Error(
      'Series length mismatch'
    );
  }

  if (
    a.length < 2
  ) {
    return 0;
  }

  const ma = mean(a);
  const mb = mean(b);

  let sum = 0;

  for (
    let i = 0;
    i < a.length;
    i++
  ) {
    sum +=
      (a[i] - ma) *
      (b[i] - mb);
  }

  return (
    sum /
    (a.length - 1)
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Covariance matrix
// ─────────────────────────────────────────────────────────────────────────────

export const computeCovarianceMatrix = (
  returnsByTicker
) => {
  const tickers =
    Object.keys(
      returnsByTicker
    );

  const n =
    tickers.length;

  const dailyMatrix =
    Array.from(
      { length: n },
      () =>
        new Array(n).fill(0)
    );

  for (
    let i = 0;
    i < n;
    i++
  ) {
    for (
      let j = 0;
      j < n;
      j++
    ) {
      if (j < i) {
        dailyMatrix[i][j] =
          dailyMatrix[j][i];

        continue;
      }

      dailyMatrix[i][j] =
        sampleCovariance(
          returnsByTicker[
            tickers[i]
          ],
          returnsByTicker[
            tickers[j]
          ]
        );
    }
  }

  const annualizedMatrix =
    dailyMatrix.map(
      row =>
        row.map(
          value =>
            value *
            TRADING_DAYS_PER_YEAR
        )
    );

  return {
    tickers,
    dailyMatrix,
    annualizedMatrix
  };
};


// ─────────────────────────────────────────────────────────────────────────────
// Portfolio weights
// ─────────────────────────────────────────────────────────────────────────────

export const normalizePortfolioWeights = (
  weights,
  tickers
) => {
  if (
    !Array.isArray(tickers) ||
    tickers.length === 0
  ) {
    return {
      tickers: [],
      array: [],
      byTicker: {}
    };
  }

  let raw;

  if (Array.isArray(weights)) {
    if (
      weights.length !==
      tickers.length
    ) {
      throw new Error(
        'Weights length must match ticker count'
      );
    }

    raw =
      weights.map(Number);
  }

  else if (
    weights &&
    typeof weights ===
      'object'
  ) {
    raw =
      tickers.map(
        ticker =>
          Number(
            weights[ticker] ??
            0
          )
      );
  }

  else {
    // Equal weighting fallback.
    raw =
      tickers.map(
        () => 1
      );
  }

  if (
    raw.some(
      x =>
        !Number.isFinite(x)
    )
  ) {
    throw new Error(
      'Portfolio weights must be finite numbers'
    );
  }

  const total =
    raw.reduce(
      (sum, value) =>
        sum + value,
      0
    );

  if (
    Math.abs(total) <
    1e-12
  ) {
    throw new Error(
      'Portfolio weights cannot sum to zero'
    );
  }

  const array =
    raw.map(
      value =>
        value / total
    );

  const byTicker = {};

  tickers.forEach(
    (ticker, index) => {
      byTicker[ticker] =
        array[index];
    }
  );

  return {
    tickers,
    array,
    byTicker
  };
};


// ─────────────────────────────────────────────────────────────────────────────
// Portfolio return series
// ─────────────────────────────────────────────────────────────────────────────

export const computePortfolioReturns = (
  returnsByTicker,
  weights
) => {
  const tickers =
    Object.keys(
      returnsByTicker
    );

  if (
    tickers.length === 0
  ) {
    return [];
  }

  const normalized =
    normalizePortfolioWeights(
      weights,
      tickers
    );

  const lengths =
    tickers.map(
      ticker =>
        returnsByTicker[
          ticker
        ].length
    );

  const observations =
    Math.min(
      ...lengths
    );

  const result = [];

  for (
    let i = 0;
    i < observations;
    i++
  ) {
    let r = 0;

    for (
      let j = 0;
      j < tickers.length;
      j++
    ) {
      r +=
        normalized.array[j] *
        returnsByTicker[
          tickers[j]
        ][i];
    }

    result.push(r);
  }

  return result;
};


// ─────────────────────────────────────────────────────────────────────────────
// Portfolio volatility
// ─────────────────────────────────────────────────────────────────────────────

export const computePortfolioVolatility = (
  covariance,
  weights
) => {
  if (
    !covariance ||
    !Array.isArray(
      covariance.tickers
    )
  ) {
    return 0;
  }

  const normalized =
    normalizePortfolioWeights(
      weights,
      covariance.tickers
    );

  const matrix =
    covariance.annualizedMatrix;

  let variance = 0;

  for (
    let i = 0;
    i <
    normalized.array.length;
    i++
  ) {
    for (
      let j = 0;
      j <
      normalized.array.length;
      j++
    ) {
      variance +=
        normalized.array[i] *
        normalized.array[j] *
        matrix[i][j];
    }
  }

  return Math.sqrt(
    Math.max(
      variance,
      0
    )
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Annualized portfolio return
// ─────────────────────────────────────────────────────────────────────────────

export const computeAnnualizedReturn = (
  portfolioReturns
) => {
  if (
    !Array.isArray(
      portfolioReturns
    ) ||
    portfolioReturns.length ===
      0
  ) {
    return 0;
  }

  const averageDailyLogReturn =
    mean(
      portfolioReturns
    );

  return (
    Math.exp(
      averageDailyLogReturn *
      TRADING_DAYS_PER_YEAR
    ) - 1
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Sharpe ratio
// ─────────────────────────────────────────────────────────────────────────────

export const computeSharpeRatio = (
  portfolioReturns,
  annualRiskFreeRate = 0
) => {
  if (
    !Array.isArray(
      portfolioReturns
    ) ||
    portfolioReturns.length <
      2
  ) {
    return null;
  }

  const dailyVol =
    sampleStdev(
      portfolioReturns
    );

  if (
    dailyVol === 0
  ) {
    return null;
  }

  const dailyRiskFreeLog =
    Math.log(
      1 +
      annualRiskFreeRate
    ) /
    TRADING_DAYS_PER_YEAR;

  const dailyExcess =
    mean(
      portfolioReturns
    ) -
    dailyRiskFreeLog;

  return (
    dailyExcess /
    dailyVol
  ) *
  Math.sqrt(
    TRADING_DAYS_PER_YEAR
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Maximum drawdown
// ─────────────────────────────────────────────────────────────────────────────

export const computeMaxDrawdown = (
  portfolioReturns
) => {
  if (
    !Array.isArray(
      portfolioReturns
    ) ||
    portfolioReturns.length ===
      0
  ) {
    return {
      maxDrawdown: 0,
      peakIndex: null,
      troughIndex: null
    };
  }

  let wealth = 1;
  let peakWealth = 1;

  let currentPeakIndex =
    0;

  let worstDrawdown =
    0;

  let worstPeakIndex =
    0;

  let worstTroughIndex =
    0;

  for (
    let i = 0;
    i <
    portfolioReturns.length;
    i++
  ) {
    wealth *=
      Math.exp(
        portfolioReturns[i]
      );

    if (
      wealth >
      peakWealth
    ) {
      peakWealth =
        wealth;

      currentPeakIndex =
        i;
    }

    const drawdown =
      wealth /
        peakWealth -
      1;

    if (
      drawdown <
      worstDrawdown
    ) {
      worstDrawdown =
        drawdown;

      worstPeakIndex =
        currentPeakIndex;

      worstTroughIndex =
        i;
    }
  }

  return {
    maxDrawdown:
      worstDrawdown,

    peakIndex:
      worstPeakIndex,

    troughIndex:
      worstTroughIndex
  };
};


// ─────────────────────────────────────────────────────────────────────────────
// Percentile helper
// ─────────────────────────────────────────────────────────────────────────────

export const percentile = (
  values,
  p
) => {
  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {
    return null;
  }

  if (
    p < 0 ||
    p > 1
  ) {
    throw new Error(
      'Percentile must be between 0 and 1'
    );
  }

  const sorted =
    [...values].sort(
      (a, b) => a - b
    );

  if (
    sorted.length === 1
  ) {
    return sorted[0];
  }

  const index =
    (sorted.length - 1) *
    p;

  const lower =
    Math.floor(index);

  const upper =
    Math.ceil(index);

  if (
    lower === upper
  ) {
    return sorted[lower];
  }

  const weight =
    index - lower;

  return (
    sorted[lower] *
      (1 - weight) +
    sorted[upper] *
      weight
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Historical VaR
// ─────────────────────────────────────────────────────────────────────────────

export const computeHistoricalVaR = (
  portfolioReturns,
  confidence = 0.95
) => {
  if (
    !Array.isArray(
      portfolioReturns
    ) ||
    portfolioReturns.length ===
      0
  ) {
    return null;
  }

  const tailProbability =
    1 - confidence;

  const q =
    percentile(
      portfolioReturns,
      tailProbability
    );

  if (q === null) {
    return null;
  }

  // Returned as positive loss magnitude.
  return Math.max(
    0,
    -q
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Expected Shortfall
// ─────────────────────────────────────────────────────────────────────────────

export const computeExpectedShortfall = (
  portfolioReturns,
  confidence = 0.95
) => {
  if (
    !Array.isArray(
      portfolioReturns
    ) ||
    portfolioReturns.length ===
      0
  ) {
    return null;
  }

  const q =
    percentile(
      portfolioReturns,
      1 - confidence
    );

  if (q === null) {
    return null;
  }

  const tail =
    portfolioReturns.filter(
      r => r <= q
    );

  if (
    tail.length === 0
  ) {
    return 0;
  }

  return Math.max(
    0,
    -mean(tail)
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Risk contribution
// ─────────────────────────────────────────────────────────────────────────────

export const computeRiskContribution = (
  covariance,
  weights
) => {
  const tickers =
    covariance.tickers;

  const normalized =
    normalizePortfolioWeights(
      weights,
      tickers
    );

  const w =
    normalized.array;

  const sigma =
    covariance.annualizedMatrix;

  const sigmaW =
    new Array(
      tickers.length
    ).fill(0);

  for (
    let i = 0;
    i < tickers.length;
    i++
  ) {
    for (
      let j = 0;
      j < tickers.length;
      j++
    ) {
      sigmaW[i] +=
        sigma[i][j] *
        w[j];
    }
  }

  let portfolioVariance =
    0;

  for (
    let i = 0;
    i < tickers.length;
    i++
  ) {
    portfolioVariance +=
      w[i] *
      sigmaW[i];
  }

  const portfolioVolatility =
    Math.sqrt(
      Math.max(
        portfolioVariance,
        0
      )
    );

  const rows =
    tickers.map(
      (ticker, i) => {
        const marginalRisk =
          portfolioVolatility >
          0
            ? sigmaW[i] /
              portfolioVolatility
            : 0;

        const absoluteContribution =
          w[i] *
          marginalRisk;

        const percentContribution =
          portfolioVolatility >
          0
            ? absoluteContribution /
              portfolioVolatility
            : 0;

        return {
          ticker,

          weight:
            w[i],

          marginalRisk,

          riskContribution:
            absoluteContribution,

          percentContribution
        };
      }
    );

  return {
    portfolioVolatility,
    rows
  };
};


// ─────────────────────────────────────────────────────────────────────────────
// Concentration
// ─────────────────────────────────────────────────────────────────────────────

export const computePortfolioConcentration = (
  weights,
  tickers
) => {
  const normalized =
    normalizePortfolioWeights(
      weights,
      tickers
    );

  const rows =
    tickers
      .map(
        (ticker, i) => ({
          ticker,
          weight:
            Math.abs(
              normalized.array[i]
            )
        })
      )
      .sort(
        (a, b) =>
          b.weight -
          a.weight
      );

  const largestHolding =
    rows.length
      ? rows[0]
      : null;

  const top3Weight =
    rows
      .slice(0, 3)
      .reduce(
        (sum, row) =>
          sum +
          row.weight,
        0
      );

  const hhi =
    rows.reduce(
      (sum, row) =>
        sum +
        row.weight *
          row.weight,
      0
    );

  return {
    largestHolding,
    top3Weight,
    hhi
  };
};


// ─────────────────────────────────────────────────────────────────────────────
// Diversification benefit
// ─────────────────────────────────────────────────────────────────────────────

export const computeDiversificationBenefit = (
  volatility,
  weights,
  portfolioVolatility
) => {
  const tickers =
    Object.keys(
      volatility
    );

  const normalized =
    normalizePortfolioWeights(
      weights,
      tickers
    );

  let weightedStandaloneVol =
    0;

  for (
    let i = 0;
    i < tickers.length;
    i++
  ) {
    weightedStandaloneVol +=
      Math.abs(
        normalized.array[i]
      ) *
      volatility[
        tickers[i]
      ].annualizedVol;
  }

  if (
    weightedStandaloneVol ===
    0
  ) {
    return 0;
  }

  return (
    1 -
    portfolioVolatility /
      weightedStandaloneVol
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Portfolio-level analysis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full portfolio risk pipeline.
 *
 * priceData:
 * {
 *   AAPL: [{date, price}, ...],
 *   MSFT: [{date, price}, ...]
 * }
 *
 * weights can be:
 *
 * {
 *   AAPL: 0.60,
 *   MSFT: 0.40
 * }
 *
 * or:
 *
 * [0.60, 0.40]
 *
 * portfolioValue is optional and allows VaR / ES to also be returned in dollars.
 */
export const analyzePortfolioRisk = ({
  priceData,
  weights = null,
  portfolioValue = null,
  annualRiskFreeRate = 0
}) => {
  // Use the existing validation contract.
  const err =
    validatePriceData(
      priceData
    );

  if (err) {
    if (
      typeof console !==
      'undefined'
    ) {
      console.warn(
        '[riskMath portfolio] ' +
        err
      );
    }

    return null;
  }

  const aligned =
    alignSeries(
      priceData
    );

  if (
    aligned.dates.length <
    5
  ) {
    if (
      typeof console !==
      'undefined'
    ) {
      console.warn(
        `[riskMath portfolio] Only ${aligned.dates.length} aligned dates; need at least 5`
      );
    }

    return null;
  }

  const {
    returns,
    dates:
      returnDates
  } =
    computeLogReturns(
      aligned
    );

  const volatility =
    computeVolatility(
      returns
    );

  const correlation =
    computeCorrelationMatrix(
      returns
    );

  const covariance =
    computeCovarianceMatrix(
      returns
    );

  const normalizedWeights =
    normalizePortfolioWeights(
      weights,
      aligned.tickers
    );

  const portfolioReturns =
    computePortfolioReturns(
      returns,
      normalizedWeights.byTicker
    );

  const portfolioVolatility =
    computePortfolioVolatility(
      covariance,
      normalizedWeights.byTicker
    );

  const annualizedReturn =
    computeAnnualizedReturn(
      portfolioReturns
    );

  const sharpeRatio =
    computeSharpeRatio(
      portfolioReturns,
      annualRiskFreeRate
    );

  const drawdown =
    computeMaxDrawdown(
      portfolioReturns
    );

  const var95 =
    computeHistoricalVaR(
      portfolioReturns,
      0.95
    );

  const var99 =
    computeHistoricalVaR(
      portfolioReturns,
      0.99
    );

  const expectedShortfall95 =
    computeExpectedShortfall(
      portfolioReturns,
      0.95
    );

  const expectedShortfall99 =
    computeExpectedShortfall(
      portfolioReturns,
      0.99
    );

  const riskContribution =
    computeRiskContribution(
      covariance,
      normalizedWeights.byTicker
    );

  const concentration =
    computePortfolioConcentration(
      normalizedWeights.byTicker,
      aligned.tickers
    );

  const diversificationBenefit =
    computeDiversificationBenefit(
      volatility,
      normalizedWeights.byTicker,
      portfolioVolatility
    );

  const numericPortfolioValue =
    Number(
      portfolioValue
    );

  const hasPortfolioValue =
    Number.isFinite(
      numericPortfolioValue
    ) &&
    numericPortfolioValue >
      0;

  const dollarRisk =
    hasPortfolioValue
      ? {
          var95:
            var95 !== null
              ? var95 *
                numericPortfolioValue
              : null,

          var99:
            var99 !== null
              ? var99 *
                numericPortfolioValue
              : null,

          expectedShortfall95:
            expectedShortfall95 !==
            null
              ? expectedShortfall95 *
                numericPortfolioValue
              : null,

          expectedShortfall99:
            expectedShortfall99 !==
            null
              ? expectedShortfall99 *
                numericPortfolioValue
              : null,
        }
      : null;

  return {
    tickers:
      aligned.tickers,

    alignedDates:
      aligned.dates,

    returnDates,

    coverage:
      aligned.coverage,

    dropped:
      aligned.dropped,

    volatility,

    correlation,

    covariance,

    weights:
      normalizedWeights.byTicker,

    portfolioReturns,

    portfolio: {
      observations:
        portfolioReturns.length,

      annualizedReturn,

      annualizedVolatility:
        portfolioVolatility,

      sharpeRatio,

      maxDrawdown:
        drawdown.maxDrawdown,

      drawdownPeakIndex:
        drawdown.peakIndex,

      drawdownTroughIndex:
        drawdown.troughIndex,

      var95,

      var99,

      expectedShortfall95,

      expectedShortfall99,

      diversificationBenefit,

      concentration,

      riskContribution,

      dollarRisk
    },

    annualizationFactor:
      TRADING_DAYS_PER_YEAR,
  };
};
