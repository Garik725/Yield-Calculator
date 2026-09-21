
// pages/api/risk.js
//
// Yield Calculator — historical risk API.
//
// Existing mode:
// POST /api/risk
// { tickers: ['SPY', 'TLT'], from: '2025-01-01', to: '2026-01-01' }
//
// Portfolio mode:
// POST /api/risk
// {
//   mode: 'portfolio',
//   tickers: ['AAPL', 'MSFT'],
//   weights: { AAPL: 0.4, MSFT: 0.6 },
//   portfolioValue: 100000,
//   annualRiskFreeRate: 0,
//   from: '2025-01-01',
//   to: '2026-01-01'
// }
//
// The EODHD token remains server-side.
// Historical prices are fetched through the existing priceData provider.

import {
  fetchPriceData,
  createEodhdProvider
} from '../../lib/priceData';

import {
  analyzeRisk,
  analyzePortfolioRisk
} from '../../lib/riskMath';

const MAX_TICKERS = 20;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const TICKER_PATTERN = /^[A-Z0-9.\-]{1,20}$/;

const sendError = (res, status, error, errors = null) => {
  return res.status(status).json({
    ok: false,
    error,
    ...(errors ? { errors } : {})
  });
};

const isValidDate = value => {
  if (
    typeof value !== 'string' ||
    !DATE_PATTERN.test(value)
  ) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const normalizeTicker = value => {
  if (typeof value !== 'string') {
    return null;
  }

  const ticker = value.trim().toUpperCase();

  return TICKER_PATTERN.test(ticker)
    ? ticker
    : null;
};

const validatePortfolioWeights = (weights, tickers) => {
  if (
    !weights ||
    typeof weights !== 'object' ||
    Array.isArray(weights)
  ) {
    return {
      error: 'Portfolio mode requires a weights object keyed by ticker'
    };
  }

  const normalizedInput = {};

  for (const [rawTicker, rawWeight] of Object.entries(weights)) {
    const ticker = normalizeTicker(rawTicker);

    if (!ticker) {
      return {
        error: `Invalid ticker in portfolio weights: ${rawTicker}`
      };
    }

    if (Object.prototype.hasOwnProperty.call(normalizedInput, ticker)) {
      return {
        error: `Duplicate ticker in portfolio weights: ${ticker}`
      };
    }

    // Do not accept strings, null or non-finite numeric values.
    if (
      typeof rawWeight !== 'number' ||
      !Number.isFinite(rawWeight) ||
      rawWeight < 0
    ) {
      return {
        error: `Invalid weight for ${ticker}; use a non-negative number`
      };
    }

    normalizedInput[ticker] = rawWeight;
  }

  const extraTickers = Object.keys(normalizedInput).filter(
    ticker => !tickers.includes(ticker)
  );

  if (extraTickers.length > 0) {
    return {
      error: `Weights contain instruments not in tickers: ${extraTickers.join(', ')}`
    };
  }

  const missingTickers = tickers.filter(
    ticker => !Object.prototype.hasOwnProperty.call(normalizedInput, ticker)
  );

  if (missingTickers.length > 0) {
    return {
      error: `Missing portfolio weights: ${missingTickers.join(', ')}`
    };
  }

  const totalWeight = tickers.reduce(
    (sum, ticker) => sum + normalizedInput[ticker],
    0
  );

  if (
    !Number.isFinite(totalWeight) ||
    totalWeight <= 0
  ) {
    return {
      error: 'Portfolio weights must have a positive total'
    };
  }

  const normalizedWeights = {};

  for (const ticker of tickers) {
    normalizedWeights[ticker] =
      normalizedInput[ticker] / totalWeight;
  }

  return {
    weights: normalizedWeights
  };
};

export default async function handler(req, res) {
  // ---------------------------------------------------------
  // 1. HTTP method
  // ---------------------------------------------------------

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return sendError(
      res,
      405,
      'Method not allowed; use POST'
    );
  }

  // ---------------------------------------------------------
  // 2. API configuration
  // ---------------------------------------------------------

  const token = process.env.EODHD_API_TOKEN;

  if (!token) {
    console.error(
      '[/api/risk] EODHD_API_TOKEN is not configured'
    );

    return sendError(
      res,
      500,
      'Server is not configured for price data fetching'
    );
  }

  // ---------------------------------------------------------
  // 3. Request body
  // ---------------------------------------------------------

  const {
    mode = 'risk',
    tickers: requestedTickers,
    from,
    to,
    weights = null,
    portfolioValue = null,
    annualRiskFreeRate = 0
  } = req.body || {};

  const isPortfolioMode = mode === 'portfolio';

  if (mode !== 'risk' && mode !== 'portfolio') {
    return sendError(
      res,
      400,
      'Invalid mode; use risk or portfolio'
    );
  }

  // ---------------------------------------------------------
  // 4. Validate tickers
  // ---------------------------------------------------------

  if (
    !Array.isArray(requestedTickers) ||
    requestedTickers.length < 2
  ) {
    return sendError(
      res,
      400,
      'Body must include tickers[] with at least 2 entries'
    );
  }

  if (requestedTickers.length > MAX_TICKERS) {
    return sendError(
      res,
      400,
      `Too many tickers (max ${MAX_TICKERS} per request)`
    );
  }

  const tickers = requestedTickers.map(normalizeTicker);

  if (tickers.some(ticker => ticker === null)) {
    return sendError(
      res,
      400,
      'One or more ticker symbols are invalid'
    );
  }

  if (new Set(tickers).size !== tickers.length) {
    return sendError(
      res,
      400,
      'Duplicate tickers are not allowed'
    );
  }

  // ---------------------------------------------------------
  // 5. Validate dates
  // ---------------------------------------------------------

  if (!isValidDate(from) || !isValidDate(to)) {
    return sendError(
      res,
      400,
      'Body must include valid from and to dates (YYYY-MM-DD)'
    );
  }

  if (from >= to) {
    return sendError(
      res,
      400,
      'The from date must be earlier than the to date'
    );
  }

  // ---------------------------------------------------------
  // 6. Portfolio-mode validation
  // ---------------------------------------------------------

  let portfolioWeights = null;
  let validatedPortfolioValue = null;
  let validatedRiskFreeRate = 0;

  if (isPortfolioMode) {
    const weightResult = validatePortfolioWeights(
      weights,
      tickers
    );

    if (weightResult.error) {
      return sendError(
        res,
        400,
        weightResult.error
      );
    }

    portfolioWeights = weightResult.weights;

    if (
      portfolioValue !== null &&
      portfolioValue !== undefined
    ) {
      if (
        typeof portfolioValue !== 'number' ||
        !Number.isFinite(portfolioValue) ||
        portfolioValue <= 0
      ) {
        return sendError(
          res,
          400,
          'portfolioValue must be a positive number'
        );
      }

      validatedPortfolioValue = portfolioValue;
    }

    if (
      typeof annualRiskFreeRate !== 'number' ||
      !Number.isFinite(annualRiskFreeRate) ||
      annualRiskFreeRate <= -1
    ) {
      return sendError(
        res,
        400,
        'annualRiskFreeRate must be a finite decimal greater than -1'
      );
    }

    validatedRiskFreeRate = annualRiskFreeRate;
  }

  // ---------------------------------------------------------
  // 7. Fetch historical prices through existing provider
  // ---------------------------------------------------------

  let fetchResult;

  try {
    const provider = createEodhdProvider(token);

    fetchResult = await fetchPriceData(
      tickers,
      from,
      to,
      { provider }
    );
  } catch (error) {
    console.error(
      '[/api/risk] Historical price fetch failed:',
      error
    );

    return sendError(
      res,
      502,
      'Historical price data could not be fetched'
    );
  }

  const priceData = fetchResult?.priceData || {};
  const fetchedTickers = Object.keys(priceData);

  // ---------------------------------------------------------
  // 8. Handle unsuccessful ticker requests
  // ---------------------------------------------------------

  const missingTickers = tickers.filter(
    ticker => !Object.prototype.hasOwnProperty.call(priceData, ticker)
  );

  // In portfolio mode, every requested instrument must be present.
  // Never calculate a different portfolio by silently dropping
  // missing tickers and renormalizing the remaining weights.

  if (isPortfolioMode && missingTickers.length > 0) {
    const errors = {
      ...(fetchResult?.errors || {})
    };

    for (const ticker of missingTickers) {
      if (!errors[ticker]) {
        errors[ticker] = 'Historical price data unavailable';
      }
    }

    return sendError(
      res,
      400,
      `Portfolio risk cannot be calculated: missing price history for ${missingTickers.join(', ')}`,
      errors
    );
  }

  // Preserve the existing Risk page's partial-success behavior.
  // Ordinary risk mode may continue with the successful tickers.

  if (fetchedTickers.length < 2) {
    return sendError(
      res,
      400,
      'Could not fetch enough price data to compute risk',
      fetchResult?.errors || {}
    );
  }

  // ---------------------------------------------------------
  // 9. Run calculations
  // ---------------------------------------------------------

  let report;

  try {
    if (isPortfolioMode) {
      report = analyzePortfolioRisk({
        priceData,
        weights: portfolioWeights,
        portfolioValue: validatedPortfolioValue,
        annualRiskFreeRate: validatedRiskFreeRate
      });
    } else {
      report = analyzeRisk(priceData);
    }
  } catch (error) {
    console.error(
      '[/api/risk] Risk calculation failed:',
      error
    );

    return sendError(
      res,
      500,
      'Risk calculation failed'
    );
  }

  if (!report) {
    return sendError(
      res,
      400,
      'Price data was insufficient for risk calculation (likely too few aligned dates)',
      fetchResult?.errors || {}
    );
  }

  // ---------------------------------------------------------
  // 10. Success response
  // ---------------------------------------------------------

  return res.status(200).json({
    ok: true,
    report,

    ...(fetchResult?.errors
      ? { errors: fetchResult.errors }
      : {}),

    ...(fetchResult?.warnings
      ? { warnings: fetchResult.warnings }
      : {})
  });
}
