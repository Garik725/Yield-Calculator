// lib/riskMath.js
//
// YieldCalculator.tech
// Core risk analytics engine.
//
// Existing functionality preserved:
// - Daily log returns
// - Realized volatility
// - Pearson correlation
// - Strict date alignment
//
// Added portfolio analytics:
// - Covariance matrix
// - Portfolio return series
// - Portfolio volatility
// - Annualized return
// - Sharpe ratio
// - Maximum drawdown
// - Historical VaR 95% / 99%
// - Expected Shortfall 95% / 99%
// - Risk contribution
// - Concentration metrics
// - Diversification benefit
// - Optional beta vs benchmark
//
// No React, HTTP, EODHD, localStorage or UI logic belongs here.

export const TRADING_DAYS_PER_YEAR = 252;

// ─────────────────────────────────────────────────────────────
// BASIC HELPERS
// ─────────────────────────────────────────────────────────────

const isFiniteNumber = value =>
  typeof value === 'number' && Number.isFinite(value);

const toFiniteNumber = value => {
  const n =
    typeof value === 'number'
      ? value
      : parseFloat(value);

  return Number.isFinite(n) ? n : null;
};

const isValidDateString = value =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value);

export const mean = values => {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  let sum = 0;

  for (const value of values) {
    if (!isFiniteNumber(value)) return null;
    sum += value;
  }

  return sum / values.length;
};

export const sampleVariance = values => {
  if (!Array.isArray(values) || values.length < 2) {
    return null;
  }

  const m = mean(values);

  if (m === null) return null;

  let sumSq = 0;

  for (const value of values) {
    const diff = value - m;
    sumSq += diff * diff;
  }

  return sumSq / (values.length - 1);
};

export const sampleStdev = values => {
  const variance = sampleVariance(values);

  return variance === null
    ? null
    : Math.sqrt(Math.max(variance, 0));
};

export const sampleCovariance = (a, b) => {
  if (
    !Array.isArray(a) ||
    !Array.isArray(b) ||
    a.length !== b.length ||
    a.length < 2
  ) {
    return null;
  }

  const meanA = mean(a);
  const meanB = mean(b);

  if (meanA === null || meanB === null) {
    return null;
  }

  let sum = 0;

  for (let i = 0; i < a.length; i++) {
    sum +=
      (a[i] - meanA) *
      (b[i] - meanB);
  }

  return sum / (a.length - 1);
};

export const pearsonCorrelation = (a, b) => {
  const covariance =
    sampleCovariance(a, b);

  const stdevA =
    sampleStdev(a);

  const stdevB =
    sampleStdev(b);

  if (
    covariance === null ||
    stdevA === null ||
    stdevB === null ||
    stdevA === 0 ||
    stdevB === 0
  ) {
    return 0;
  }

  return covariance / (stdevA * stdevB);
};

// ─────────────────────────────────────────────────────────────
// PRICE DATA NORMALIZATION
// ─────────────────────────────────────────────────────────────

const normalizeObservation = observation => {
  if (
    Array.isArray(observation) &&
    observation.length >= 2
  ) {
    const date = observation[0];
    const price = toFiniteNumber(observation[1]);

    return {
      date,
      price
    };
  }

  if (
    observation &&
    typeof observation === 'object'
  ) {
    const date =
      observation.date ||
      observation.datetime ||
      observation.day;

    const price =
      toFiniteNumber(
        observation.price ??
        observation.adjustedClose ??
        observation.adjusted_close ??
        observation.adjusted_close_price ??
        observation.close
      );

    return {
      date,
      price
    };
  }

  return {
    date: null,
    price: null
  };
};

export const normalizePriceSeries = series => {
  if (!Array.isArray(series)) {
    return [];
  }

  const byDate = new Map();

  for (const raw of series) {
    const { date, price } =
      normalizeObservation(raw);

    if (
      !isValidDateString(date) ||
      price === null ||
      price <= 0
    ) {
      continue;
    }

    // If duplicate dates exist, latest occurrence wins.
    byDate.set(date, price);
  }

  return [...byDate.entries()]
    .map(([date, price]) => ({
      date,
      price
    }))
    .sort((a, b) =>
      a.date.localeCompare(b.date)
    );
};

// ─────────────────────────────────────────────────────────────
// INPUT VALIDATION
// ─────────────────────────────────────────────────────────────

export const validatePriceData = (
  priceData,
  {
    minimumSeriesLength = 3,
    minimumTickers = 1
  } = {}
) => {
  if (
    !priceData ||
    typeof priceData !== 'object' ||
    Array.isArray(priceData)
  ) {
    throw new Error(
      'priceData must be an object keyed by ticker'
    );
  }

  const tickers =
    Object.keys(priceData);

  if (tickers.length < minimumTickers) {
    throw new Error(
      `At least ${minimumTickers} instrument${
        minimumTickers === 1 ? '' : 's'
      } required`
    );
  }

  const normalized = {};
  const warnings = {};

  for (const ticker of tickers) {
    const series =
      normalizePriceSeries(
        priceData[ticker]
      );

    if (
      series.length <
      minimumSeriesLength
    ) {
      throw new Error(
        `${ticker} has insufficient price history`
      );
    }

    normalized[ticker] =
      series;

    if (series.length < 60) {
      warnings[ticker] =
        `Only ${series.length} price observations are available. Risk estimates may be unstable.`;
    }
  }

  return {
    tickers,
    normalized,
    warnings
  };
};

// ─────────────────────────────────────────────────────────────
// DATE ALIGNMENT
// ─────────────────────────────────────────────────────────────

export const alignSeries = priceData => {
  const {
    tickers,
    normalized
  } = validatePriceData(
    priceData,
    {
      minimumTickers: 1,
      minimumSeriesLength: 3
    }
  );

  const maps = {};

  let longestSeriesLength = 0;

  for (const ticker of tickers) {
    maps[ticker] =
      new Map(
        normalized[ticker].map(
          item => [
            item.date,
            item.price
          ]
        )
      );

    longestSeriesLength =
      Math.max(
        longestSeriesLength,
        normalized[ticker].length
      );
  }

  const allDates =
    new Set();

  for (const ticker of tickers) {
    for (
      const { date } of
      normalized[ticker]
    ) {
      allDates.add(date);
    }
  }

  const sortedDates =
    [...allDates].sort();

  const alignedDates = [];
  const alignedPrices = {};

  for (const ticker of tickers) {
    alignedPrices[ticker] = [];
  }

  for (const date of sortedDates) {
    const pricesForDate = {};

    let complete = true;

    for (const ticker of tickers) {
      const price =
        maps[ticker].get(date);

      if (
        price === undefined ||
        !Number.isFinite(price) ||
        price <= 0
      ) {
        complete = false;
        break;
      }

      pricesForDate[ticker] =
        price;
    }

    if (!complete) continue;

    alignedDates.push(date);

    for (const ticker of tickers) {
      alignedPrices[ticker].push(
        pricesForDate[ticker]
      );
    }
  }

  const dropped = {};

  for (const ticker of tickers) {
    const alignedDateSet =
      new Set(alignedDates);

    dropped[ticker] =
      normalized[ticker]
        .map(x => x.date)
        .filter(
          date =>
            !alignedDateSet.has(date)
        );
  }

  const coverage =
    longestSeriesLength > 0
      ? alignedDates.length /
        longestSeriesLength
      : 0;

  return {
    tickers,
    alignedDates,
    alignedPrices,
    dropped,
    coverage
  };
};

// ─────────────────────────────────────────────────────────────
// RETURNS
// ─────────────────────────────────────────────────────────────

export const computeLogReturns = prices => {
  if (
    !Array.isArray(prices) ||
    prices.length < 2
  ) {
    return [];
  }

  const returns = [];

  for (
    let i = 1;
    i < prices.length;
    i++
  ) {
    const previous =
      prices[i - 1];

    const current =
      prices[i];

    if (
      !Number.isFinite(previous) ||
      !Number.isFinite(current) ||
      previous <= 0 ||
      current <= 0
    ) {
      throw new Error(
        'Prices must be positive finite numbers'
      );
    }

    returns.push(
      Math.log(
        current / previous
      )
    );
  }

  return returns;
};

export const computeReturnSeries = (
  alignedPrices,
  tickers
) => {
  const returns = {};

  for (const ticker of tickers) {
    returns[ticker] =
      computeLogReturns(
        alignedPrices[ticker]
      );
  }

  return returns;
};

// ─────────────────────────────────────────────────────────────
// VOLATILITY
// ─────────────────────────────────────────────────────────────

export const computeVolatility = (
  returnSeries
) => {
  const result = {};

  for (
    const [
      ticker,
      returns
    ] of Object.entries(
      returnSeries
    )
  ) {
    const dailyMean =
      mean(returns) ?? 0;

    const dailyStdev =
      sampleStdev(returns) ?? 0;

    result[ticker] = {
      dailyMean,
      dailyStdev,

      annualizedVol:
        dailyStdev *
        Math.sqrt(
          TRADING_DAYS_PER_YEAR
        ),

      observations:
        returns.length
    };
  }

  return result;
};

// ─────────────────────────────────────────────────────────────
// CORRELATION MATRIX
// ─────────────────────────────────────────────────────────────

export const computeCorrelationMatrix = (
  returnSeries
) => {
  const tickers =
    Object.keys(returnSeries);

  const matrix =
    tickers.map(
      (tickerA, i) =>
        tickers.map(
          (tickerB, j) => {
            if (i === j) {
              return 1;
            }

            return pearsonCorrelation(
              returnSeries[tickerA],
              returnSeries[tickerB]
            );
          }
        )
    );

  return {
    tickers,
    matrix
  };
};

// ─────────────────────────────────────────────────────────────
// COVARIANCE MATRIX
// ─────────────────────────────────────────────────────────────

export const computeCovarianceMatrix = (
  returnSeries
) => {
  const tickers =
    Object.keys(returnSeries);

  const dailyMatrix =
    tickers.map(
      tickerA =>
        tickers.map(
          tickerB =>
            sampleCovariance(
              returnSeries[tickerA],
              returnSeries[tickerB]
            ) ?? 0
        )
    );

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

// ─────────────────────────────────────────────────────────────
// WEIGHTS
// ─────────────────────────────────────────────────────────────

export const normalizeWeights = (
  weights,
  tickers
) => {
  if (
    !Array.isArray(tickers) ||
    tickers.length === 0
  ) {
    throw new Error(
      'tickers are required'
    );
  }

  let rawWeights;

  if (Array.isArray(weights)) {
    if (
      weights.length !==
      tickers.length
    ) {
      throw new Error(
        'weights length must match ticker count'
      );
    }

    rawWeights =
      weights.map(
        value =>
          toFiniteNumber(value)
      );
  } else if (
    weights &&
    typeof weights === 'object'
  ) {
    rawWeights =
      tickers.map(
        ticker =>
          toFiniteNumber(
            weights[ticker]
          )
      );
  } else {
    // Equal-weight fallback.
    rawWeights =
      tickers.map(
        () => 1
      );
  }

  if (
    rawWeights.some(
      value => value === null
    )
  ) {
    throw new Error(
      'All portfolio weights must be finite numbers'
    );
  }

  const totalWeight =
    rawWeights.reduce(
      (sum, value) =>
        sum + value,
      0
    );

  if (
    Math.abs(totalWeight) <
    1e-12
  ) {
    throw new Error(
      'Portfolio weights must not sum to zero'
    );
  }

  const normalizedArray =
    rawWeights.map(
      value =>
        value /
        totalWeight
    );

  const byTicker = {};

  tickers.forEach(
    (ticker, index) => {
      byTicker[ticker] =
        normalizedArray[index];
    }
  );

  return {
    tickers,
    array:
      normalizedArray,
    byTicker
  };
};

// ─────────────────────────────────────────────────────────────
// PORTFOLIO RETURNS
// ─────────────────────────────────────────────────────────────

export const computePortfolioReturns = (
  returnSeries,
  weights
) => {
  const tickers =
    Object.keys(returnSeries);

  if (tickers.length === 0) {
    return [];
  }

  const normalizedWeights =
    normalizeWeights(
      weights,
      tickers
    );

  const observations =
    Math.min(
      ...tickers.map(
        ticker =>
          returnSeries[ticker].length
      )
    );

  const portfolioReturns = [];

  for (
    let i = 0;
    i < observations;
    i++
  ) {
    let portfolioReturn = 0;

    for (
      let j = 0;
      j < tickers.length;
      j++
    ) {
      portfolioReturn +=
        normalizedWeights.array[j] *
        returnSeries[
          tickers[j]
        ][i];
    }

    portfolioReturns.push(
      portfolioReturn
    );
  }

  return portfolioReturns;
};

// ─────────────────────────────────────────────────────────────
// MATRIX HELPERS
// ─────────────────────────────────────────────────────────────

const matrixVectorMultiply = (
  matrix,
  vector
) =>
  matrix.map(
    row =>
      row.reduce(
        (sum, value, index) =>
          sum +
          value *
          vector[index],
        0
      )
  );

const dotProduct = (a, b) =>
  a.reduce(
    (sum, value, index) =>
      sum +
      value *
      b[index],
    0
  );

// ─────────────────────────────────────────────────────────────
// PORTFOLIO VOLATILITY
// ─────────────────────────────────────────────────────────────

export const computePortfolioVolatility = ({
  covarianceMatrix,
  weights
}) => {
  if (
    !covarianceMatrix ||
    !Array.isArray(
      covarianceMatrix.tickers
    )
  ) {
    throw new Error(
      'covarianceMatrix is required'
    );
  }

  const tickers =
    covarianceMatrix.tickers;

  const normalizedWeights =
    normalizeWeights(
      weights,
      tickers
    );

  const annualCov =
    covarianceMatrix
      .annualizedMatrix;

  const sigmaW =
    matrixVectorMultiply(
      annualCov,
      normalizedWeights.array
    );

  const variance =
    dotProduct(
      normalizedWeights.array,
      sigmaW
    );

  return Math.sqrt(
    Math.max(
      variance,
      0
    )
  );
};

// ─────────────────────────────────────────────────────────────
// ANNUALIZED RETURN
// ─────────────────────────────────────────────────────────────

export const computeAnnualizedReturn = (
  returns
) => {
  if (
    !Array.isArray(returns) ||
    returns.length === 0
  ) {
    return null;
  }

  const totalLogReturn =
    returns.reduce(
      (sum, value) =>
        sum + value,
      0
    );

  const annualizedLogReturn =
    totalLogReturn *
    (
      TRADING_DAYS_PER_YEAR /
      returns.length
    );

  return (
    Math.exp(
      annualizedLogReturn
    ) - 1
  );
};

// ─────────────────────────────────────────────────────────────
// SHARPE RATIO
// ─────────────────────────────────────────────────────────────

export const computeSharpeRatio = (
  returns,
  annualRiskFreeRate = 0
) => {
  if (
    !Array.isArray(returns) ||
    returns.length < 2
  ) {
    return null;
  }

  const annualizedReturn =
    computeAnnualizedReturn(
      returns
    );

  const dailyStdev =
    sampleStdev(returns);

  if (
    annualizedReturn === null ||
    dailyStdev === null ||
    dailyStdev === 0
  ) {
    return null;
  }

  const annualizedVol =
    dailyStdev *
    Math.sqrt(
      TRADING_DAYS_PER_YEAR
    );

  return (
    annualizedReturn -
    annualRiskFreeRate
  ) / annualizedVol;
};

// ─────────────────────────────────────────────────────────────
// MAXIMUM DRAWDOWN
// ─────────────────────────────────────────────────────────────

export const computeMaxDrawdown = (
  returns
) => {
  if (
    !Array.isArray(returns) ||
    returns.length === 0
  ) {
    return {
      maxDrawdown: null,
      peakIndex: null,
      troughIndex: null
    };
  }

  let wealth = 1;
  let peakWealth = 1;

  let peakIndex = 0;
  let maxDrawdown = 0;
  let maxPeakIndex = 0;
  let maxTroughIndex = 0;

  for (
    let i = 0;
    i < returns.length;
    i++
  ) {
    wealth *=
      Math.exp(
        returns[i]
      );

    if (
      wealth >
      peakWealth
    ) {
      peakWealth =
        wealth;

      peakIndex =
        i;
    }

    const drawdown =
      wealth /
        peakWealth -
      1;

    if (
      drawdown <
      maxDrawdown
    ) {
      maxDrawdown =
        drawdown;

      maxPeakIndex =
        peakIndex;

      maxTroughIndex =
        i;
    }
  }

  return {
    maxDrawdown,
    peakIndex:
      maxPeakIndex,
    troughIndex:
      maxTroughIndex
  };
};

// ─────────────────────────────────────────────────────────────
// PERCENTILES
// ─────────────────────────────────────────────────────────────

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
      'Percentile p must be between 0 and 1'
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

  if (lower === upper) {
    return sorted[lower];
  }

  const fraction =
    index - lower;

  return (
    sorted[lower] +
    (
      sorted[upper] -
      sorted[lower]
    ) *
    fraction
  );
};

// ─────────────────────────────────────────────────────────────
// HISTORICAL VaR
// ─────────────────────────────────────────────────────────────

export const computeHistoricalVaR = (
  returns,
  confidence = 0.95
) => {
  if (
    !Array.isArray(returns) ||
    returns.length === 0
  ) {
    return null;
  }

  if (
    confidence <= 0 ||
    confidence >= 1
  ) {
    throw new Error(
      'confidence must be between 0 and 1'
    );
  }

  const tailProbability =
    1 - confidence;

  const returnQuantile =
    percentile(
      returns,
      tailProbability
    );

  if (
    returnQuantile === null
  ) {
    return null;
  }

  // VaR is reported as a positive loss magnitude.
  return Math.max(
    0,
    -returnQuantile
  );
};

// ─────────────────────────────────────────────────────────────
// EXPECTED SHORTFALL
// ─────────────────────────────────────────────────────────────

export const computeExpectedShortfall = (
  returns,
  confidence = 0.95
) => {
  if (
    !Array.isArray(returns) ||
    returns.length === 0
  ) {
    return null;
  }

  const tailProbability =
    1 - confidence;

  const threshold =
    percentile(
      returns,
      tailProbability
    );

  if (
    threshold === null
  ) {
    return null;
  }

  const tail =
    returns.filter(
      value =>
        value <= threshold
    );

  if (tail.length === 0) {
    return 0;
  }

  const tailMean =
    mean(tail);

  return Math.max(
    0,
    -(tailMean ?? 0)
  );
};

// ─────────────────────────────────────────────────────────────
// RISK CONTRIBUTION
// ─────────────────────────────────────────────────────────────

export const computeRiskContribution = ({
  covarianceMatrix,
  weights
}) => {
  const tickers =
    covarianceMatrix.tickers;

  const normalizedWeights =
    normalizeWeights(
      weights,
      tickers
    );

  const annualCov =
    covarianceMatrix
      .annualizedMatrix;

  const sigmaW =
    matrixVectorMultiply(
      annualCov,
      normalizedWeights.array
    );

  const portfolioVariance =
    dotProduct(
      normalizedWeights.array,
      sigmaW
    );

  const portfolioVolatility =
    Math.sqrt(
      Math.max(
        portfolioVariance,
        0
      )
    );

  const rows =
    tickers.map(
      (ticker, index) => {
        const marginalRisk =
          portfolioVolatility > 0
            ? sigmaW[index] /
              portfolioVolatility
            : 0;

        const riskContribution =
          normalizedWeights.array[
            index
          ] *
          marginalRisk;

        const percentContribution =
          portfolioVolatility > 0
            ? riskContribution /
              portfolioVolatility
            : 0;

        return {
          ticker,

          weight:
            normalizedWeights.array[
              index
            ],

          marginalRisk,

          riskContribution,

          percentContribution
        };
      }
    );

  return {
    portfolioVolatility,
    rows
  };
};

// ─────────────────────────────────────────────────────────────
// CONCENTRATION
// ─────────────────────────────────────────────────────────────

export const computeConcentration = (
  weights,
  tickers
) => {
  const normalizedWeights =
    normalizeWeights(
      weights,
      tickers
    );

  const positiveWeights =
    normalizedWeights.array.map(
      value =>
        Math.abs(value)
    );

  const sorted =
    positiveWeights
      .map(
        (weight, index) => ({
          ticker:
            tickers[index],
          weight
        })
      )
      .sort(
        (a, b) =>
          b.weight -
          a.weight
      );

  const largestHolding =
    sorted[0] || null;

  const top3Weight =
    sorted
      .slice(0, 3)
      .reduce(
        (sum, item) =>
          sum +
          item.weight,
        0
      );

  const hhi =
    positiveWeights.reduce(
      (sum, weight) =>
        sum +
        weight *
          weight,
      0
    );

  return {
    largestHolding,
    top3Weight,
    hhi
  };
};

// ─────────────────────────────────────────────────────────────
// DIVERSIFICATION BENEFIT
// ─────────────────────────────────────────────────────────────

export const computeDiversificationBenefit = ({
  volatility,
  weights,
  portfolioVolatility
}) => {
  const tickers =
    Object.keys(
      volatility
    );

  const normalizedWeights =
    normalizeWeights(
      weights,
      tickers
    );

  let weightedStandaloneVol = 0;

  for (
    let i = 0;
    i < tickers.length;
    i++
  ) {
    weightedStandaloneVol +=
      Math.abs(
        normalizedWeights.array[i]
      ) *
      volatility[
        tickers[i]
      ].annualizedVol;
  }

  if (
    weightedStandaloneVol <= 0
  ) {
    return null;
  }

  return (
    1 -
    portfolioVolatility /
      weightedStandaloneVol
  );
};

// ─────────────────────────────────────────────────────────────
// BETA
// ─────────────────────────────────────────────────────────────

export const computeBeta = (
  assetReturns,
  benchmarkReturns
) => {
  if (
    !Array.isArray(
      assetReturns
    ) ||
    !Array.isArray(
      benchmarkReturns
    )
  ) {
    return null;
  }

  const n =
    Math.min(
      assetReturns.length,
      benchmarkReturns.length
    );

  if (n < 2) {
    return null;
  }

  const asset =
    assetReturns.slice(
      0,
      n
    );

  const benchmark =
    benchmarkReturns.slice(
      0,
      n
    );

  const covariance =
    sampleCovariance(
      asset,
      benchmark
    );

  const benchmarkVariance =
    sampleVariance(
      benchmark
    );

  if (
    covariance === null ||
    benchmarkVariance === null ||
    benchmarkVariance === 0
  ) {
    return null;
  }

  return (
    covariance /
    benchmarkVariance
  );
};

// ─────────────────────────────────────────────────────────────
// EXISTING / GENERAL RISK ANALYSIS
// ─────────────────────────────────────────────────────────────

export const analyzeRisk = (
  priceData,
  {
    minimumAlignedDates = 20
  } = {}
) => {
  const validation =
    validatePriceData(
      priceData,
      {
        minimumTickers: 1,
        minimumSeriesLength: 3
      }
    );

  const {
    tickers,
    alignedDates,
    alignedPrices,
    dropped,
    coverage
  } = alignSeries(
    validation.normalized
  );

  if (
    alignedDates.length <
    minimumAlignedDates
  ) {
    throw new Error(
      `Only ${alignedDates.length} aligned trading dates are available. At least ${minimumAlignedDates} are required.`
    );
  }

  const returnSeries =
    computeReturnSeries(
      alignedPrices,
      tickers
    );

  const returnDates =
    alignedDates.slice(1);

  const volatility =
    computeVolatility(
      returnSeries
    );

  const correlation =
    computeCorrelationMatrix(
      returnSeries
    );

  const covariance =
    computeCovarianceMatrix(
      returnSeries
    );

  const warnings = {
    ...validation.warnings
  };

  if (
    alignedDates.length < 60
  ) {
    warnings._portfolio =
      `Only ${alignedDates.length} aligned trading dates are available. Results should be interpreted cautiously.`;
  }

  if (coverage < 0.8) {
    warnings._alignment =
      `Only ${(coverage * 100).toFixed(1)}% of the longest price history survives strict date alignment.`;
  }

  return {
    tickers,

    alignedDates,

    returnDates,

    coverage,

    dropped,

    volatility,

    correlation,

    covariance,

    // Useful internally when portfolio analytics are required.
    returnSeries,

    warnings
  };
};

// ─────────────────────────────────────────────────────────────
// PORTFOLIO RISK ANALYSIS
// ─────────────────────────────────────────────────────────────

export const analyzePortfolioRisk = ({
  priceData,

  weights = null,

  portfolioValue = null,

  annualRiskFreeRate = 0,

  benchmarkReturns = null,

  minimumAlignedDates = 20
}) => {
  const base =
    analyzeRisk(
      priceData,
      {
        minimumAlignedDates
      }
    );

  const tickers =
    base.tickers;

  const normalizedWeights =
    normalizeWeights(
      weights,
      tickers
    );

  const portfolioReturns =
    computePortfolioReturns(
      base.returnSeries,
      normalizedWeights.byTicker
    );

  const portfolioVolatility =
    computePortfolioVolatility({
      covarianceMatrix:
        base.covariance,

      weights:
        normalizedWeights.byTicker
    });

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
    computeRiskContribution({
      covarianceMatrix:
        base.covariance,

      weights:
        normalizedWeights.byTicker
    });

  const concentration =
    computeConcentration(
      normalizedWeights.byTicker,
      tickers
    );

  const diversificationBenefit =
    computeDiversificationBenefit({
      volatility:
        base.volatility,

      weights:
        normalizedWeights.byTicker,

      portfolioVolatility
    });

  const beta =
    benchmarkReturns
      ? computeBeta(
          portfolioReturns,
          benchmarkReturns
        )
      : null;

  const numericPortfolioValue =
    toFiniteNumber(
      portfolioValue
    );

  const dollarRisk =
    numericPortfolioValue !== null &&
    numericPortfolioValue > 0
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
    ...base,

    weights:
      normalizedWeights.byTicker,

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

      beta,

      diversificationBenefit,

      concentration,

      riskContribution,

      dollarRisk
    },

    portfolioReturns
  };
};
// ─────────────────────────────────────────────────────────────
// BACKWARD-COMPATIBILITY EXPORTS FOR EXISTING TESTS
// ─────────────────────────────────────────────────────────────

export const _stats = {
  mean,

  variance: sampleVariance,
  sampleVariance,

  stdev: sampleStdev,
  stddev: sampleStdev,
  sampleStdev,
  sampleStdDev: sampleStdev,

  covariance: sampleCovariance,
  sampleCovariance,

  correlation: pearsonCorrelation,
  pearson: pearsonCorrelation,
  pearsonCorrelation,

  percentile
};
