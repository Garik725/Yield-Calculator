
// lib/portfolio/scenarioMath.js
//
// YieldCalculator — Portfolio Scenario Engine
//
// Pure JavaScript. No API, React, localStorage, or market-data dependency.
//
// Scenario inputs:
//   equityShockPct: -5       means stocks fall 5%
//   etfShockPct: -3          means ETFs fall 3%
//   fxShockPct: -2           means FX/cash exchange-rate exposure falls 2%
//   rateShockBps: 100        means yields increase 100 basis points
//   creditSpreadShockBps: 50 means spreads increase 50 basis points
//
// Bond approximation:
//   Delta P / P = -Dmod * Delta y + 0.5 * C * (Delta y)^2
//
// Duration must be provided or calculable from the bond's terms.
// If it isn't, that bond is excluded from modeled results.

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

const getBondTerms = position => {
  // Supports a future enriched portfolio model.
  // Does not invent missing coupon or maturity values.

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

const getBondDuration = (position, cleanPrice, asOf) => {
  // First use explicitly supplied modified duration.

  const supplied = finite(
    position.modifiedDuration ??
    position.metadata?.modifiedDuration
  );

  if (supplied !== null) {
    return supplied >= 0
      ? {
          duration: supplied,
          source: 'supplied'
        }
      : null;
  }

  // Otherwise calculate it from contractual bond details.

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

  const currentValue =
    analyzed.marketValueBase;

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
    warning: null
  };

  if (
    currentValue === null ||
    !Number.isFinite(currentValue) ||
    currentValue < 0
  ) {
    return {
      ...basicResult,
      warning: 'Market value unavailable; check price and FX conversion'
    };
  }

  let percentageChange = null;
  let method = null;

  let duration = null;
  let durationSource = null;
  let convexity = null;

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
    // A separate ETF shock avoids automatically treating
    // bond ETFs such as BND as individual equities.
    //
    // This is a direct ETF price scenario, not a duration
    // or factor-based ETF model.

    percentageChange =
      scenario.etfShockPct / 100;

    method = 'Direct ETF price shock';
  }

  // -------------------------------------------------------
  // FX positions
  // -------------------------------------------------------

  else if (type === 'fx') {
    // The current portfolio uses quantity * price
    // for FX value. We therefore shock its USD-value
    // exchange-rate input, not an additional FX factor.

    percentageChange =
      scenario.fxShockPct / 100;

    method = 'Direct FX conversion-rate shock';
  }

  // -------------------------------------------------------
  // Cash
  // -------------------------------------------------------

  else if (type === 'cash') {
    // USD/base-currency cash is held stable.
    // Other currencies require an explicit FX model.

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
    const durationInfo = getBondDuration(
      position,
      analyzed.currentPrice,
      asOf
    );

    if (!durationInfo) {
      return {
        ...basicResult,
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
        warning:
          'Convexity must be non-negative'
      };
    }

    convexity = suppliedConvexity;

    // This first version applies both entered shocks
    // uniformly to each modeled individual bond.
    //
    // A later version will distinguish government
    // yields, credit spreads, and issuer-specific risk.

    const yieldChange =
      (
        scenario.rateShockBps +
        scenario.creditSpreadShockBps
      ) / 10000;

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
      convexity !== null
        ? 'Duration + supplied convexity'
        : 'Duration-only approximation';
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
      warning: 'Invalid scenario result'
    };
  }

  const projectedValue =
    currentValue *
    (1 + percentageChange);

  // Do not silently report a negative bond or
  // instrument value for an extreme linear scenario.

  if (
    !Number.isFinite(projectedValue) ||
    projectedValue < 0
  ) {
    return {
      ...basicResult,
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
    convexity
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

  const scenario = {
    equityShockPct: getShock(
      {
        ...DEFAULT_SCENARIO,
        ...inputScenario
      },
      'equityShockPct'
    ),

    etfShockPct: getShock(
      {
        ...DEFAULT_SCENARIO,
        ...inputScenario
      },
      'etfShockPct'
    ),

    fxShockPct: getShock(
      {
        ...DEFAULT_SCENARIO,
        ...inputScenario
      },
      'fxShockPct'
    ),

    rateShockBps: getShock(
      {
        ...DEFAULT_SCENARIO,
        ...inputScenario
      },
      'rateShockBps'
    ),

    creditSpreadShockBps: getShock(
      {
        ...DEFAULT_SCENARIO,
        ...inputScenario
      },
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

  // A whole-portfolio projected value is only available
  // when every position is modeled. Missing positions
  // must not be implicitly assumed to have zero P&L.

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
