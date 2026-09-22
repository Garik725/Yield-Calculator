
// lib/portfolio/scenarioMath.js
//
// YieldCalculator — Portfolio Scenario Engine
//
// Pure JavaScript. No API, React, localStorage,
// or market-data subscription.
//
// Supported individual bond categories:
//   government: interest-rate shock only
//   corporate:  interest-rate + credit-spread shocks
//
// An unclassified bond is excluded, rather than silently
// receiving an assumed credit exposure.
//
// Bond approximation:
//   Delta P / P = -Dmod * Delta y
//                 + 0.5 * C * (Delta y)^2
//
// In this first version, one modified duration is used
// for both rate and spread sensitivity where applicable.

import {
  analyzePositionValuation
} from './valuation';

import {
  fullCalc,
  validateInputs
} from '../bondMath';

export const DEFAULT_SCENARIO = {
  equityShockPct: -5,
  etfShockPct: -3,
  fxShockPct: -2,
  rateShockBps: 100,
  creditSpreadShockBps: 50
};

export const SUPPORTED_BOND_CATEGORIES = [
  'government',
  'corporate'
];

const finite = value => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

const getShock = (scenario, key) => {
  const value = finite(scenario[key]);

  if (value === null) {
    throw new Error(
      `${key} must be a finite number`
    );
  }

  return value;
};

// ---------------------------------------------------------
// Bond classification
// ---------------------------------------------------------

const getBondCategory = position => {
  const raw =
    position.bondCategory ??
    position.bondTerms?.bondCategory ??
    position.metadata?.bondCategory ??
    null;

  if (typeof raw !== 'string') {
    return null;
  }

  const category = raw.trim().toLowerCase();

  return SUPPORTED_BOND_CATEGORIES.includes(category)
    ? category
    : null;
};

// ---------------------------------------------------------
// Contractual bond terms
// ---------------------------------------------------------

const getBondTerms = position => {
  const source =
    position.bondTerms ||
    position.metadata?.bond ||
    position;

  const coupon = finite(source.coupon);
  const freq = finite(source.freq);

  const maturity = source.maturity;
  const dc = source.dc;

  if (
    coupon === null ||
    freq === null ||
    !maturity ||
    !dc
  ) {
    return null;
  }

  return {
    coupon,
    freq,
    maturity,
    dc
  };
};

// ---------------------------------------------------------
// Bond modified duration
// ---------------------------------------------------------

const getBondDuration = (position, cleanPrice, asOf) => {
  // Prefer a manually supplied or previously calculated
  // duration stored on the holding.

  const supplied = finite(
    position.modifiedDuration ??
    position.metadata?.modifiedDuration
  );

  if (supplied !== null) {
    return supplied >= 0
      ? {
          duration: supplied,
          source:
            position.analyticsSource === 'calculated'
              ? 'calculated'
              : 'supplied'
        }
      : null;
  }

  // Otherwise calculate from contractual terms.

  const terms = getBondTerms(position);

  if (!terms || cleanPrice === null) {
    return null;
  }

  const settlement =
    position.settlementDate ||
    asOf;

  if (validateInputs(terms, settlement)) {
    return null;
  }

  try {
    const result = fullCalc(
      terms,
      settlement,
      finite(position.qty ?? position.quantity) || 0,
      String(cleanPrice),
      '',
      'price'
    );

    if (
      result &&
      Number.isFinite(result.modDur) &&
      result.modDur >= 0
    ) {
      return {
        duration: result.modDur,
        source: 'calculated'
      };
    }
  } catch {
    return null;
  }

  return null;
};

// ---------------------------------------------------------
// Position-level scenario
// ---------------------------------------------------------

const evaluatePosition = (
  position,
  scenario,
  asOf
) => {
  const analyzed = analyzePositionValuation(
    position,
    {
      baseCurrency: 'USD',
      useDirtyBondValue: true
    }
  );

  const ticker =
    String(analyzed.symbol || 'Unknown');

  const type = analyzed.assetType;

  const currentValue = analyzed.marketValueBase;

  const basicResult = {
    id: position.id || null,
    ticker,
    type,
    currency: analyzed.currency,
    currentValue,
    projectedValue: null,
    pnl: null,
    returnPct: null,
    modeled: false,
    method: null,
    duration: null,
    durationSource: null,
    convexity: null,

    // Additional bond scenario details.
    bondCategory: null,
    rateShockAppliedBps: null,
    creditSpreadShockAppliedBps: null,
    totalYieldShockBps: null,

    warning: null
  };

  if (
    currentValue === null ||
    !Number.isFinite(currentValue) ||
    currentValue < 0
  ) {
    return {
      ...basicResult,
      warning:
        'Market value unavailable; check price and FX conversion'
    };
  }

  let percentageChange = null;
  let method = null;

  let duration = null;
  let durationSource = null;
  let convexity = null;

  let bondCategory = null;
  let rateShockAppliedBps = null;
  let creditSpreadShockAppliedBps = null;
  let totalYieldShockBps = null;

  // -------------------------------------------------------
  // Stocks
  // -------------------------------------------------------

  if (type === 'stock') {
    percentageChange =
      scenario.equityShockPct / 100;

    method = 'Direct equity price shock';
  }

  // -------------------------------------------------------
  // ETFs
  // -------------------------------------------------------

  else if (type === 'etf') {
    // ETFs receive a separate direct price shock.
    // A bond ETF is not treated as an individual bond.

    percentageChange =
      scenario.etfShockPct / 100;

    method = 'Direct ETF price shock';
  }

  // -------------------------------------------------------
  // FX
  // -------------------------------------------------------

  else if (type === 'fx') {
    percentageChange =
      scenario.fxShockPct / 100;

    method = 'Direct FX conversion-rate shock';
  }

  // -------------------------------------------------------
  // Cash
  // -------------------------------------------------------

  else if (type === 'cash') {
    if (analyzed.currency !== 'USD') {
      return {
        ...basicResult,
        warning:
          'Non-USD cash requires a currency-specific scenario'
      };
    }

    percentageChange = 0;

    method = 'USD cash held constant';
  }

  // -------------------------------------------------------
  // Individual bonds
  // -------------------------------------------------------

  else if (type === 'bond') {
    bondCategory = getBondCategory(position);

    // Do not guess whether an unclassified bond has
    // government or corporate credit exposure.

    if (!bondCategory) {
      return {
        ...basicResult,
        warning:
          'Select Government or Corporate bond category before modeling'
      };
    }

    const durationInfo = getBondDuration(
      position,
      analyzed.currentPrice,
      asOf
    );

    if (!durationInfo) {
      return {
        ...basicResult,
        bondCategory,
        warning:
          'Missing modified duration or complete bond terms'
      };
    }

    duration = durationInfo.duration;
    durationSource = durationInfo.source;

    const suppliedConvexity = finite(
      position.convexity ??
      position.metadata?.convexity
    );

    if (
      suppliedConvexity !== null &&
      suppliedConvexity < 0
    ) {
      return {
        ...basicResult,
        bondCategory,
        warning:
          'Convexity must be non-negative'
      };
    }

    convexity = suppliedConvexity;

    rateShockAppliedBps =
      scenario.rateShockBps;

    // Government bonds receive only the entered
    // interest-rate shock.
    //
    // Corporate bonds receive both the rate shock
    // and the entered credit-spread shock.

    creditSpreadShockAppliedBps =
      bondCategory === 'corporate'
        ? scenario.creditSpreadShockBps
        : 0;

    totalYieldShockBps =
      rateShockAppliedBps +
      creditSpreadShockAppliedBps;

    const yieldChange =
      totalYieldShockBps / 10000;

    const durationEffect =
      -duration * yieldChange;

    const convexityEffect =
      convexity !== null
        ? 0.5 *
          convexity *
          yieldChange *
          yieldChange
        : 0;

    percentageChange =
      durationEffect +
      convexityEffect;

    method =
      bondCategory === 'government'
        ? convexity !== null
          ? 'Government: rate duration + supplied convexity'
          : 'Government: rate duration only'
        : convexity !== null
          ? 'Corporate: rate + spread duration + supplied convexity'
          : 'Corporate: rate + spread duration';
  }

  else {
    return {
      ...basicResult,
      warning: `Unsupported asset type: ${type}`
    };
  }

  if (
    percentageChange === null ||
    !Number.isFinite(percentageChange)
  ) {
    return {
      ...basicResult,
      bondCategory,
      warning: 'Invalid scenario result'
    };
  }

  const projectedValue =
    currentValue * (1 + percentageChange);

  if (
    !Number.isFinite(projectedValue) ||
    projectedValue < 0
  ) {
    return {
      ...basicResult,
      bondCategory,
      warning:
        'Scenario lies outside the supported approximation'
    };
  }

  return {
    ...basicResult,

    projectedValue,

    pnl:
      projectedValue - currentValue,

    returnPct:
      percentageChange * 100,

    modeled: true,

    method,

    duration,
    durationSource,
    convexity,

    bondCategory,
    rateShockAppliedBps,
    creditSpreadShockAppliedBps,
    totalYieldShockBps
  };
};

// ---------------------------------------------------------
// Full portfolio scenario
// ---------------------------------------------------------

export const analyzePortfolioScenario = (
  holdings = [],
  inputScenario = {},
  options = {}
) => {
  if (!Array.isArray(holdings)) {
    throw new Error(
      'holdings must be an array'
    );
  }

  const input = {
    ...DEFAULT_SCENARIO,
    ...inputScenario
  };

  const scenario = {
    equityShockPct: getShock(
      input,
      'equityShockPct'
    ),

    etfShockPct: getShock(
      input,
      'etfShockPct'
    ),

    fxShockPct: getShock(
      input,
      'fxShockPct'
    ),

    rateShockBps: getShock(
      input,
      'rateShockBps'
    ),

    creditSpreadShockBps: getShock(
      input,
      'creditSpreadShockBps'
    )
  };

  const asOf =
    options.asOf ||
    new Date().toISOString().slice(0, 10);

  const positions = holdings.map(
    position =>
      evaluatePosition(
        position,
        scenario,
        asOf
      )
  );

  const modeled = positions.filter(
    position => position.modeled
  );

  const excluded = positions.filter(
    position => !position.modeled
  );

  const totalCurrentValue = positions.reduce(
    (sum, position) =>
      sum +
      (
        Number.isFinite(position.currentValue)
          ? position.currentValue
          : 0
      ),
    0
  );

  const analyzedValue = modeled.reduce(
    (sum, position) =>
      sum + position.currentValue,
    0
  );

  const projectedAnalyzedValue = modeled.reduce(
    (sum, position) =>
      sum + position.projectedValue,
    0
  );

  const pnl =
    projectedAnalyzedValue - analyzedValue;

  const returnPct =
    analyzedValue > 0
      ? pnl / analyzedValue * 100
      : null;

  const coverage =
    totalCurrentValue > 0
      ? analyzedValue / totalCurrentValue
      : 0;

  const allModeled =
    excluded.length === 0;

  return {
    scenario,
    asOf,
    positions,

    summary: {
      positionCount:
        positions.length,

      modeledCount:
        modeled.length,

      excludedCount:
        excluded.length,

      totalCurrentValue,

      analyzedValue,

      projectedAnalyzedValue,

      pnl,
      returnPct,
      coverage,
      allModeled,

      projectedTotalValue:
        allModeled
          ? projectedAnalyzedValue
          : null
    },

    excluded: excluded.map(
      position => ({
        id: position.id,
        ticker: position.ticker,
        type: position.type,
        warning: position.warning
      })
    )
  };
};
