// pages/api/curve/us.js
// Returns live US Treasury yield curve data from EODHD.
// Cached for 15 minutes — Treasury yields don't move that fast.
//
// Response shape:
// {
//   today:  { '1M': 5.32, '3M': 5.18, ..., '30Y': 4.52 },
//   week:   { ... yields from 7 trading days ago ... },
//   year:   { ... yields from ~252 trading days ago ... },
//   asOf:   '2026-05-05',
//   source: 'EODHD',
// }

// EODHD ticker map for US Treasury constant-maturity yields (FRED-sourced).
const EODHD_TENOR_MAP = {
  '1M':  'DGS1MO.FRED',
  '3M':  'DGS3MO.FRED',
  '6M':  'DGS6MO.FRED',
  '1Y':  'DGS1.FRED',
  '2Y':  'DGS2.FRED',
  '3Y':  'DGS3.FRED',
  '5Y':  'DGS5.FRED',
  '7Y':  'DGS7.FRED',
  '10Y': 'DGS10.FRED',
  '20Y': 'DGS20.FRED',
  '30Y': 'DGS30.FRED',
};

const TENOR_ORDER = ['1M','3M','6M','1Y','2Y','3Y','5Y','7Y','10Y','20Y','30Y'];

// Simple in-memory cache (per Vercel serverless instance)
let cache = null;
let cacheTime = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export default async function handler(req, res) {
  // CORS — same origin only by default; permit GET only
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Serve from cache if fresh
  const now = Date.now();
  if (cache && (now - cacheTime) < CACHE_TTL_MS) {
    return res.status(200).json({ ...cache, cached: true });
  }

  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'EODHD_API_KEY not configured' });
  }

  try {
    // Fetch each tenor's last ~260 trading days of history in parallel.
    // We need today + 1-week-ago + 1-year-ago, so 260 days covers all of them.
    const fetches = TENOR_ORDER.map(async (tenor) => {
      const ticker = EODHD_TENOR_MAP[tenor];
      const url = `https://eodhd.com/api/eod/${ticker}?api_token=${apiKey}&fmt=json&period=d&order=d`;
      const r = await fetch(url);
      if (!r.ok) {
        throw new Error(`EODHD ${ticker} returned ${r.status}`);
      }
      const data = await r.json();
      // EODHD returns array sorted by date (descending when order=d).
      // Each item: { date, open, high, low, close, adjusted_close, volume }
      return { tenor, data };
    });

    const results = await Promise.all(fetches);

    // Build today / week / year curves from the historical arrays
    const today = {};
    const week = {};
    const year = {};
    let asOfDate = null;

    for (const { tenor, data } of results) {
      if (!Array.isArray(data) || data.length === 0) {
        // Skip missing tenors gracefully
        continue;
      }

      // Today = most recent close
      today[tenor] = parseFloat(data[0].close);
      if (!asOfDate) asOfDate = data[0].date;

      // 1 week ago = ~5 trading days back
      const weekIdx = Math.min(5, data.length - 1);
      week[tenor] = parseFloat(data[weekIdx].close);

      // 1 year ago = ~252 trading days back
      const yearIdx = Math.min(252, data.length - 1);
      year[tenor] = parseFloat(data[yearIdx].close);
    }

    const response = {
      today,
      week,
      year,
      asOf: asOfDate,
      source: 'EODHD',
      cached: false,
    };

    // Cache the result
    cache = response;
    cacheTime = now;

    return res.status(200).json(response);

  } catch (err) {
    console.error('Curve API error:', err);
    return res.status(502).json({
      error: 'Failed to fetch curve data',
      message: err.message,
    });
  }
}
