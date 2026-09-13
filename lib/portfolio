// lib/portfolio/valuation.js
//
// Portfolio valuation engine for YieldCalculator.tech.
//
// Works with the CURRENT portfolio shape:
//   { id, tkr, type, qty, price, chg }
//
// Also supports the richer model we will migrate toward:
//
// {
//   id,
//   instrumentId,
//   symbol,
//   name,
//   assetType,
//   quantity,
//   purchasePrice,
//   currentPrice,
//   previousClose,
//   purchaseDate,
//   currency,
//   fxRateToBase,
//   dirtyPrice,
//   accruedInterestPer100,
//   metadata
// }
//
// Financial conventions:
// - Stock / ETF MV = shares × price
// - Bond clean MV = face × clean price / 100
// - Bond economic MV should use dirty price when available
// - FX conversion uses fxRateToBase
//
// No React, API, localStorage, or UI logic belongs here.

export const DEFAULT_BASE_CURRENCY = 'USD';

export const SUPPORTED_ASSET_TYPES = [
  'stock',
  'etf',
  'bond',
  'fx',
  'cash'
];

const finiteNumber = (value, fallback = null) => {
  const n =
    typeof value === 'number'
      ? value
      : parseFloat(value);

  return Number.isFinite(n)
    ? n
    : fallback;
};


export const normalizeAssetType = (position = {}) => {
  const raw = String(
    position.assetType ||
    position.type ||
    ''
  )
    .trim()
    .toLowerCase();

  if (raw === 'equity') return 'stock';
  if (raw === 'bond_etf') return 'etf';
  if (raw === 'fx / cash') return 'fx';

  return SUPPORTED_ASSET_TYPES.includes(raw)
    ? raw
    : raw || 'unknown';
};


export const getSymbol = (position = {}) =>
  position.symbol ||
  position.tkr ||
  position.instrumentId ||
  '';


export const getQuantity = (position = {}) => {
  const q = finiteNumber(
    position.quantity ??
    position.qty,
    0
  );

  return q > 0 ? q : 0;
};


export const getCurrentPrice = (position = {}) => {
  const p = finiteNumber(
    position.currentPrice ??
    position.price,
    null
  );

  return p !== null && p > 0
    ? p
    : null;
};


export const getPurchasePrice = (position = {}) => {
  const p = finiteNumber(
    position.purchasePrice,
    null
  );

  return p !== null && p > 0
    ? p
    : null;
};


export const getPreviousClose = (position = {}) => {
  const explicit = finiteNumber(
    position.previousClose,
    null
  );

  if (explicit !== null && explicit > 0) {
    return explicit;
  }

  // Backward compatibility with current portfolio:
  //
  // previous close =
  // current price - absolute daily change
  const current = getCurrentPrice(position);
  const chg = finiteNumber(
    position.chg,
    null
  );

  if (
    current !== null &&
    chg !== null
  ) {
    const prev = current - chg;

    return prev > 0
      ? prev
      : null;
  }

  return null;
};


export const getCurrency = (
  position = {},
  baseCurrency = DEFAULT_BASE_CURRENCY
) =>
  String(
    position.currency ||
    position.ccy ||
    baseCurrency
  ).toUpperCase();


export const getFxRateToBase = (
  position = {},
  baseCurrency = DEFAULT_BASE_CURRENCY
) => {
  const positionCurrency =
    getCurrency(
      position,
      baseCurrency
    );

  if (
    positionCurrency ===
    String(baseCurrency).toUpperCase()
  ) {
    return 1;
  }

  const rate = finiteNumber(
    position.fxRateToBase,
    null
  );

  return rate !== null && rate > 0
    ? rate
    : null;
};


/**
 * Bond quoted valuation price per 100 face.
 *
 * Preference:
 *
 * 1. Explicit dirtyPrice
 * 2. clean price + accruedInterestPer100
 * 3. clean price
 *
 * Using dirty value is the economically correct
 * portfolio valuation method.
 *
 * Until bondMath is connected directly to Portfolio,
 * the function safely falls back to clean price.
 */
export const getBondValuationPrice = (
  position = {},
  {
    useDirtyBondValue = true
  } = {}
) => {
  const clean =
    getCurrentPrice(position);

  if (clean === null) {
    return null;
  }

  if (!useDirtyBondValue) {
    return clean;
  }

  const dirty = finiteNumber(
    position.dirtyPrice,
    null
  );

  if (
    dirty !== null &&
    dirty > 0
  ) {
    return dirty;
  }

  const accrued = finiteNumber(
    position.accruedInterestPer100,
    null
  );

  if (accrued !== null) {
    return clean + accrued;
  }

  return clean;
};


/**
 * Calculate market value
 * in the instrument's local currency.
 */
export const calculateLocalMarketValue = (
  position,
  options = {}
) => {
  const assetType =
    normalizeAssetType(position);

  const quantity =
    getQuantity(position);

  if (quantity <= 0) {
    return 0;
  }

  if (assetType === 'bond') {
    const px =
      getBondValuationPrice(
        position,
        options
      );

    return px === null
      ? 0
      : quantity * px / 100;
  }

  // Current FX implementation remains
  // quantity × price for compatibility.
  const px =
    getCurrentPrice(position);

  return px === null
    ? 0
    : quantity * px;
};


/**
 * Previous market value.
 *
 * Primarily used for today's P&L.
 */
export const calculatePreviousLocalMarketValue = (
  position,
  options = {}
) => {
  const assetType =
    normalizeAssetType(position);

  const quantity =
    getQuantity(position);

  const prev =
    getPreviousClose(position);

  if (
    quantity <= 0 ||
    prev === null
  ) {
    return null;
  }

  if (assetType === 'bond') {
    // Temporary bond daily P&L method.
    //
    // Later this should become:
    //
    // clean price move
    // + accrued carry
    // + coupon cashflows
    //
    // once bond history is integrated.
    return quantity * prev / 100;
  }

  return quantity * prev;
};


/**
 * Cost basis in local currency.
 */
export const calculateLocalCostBasis = (
  position
) => {
  const assetType =
    normalizeAssetType(position);

  const quantity =
    getQuantity(position);

  const purchasePrice =
    getPurchasePrice(position);

  if (
    quantity <= 0 ||
    purchasePrice === null
  ) {
    return null;
  }

  if (assetType === 'bond') {
    return (
      quantity *
      purchasePrice /
      100
    );
  }

  return quantity * purchasePrice;
};


/**
 * Convert local amount
 * into portfolio base currency.
 */
export const convertToBase = (
  amount,
  position,
  baseCurrency = DEFAULT_BASE_CURRENCY
) => {
  if (!Number.isFinite(amount)) {
    return null;
  }

  const rate =
    getFxRateToBase(
      position,
      baseCurrency
    );

  if (rate === null) {
    return null;
  }

  return amount * rate;
};


/**
 * Analyze one portfolio position.
 *
 * Bond-specific analytics such as:
 *
 * YTM
 * duration
 * DV01
 * convexity
 *
 * belong to bondMath.
 *
 * They can be passed into this engine
 * as enriched position fields.
 */
export const analyzePositionValuation = (
  position,
  {
    baseCurrency =
      DEFAULT_BASE_CURRENCY,

    useDirtyBondValue = true
  } = {}
) => {
  const assetType =
    normalizeAssetType(position);

  const symbol =
    getSymbol(position);

  const quantity =
    getQuantity(position);

  const currentPrice =
    getCurrentPrice(position);

  const previousClose =
    getPreviousClose(position);

  const purchasePrice =
    getPurchasePrice(position);

  const currency =
    getCurrency(
      position,
      baseCurrency
    );

  const fxRateToBase =
    getFxRateToBase(
      position,
      baseCurrency
    );


  const localMarketValue =
    calculateLocalMarketValue(
      position,
      {
        useDirtyBondValue
      }
    );


  const previousLocalMarketValue =
    calculatePreviousLocalMarketValue(
      position,
      {
        useDirtyBondValue
      }
    );


  const localCostBasis =
    calculateLocalCostBasis(
      position
    );


  const marketValueBase =
    convertToBase(
      localMarketValue,
      position,
      baseCurrency
    );


  const previousMarketValueBase =
    previousLocalMarketValue === null
      ? null
      : convertToBase(
          previousLocalMarketValue,
          position,
          baseCurrency
        );


  const costBasisBase =
    localCostBasis === null
      ? null
      : convertToBase(
          localCostBasis,
          position,
          baseCurrency
        );


  const dayPnLBase =
    marketValueBase !== null &&
    previousMarketValueBase !== null
      ? marketValueBase -
        previousMarketValueBase
      : null;


  const dayReturn =
    previousMarketValueBase !== null &&
    previousMarketValueBase > 0
      ? dayPnLBase /
        previousMarketValueBase
      : null;


  const unrealizedPnLBase =
    marketValueBase !== null &&
    costBasisBase !== null
      ? marketValueBase -
        costBasisBase
      : null;


  const unrealizedReturn =
    costBasisBase !== null &&
    costBasisBase > 0
      ? unrealizedPnLBase /
        costBasisBase
      : null;


  return {
    id:
      position.id ||
      null,

    instrumentId:
      position.instrumentId ||
      null,

    symbol,

    name:
      position.name ||
      symbol,

    assetType,

    quantity,
    currentPrice,
    previousClose,
    purchasePrice,

    currency,

    baseCurrency:
      String(
        baseCurrency
      ).toUpperCase(),

    fxRateToBase,

    localMarketValue,
    marketValueBase,

    previousLocalMarketValue,
    previousMarketValueBase,

    localCostBasis,
    costBasisBase,

    dayPnLBase,
    dayReturn,

    unrealizedPnLBase,
    unrealizedReturn,

    fixedIncome:
      assetType === 'bond'
        ? {
            cleanPrice:
              currentPrice,

            dirtyPrice:
              finiteNumber(
                position.dirtyPrice,
                null
              ),

            accruedInterestPer100:
              finiteNumber(
                position.accruedInterestPer100,
                null
              ),

            ytm:
              finiteNumber(
                position.ytm,
                null
              ),

            modifiedDuration:
              finiteNumber(
                position.modifiedDuration,
                null
              ),

            dv01:
              finiteNumber(
                position.dv01,
                null
              ),

            convexity:
              finiteNumber(
                position.convexity,
                null
              )
          }
        : null,

    raw:
      position
  };
};


/**
 * Main portfolio valuation function.
 */
export const analyzePortfolioValuation = (
  positions = [],
  {
    baseCurrency =
      DEFAULT_BASE_CURRENCY,

    useDirtyBondValue = true
  } = {}
) => {
  if (!Array.isArray(positions)) {
    throw new Error(
      'positions must be an array'
    );
  }


  const analyzed =
    positions.map(
      position =>
        analyzePositionValuation(
          position,
          {
            baseCurrency,
            useDirtyBondValue
          }
        )
    );


  const validMarketValues =
    analyzed.filter(
      p =>
        Number.isFinite(
          p.marketValueBase
        )
    );


  const totalValue =
    validMarketValues.reduce(
      (sum, p) =>
        sum +
        p.marketValueBase,
      0
    );


  const positionsWithWeights =
    analyzed.map(p => ({
      ...p,

      weight:
        Number.isFinite(
          p.marketValueBase
        ) &&
        totalValue > 0
          ? p.marketValueBase /
            totalValue
          : null
    }));


  const previousValues =
    positionsWithWeights.filter(
      p =>
        Number.isFinite(
          p.previousMarketValueBase
        )
    );


  const totalPreviousValue =
    previousValues.length ===
    positionsWithWeights.length

      ? previousValues.reduce(
          (sum, p) =>
            sum +
            p.previousMarketValueBase,
          0
        )

      : null;


  const dayPnL =
    totalPreviousValue !== null
      ? totalValue -
        totalPreviousValue
      : null;


  const dayReturn =
    totalPreviousValue !== null &&
    totalPreviousValue > 0
      ? dayPnL /
        totalPreviousValue
      : null;


  const positionsWithCostBasis =
    positionsWithWeights.filter(
      p =>
        Number.isFinite(
          p.costBasisBase
        )
    );


  const hasCompleteCostBasis =
    positionsWithCostBasis.length ===
      positionsWithWeights.length &&
    positionsWithWeights.length > 0;


  const totalCostBasis =
    hasCompleteCostBasis
      ? positionsWithCostBasis.reduce(
          (sum, p) =>
            sum +
            p.costBasisBase,
          0
        )
      : null;


  const unrealizedPnL =
    totalCostBasis !== null
      ? totalValue -
        totalCostBasis
      : null;


  const unrealizedReturn =
    totalCostBasis !== null &&
    totalCostBasis > 0
      ? unrealizedPnL /
        totalCostBasis
      : null;


  const byAssetClass = {};
  const byCurrency = {};


  for (
    const p
    of positionsWithWeights
  ) {
    if (
      !Number.isFinite(
        p.marketValueBase
      )
    ) {
      continue;
    }


    byAssetClass[p.assetType] =
      (
        byAssetClass[
          p.assetType
        ] || 0
      ) +
      p.marketValueBase;


    byCurrency[p.currency] =
      (
        byCurrency[
          p.currency
        ] || 0
      ) +
      p.marketValueBase;
  }


  const allocations = {

    byAssetClass:
      Object.fromEntries(
        Object.entries(
          byAssetClass
        ).map(
          ([key, value]) => [
            key,
            {
              value,

              weight:
                totalValue > 0
                  ? value /
                    totalValue
                  : 0
            }
          ]
        )
      ),


    byCurrency:
      Object.fromEntries(
        Object.entries(
          byCurrency
        ).map(
          ([key, value]) => [
            key,
            {
              value,

              weight:
                totalValue > 0
                  ? value /
                    totalValue
                  : 0
            }
          ]
        )
      )
  };


  const sortedByWeight =
    [...positionsWithWeights]

      .filter(
        p =>
          Number.isFinite(
            p.weight
          )
      )

      .sort(
        (a, b) =>
          b.weight -
          a.weight
      );


  const concentration = {

    largestHolding:
      sortedByWeight[0]
        ? {
            symbol:
              sortedByWeight[0]
                .symbol,

            weight:
              sortedByWeight[0]
                .weight,

            value:
              sortedByWeight[0]
                .marketValueBase
          }
        : null,


    top3Weight:
      sortedByWeight
        .slice(0, 3)
        .reduce(
          (sum, p) =>
            sum +
            p.weight,
          0
        ),


    hhi:
      sortedByWeight.reduce(
        (sum, p) =>
          sum +
          p.weight *
          p.weight,
        0
      )
  };


  const warnings = [];


  for (
    const p
    of positionsWithWeights
  ) {

    if (
      p.marketValueBase === null
    ) {

      warnings.push(
        `${
          p.symbol ||
          'Position'
        }: missing FX rate from ${
          p.currency
        } to ${
          String(
            baseCurrency
          ).toUpperCase()
        }`
      );

    }


    if (
      p.assetType === 'bond' &&
      p.fixedIncome?.dirtyPrice === null &&
      p.fixedIncome?.accruedInterestPer100 === null
    ) {

      warnings.push(
        `${
          p.symbol ||
          'Bond'
        }: bond value uses clean price because accrued interest / dirty price is not yet available`
      );

    }

  }


  return {

    baseCurrency:
      String(
        baseCurrency
      ).toUpperCase(),


    valuation: {

      totalValue,

      totalPreviousValue,

      dayPnL,

      dayReturn,

      totalCostBasis,

      unrealizedPnL,

      unrealizedReturn
    },


    allocations,

    concentration,

    positions:
      positionsWithWeights,


    dataQuality: {

      positionCount:
        positionsWithWeights.length,

      completeCostBasis:
        hasCompleteCostBasis,

      completePreviousClose:
        totalPreviousValue !== null,

      warnings
    }
  };
};


// -------------------------------------------------------
// BACKWARD-COMPATIBILITY HELPERS
// -------------------------------------------------------
//
// These allow us to migrate pages/portfolio.js
// without changing its current visible behaviour.
//
// Current code:
//
// const calcMV = ...
// const calcMVPrev = ...
//
// can be replaced with imports of these functions.


export const calcMarketValue = (
  position
) =>
  calculateLocalMarketValue(
    position,
    {
      useDirtyBondValue: false
    }
  );


export const calcPreviousMarketValue = (
  position
) =>
  calculatePreviousLocalMarketValue(
    position,
    {
      useDirtyBondValue: false
    }
  ) ?? 0;
