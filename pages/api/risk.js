// pages/api/risk.js
//
// Server-side API route. Accepts a list of tickers + date range, fetches
// price history via EODHD, runs the risk math, returns the report.
//
// Keeps the EODHD API token server-side only — never exposed to the client.
//
// Expected env var: EODHD_API_TOKEN
//
// Request shape:
//   POST /api/risk
//   { tickers: ['SPY', 'TLT', 'GLD'], from: '2024-09-01', to: '2024-12-01' }
//
// Response shape (success):
//   {
//     ok: true,
//     report: {           // shape from analyzeRisk()
//       tickers, alignedDates, returnDates, coverage, dropped,
//       volatility, correlation, annualizationFactor
//     },
//     warnings?: { [ticker]: string },  // partial successes, e.g. unadjusted fallback
//   }
// Response shape (failure):
//   {
//     ok: false,
//     errors: { [ticker]: string },     // per-ticker fetch failures
//     // OR
//     error: string,                    // top-level failure (auth, math)
//   }

import { fetchPriceData, createEodhdProvider } from '../../lib/priceData';
import { analyzeRisk } from '../../lib/riskMath';

export default async function handler(req, res) {
  // Restrict to POST so query strings can't accidentally trigger fetches
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed; use POST' });
  }

  const token = process.env.EODHD_API_TOKEN;
  if (!token) {
    // Don't leak the missing config to the client beyond a generic message.
    console.error('[/api/risk] EODHD_API_TOKEN is not set in environment');
    return res.status(500).json({ ok: false, error: 'Server is not configured for price data fetching' });
  }

  const { tickers, from, to } = req.body || {};
  if (!Array.isArray(tickers) || tickers.length < 2) {
    return res.status(400).json({ ok: false, error: 'Body must include tickers[] with at least 2 entries' });
  }
  if (tickers.length > 20) {
    return res.status(400).json({ ok: false, error: 'Too many tickers (max 20 per request)' });
  }
  if (typeof from !== 'string' || typeof to !== 'string') {
    return res.status(400).json({ ok: false, error: 'Body must include from and to date strings (YYYY-MM-DD)' });
  }

  // Fetch.
  const provider = createEodhdProvider(token);
  const fetchResult = await fetchPriceData(tickers, from, to, { provider });

  // If we couldn't get data for at least 2 tickers, we can't compute correlation.
  const successCount = fetchResult.priceData ? Object.keys(fetchResult.priceData).length : 0;
  if (successCount < 2) {
    return res.status(400).json({
      ok: false,
      error: 'Could not fetch enough price data to compute risk',
      errors: fetchResult.errors || {},
    });
  }

  // Run the math.
  const report = analyzeRisk(fetchResult.priceData);
  if (!report) {
    // analyzeRisk console.warns its own reason; surface a generic message here.
    return res.status(400).json({
      ok: false,
      error: 'Price data was insufficient for risk calculation (likely too few aligned dates)',
      errors: fetchResult.errors || {},
    });
  }

  return res.status(200).json({
    ok: true,
    report,
    ...(fetchResult.errors ? { errors: fetchResult.errors } : {}),       // partial — some tickers failed
    ...(fetchResult.warnings ? { warnings: fetchResult.warnings } : {}), // e.g. unadjusted fallback
  });
}
