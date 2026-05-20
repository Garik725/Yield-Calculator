// lib/priceData.js
//
// Provider-agnostic price-history fetcher. The public surface is a single
// function `fetchPriceData(tickers, fromDate, toDate, options)` that returns
// the shape riskMath.js consumes. Internally it delegates to a provider
// adapter — currently EODHD, but new providers can be added by implementing
// the PriceProvider interface below.
//
// Architectural rule: riskMath.js does not import from this file, and this
// file does not import from riskMath.js. They are designed to compose in a
// caller (an API route or a React component), not couple to each other.

// ─────────────────────────────────────────────────────────────────────────────
// PriceProvider interface (documented as a JSDoc typedef)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} PriceProvider
 * @property {string} name - Human-readable name (e.g. "EODHD")
 * @property {(ticker: string, from: string, to: string) => Promise<ProviderResult>} fetchOne
 */
/**
 * @typedef {Object} ProviderResult
 * @property {Array<{date: string, price: number}>} [prices] - Adjusted-close series on success
 * @property {string} [error] - Human-readable error if prices is absent
 * @property {'invalid_ticker'|'rate_limit'|'auth'|'network'|'no_data'|'other'} [errorCode]
 */

// ─────────────────────────────────────────────────────────────────────────────
// EODHD adapter
// ─────────────────────────────────────────────────────────────────────────────

const EODHD_BASE = 'https://eodhd.com/api/eod';

/**
 * Create an EODHD provider with a given API token.
 * The token never goes client-side. This adapter is intended to run inside
 * a Next.js API route (server-side), with the token read from process.env.
 *
 * Tickers must be in SYMBOL.EXCHANGE form per EODHD's convention:
 *   - 'AAPL.US', 'TLT.US', 'SPY.US' for US-listed
 *   - 'VOD.LSE', 'BMW.XETRA' for international
 * If a bare 'AAPL' is passed in, this adapter defaults the exchange to '.US'.
 */
export const createEodhdProvider = (apiToken) => {
  if (!apiToken) {
    throw new Error('createEodhdProvider: missing API token');
  }

  /**
   * @param {string} ticker
   * @param {string} from - YYYY-MM-DD
   * @param {string} to - YYYY-MM-DD
   * @returns {Promise<ProviderResult>}
   */
  const fetchOne = async (ticker, from, to) => {
    const symbol = ticker.includes('.') ? ticker : `${ticker}.US`;
    const url = `${EODHD_BASE}/${encodeURIComponent(symbol)}?from=${from}&to=${to}&api_token=${apiToken}&fmt=json`;

    let response;
    try {
      response = await fetch(url, { method: 'GET' });
    } catch (e) {
      return { error: `Network error fetching ${symbol}: ${e.message}`, errorCode: 'network' };
    }

    if (response.status === 401 || response.status === 403) {
      return { error: 'EODHD authentication failed — check API token', errorCode: 'auth' };
    }
    if (response.status === 429) {
      return { error: 'EODHD rate limit hit — try again in a moment', errorCode: 'rate_limit' };
    }
    if (response.status === 404) {
      return { error: `Ticker "${symbol}" not found on EODHD`, errorCode: 'invalid_ticker' };
    }
    if (!response.ok) {
      return { error: `EODHD returned HTTP ${response.status} for ${symbol}`, errorCode: 'other' };
    }

    let payload;
    try {
      payload = await response.json();
    } catch (e) {
      return { error: `EODHD returned non-JSON for ${symbol}`, errorCode: 'other' };
    }

    // EODHD sometimes returns an empty array for valid tickers with no data
    // in the requested range, and sometimes returns an error message in a
    // single-element object. Handle both.
    if (!Array.isArray(payload)) {
      return { error: `EODHD returned unexpected shape for ${symbol}`, errorCode: 'other' };
    }
    if (payload.length === 0) {
      return { error: `No price data returned for ${symbol} in range ${from} to ${to}`, errorCode: 'no_data' };
    }

    // Map to our internal shape. Use ADJUSTED close — raw close is wrong
    // across splits and dividends. If adjusted_close is missing or zero
    // (which can happen for some non-equity tickers), fall back to close
    // with a warning logged by the caller.
    const prices = [];
    let missingAdjusted = 0;
    for (const row of payload) {
      const date = row.date;
      let price = row.adjusted_close;
      if (typeof price !== 'number' || price <= 0) {
        missingAdjusted++;
        price = row.close;
      }
      if (typeof date !== 'string' || typeof price !== 'number' || price <= 0) continue;
      prices.push({ date, price });
    }

    if (prices.length === 0) {
      return { error: `${symbol}: all rows had invalid prices`, errorCode: 'no_data' };
    }

    // Sort ascending by date (EODHD returns ascending, but don't assume).
    prices.sort((a, b) => a.date < b.date ? -1 : 1);

    return {
      prices,
      ...(missingAdjusted > 0 ? { warning: `${symbol}: ${missingAdjusted} rows fell back to unadjusted close` } : {}),
    };
  };

  return { name: 'EODHD', fetchOne };
};

// ─────────────────────────────────────────────────────────────────────────────
// Public entry: fetch multiple tickers in parallel and assemble the shape
// that riskMath.analyzeRisk() expects.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string[]} tickers
 * @param {string} fromDate - YYYY-MM-DD inclusive
 * @param {string} toDate - YYYY-MM-DD inclusive
 * @param {{ provider: PriceProvider, concurrency?: number }} options
 * @returns {Promise<{
 *   priceData?: Object<string, Array<{date:string, price:number}>>,
 *   errors?: Object<string, string>,
 *   warnings?: Object<string, string>,
 *   provider: string
 * }>}
 *
 * Always returns an object — never throws. Caller inspects `errors` to
 * see which tickers failed and `priceData` to see which succeeded. This
 * is deliberate: a partial result (3 of 4 tickers fetched) is more useful
 * than throwing on the first failure.
 */
export const fetchPriceData = async (tickers, fromDate, toDate, options) => {
  if (!options || !options.provider) {
    throw new Error('fetchPriceData: options.provider is required');
  }
  const { provider } = options;

  // Validate inputs up front to fail fast on obviously bad calls.
  if (!Array.isArray(tickers) || tickers.length < 2) {
    return { errors: { _input: `Need at least 2 tickers, got ${tickers?.length || 0}` }, provider: provider.name };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    return { errors: { _input: `Dates must be YYYY-MM-DD; got from="${fromDate}" to="${toDate}"` }, provider: provider.name };
  }
  if (fromDate >= toDate) {
    return { errors: { _input: `fromDate (${fromDate}) must be before toDate (${toDate})` }, provider: provider.name };
  }

  // De-duplicate tickers (case-insensitive); preserve original casing in output.
  const seen = new Map();
  for (const t of tickers) {
    const key = t.trim().toUpperCase();
    if (!seen.has(key)) seen.set(key, t.trim());
  }
  const uniqueTickers = [...seen.values()];

  // Fetch all tickers in parallel. EODHD doesn't have a strict per-second
  // limit on the EOD endpoint at sensible volumes; for high-volume use we
  // could batch here, but for a UI request of 2-10 tickers parallel is fine.
  const results = await Promise.all(
    uniqueTickers.map(async (t) => {
      const r = await provider.fetchOne(t, fromDate, toDate);
      return { ticker: t, ...r };
    })
  );

  const priceData = {};
  const errors = {};
  const warnings = {};
  for (const r of results) {
    if (r.prices) priceData[r.ticker] = r.prices;
    if (r.error) errors[r.ticker] = r.error;
    if (r.warning) warnings[r.ticker] = r.warning;
  }

  return {
    ...(Object.keys(priceData).length > 0 ? { priceData } : {}),
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
    ...(Object.keys(warnings).length > 0 ? { warnings } : {}),
    provider: provider.name,
  };
};
