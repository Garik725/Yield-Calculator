// pages/api/fx.js
// Live FX rates from EODHD.
// Two modes:
//   GET /api/fx                          → all major pairs + cross-rates (default majors)
//   GET /api/fx?pair=EURUSD              → single pair
//   GET /api/fx?pair=EURUSD,GBPUSD       → batch
//
// Response (single):
//   { pair, rate, change, changePercent, bid, ask, asOf }
//
// Response (default — all majors):
//   { pairs: [...], asOf, source }

let cache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

const G10 = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'SEK', 'NOK'];

// Default pairs to fetch when no specific pair requested
const DEFAULT_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF',
  'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP',
  'EURJPY', 'GBPJPY',
];

// Convert a pair like "EURUSD" to EODHD format "EURUSD.FOREX"
function toEodhdSymbol(pair) {
  return `${pair.toUpperCase()}.FOREX`;
}

// Parse a pair string into base and quote currencies
function parsePair(pair) {
  const p = pair.toUpperCase();
  if (p.length !== 6) return null;
  return { base: p.substring(0, 3), quote: p.substring(3, 6) };
}

async function fetchPair(pair, apiKey) {
  const cached = cache.get(pair);
  if (cached && (Date.now() - cached.time) < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  const symbol = toEodhdSymbol(pair);
  const url = `https://eodhd.com/api/real-time/${symbol}?api_token=${apiKey}&fmt=json`;
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`EODHD ${symbol} returned ${r.status}`);
  }
  const data = await r.json();

  if (data.code === 'NA' || data.close === 'NA' || data.close === undefined) {
    throw new Error(`Pair ${pair} not found`);
  }

  const result = {
    pair: pair.toUpperCase(),
    rate: parseFloat(data.close),
    previousClose: parseFloat(data.previousClose),
    change: parseFloat(data.change),
    changePercent: parseFloat(data.change_p),
    bid: parseFloat(data.close), // EODHD doesn't expose bid/ask on this endpoint
    ask: parseFloat(data.close),
    high: parseFloat(data.high),
    low: parseFloat(data.low),
    asOf: data.timestamp ? new Date(data.timestamp * 1000).toISOString() : null,
  };

  cache.set(pair, { data: result, time: Date.now() });
  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'EODHD_API_KEY not configured' });
  }

  const pairParam = req.query.pair;
  const pairs = pairParam
    ? pairParam.split(',').map(p => p.trim().toUpperCase()).filter(Boolean)
    : DEFAULT_PAIRS;

  if (pairs.length > 30) {
    return res.status(400).json({ error: 'Maximum 30 pairs per request' });
  }

  // Validate pair format
  for (const p of pairs) {
    if (!parsePair(p)) {
      return res.status(400).json({ error: `Invalid pair format: ${p} (expected 6-char like EURUSD)` });
    }
  }

  try {
    if (pairs.length === 1) {
      const data = await fetchPair(pairs[0], apiKey);
      return res.status(200).json(data);
    }
    const results = await Promise.all(
      pairs.map(p => fetchPair(p, apiKey).catch(err => ({ pair: p, error: err.message })))
    );
    const successful = results.filter(r => !r.error);
    const asOf = successful.length > 0 ? successful[0].asOf : null;
    return res.status(200).json({
      pairs: results,
      asOf,
      source: 'EODHD',
    });
  } catch (err) {
    console.error('FX API error:', err);
    return res.status(502).json({ error: 'Failed to fetch FX data', message: err.message });
  }
}

export { G10, DEFAULT_PAIRS };
