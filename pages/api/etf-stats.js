// pages/api/etf-stats.js
// Returns ETF fundamentals (yield, duration, expense ratio, YTD return).
// Used by /curve page's "Bond ETFs" tab.
//
// Usage: GET /api/etf-stats?ticker=TLT
// Or batch: GET /api/etf-stats?ticker=TLT,IEF,SHY,LQD,HYG,AGG
//
// Response (single):
//   { ticker, name, price, change, ytd, dur, yld, er, asOf }

let cache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — fundamentals change slowly

async function fetchETFStats(ticker, apiKey) {
  const cached = cache.get(ticker);
  if (cached && (Date.now() - cached.time) < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  const eodhdTicker = ticker.toUpperCase().includes('.')
    ? ticker.toUpperCase()
    : `${ticker.toUpperCase()}.US`;

  // Fetch fundamentals AND real-time price in parallel
  const fundamentalsUrl = `https://eodhd.com/api/fundamentals/${eodhdTicker}?api_token=${apiKey}`;
  const realtimeUrl = `https://eodhd.com/api/real-time/${eodhdTicker}?api_token=${apiKey}&fmt=json`;

  const [fRes, rRes] = await Promise.all([
    fetch(fundamentalsUrl),
    fetch(realtimeUrl),
  ]);

  if (!fRes.ok || !rRes.ok) {
    throw new Error(`EODHD returned ${fRes.status}/${rRes.status} for ${eodhdTicker}`);
  }

  const fundamentals = await fRes.json();
  const realtime = await rRes.json();

  const general = fundamentals.General || {};
  const etfData = fundamentals.ETF_Data || {};
  const techStats = fundamentals.Technicals || {};

  // YTD return — compute from current price vs. price at start of year
  const ytdReturn = parseFloat(etfData.Yield_YTD || techStats.YTD_Performance) || 0;

  const result = {
    ticker: ticker.toUpperCase(),
    name: general.Name || ticker.toUpperCase(),
    price: parseFloat(realtime.close),
    change: parseFloat(realtime.change),
    changePercent: parseFloat(realtime.change_p),
    ytd: ytdReturn,
    dur: parseFloat(etfData.Modified_Duration) || parseFloat(etfData.Effective_Duration) || null,
    yld: parseFloat(etfData.Yield) || parseFloat(etfData.Dividend_Yield) * 100 || null,
    er: parseFloat(etfData.NetExpenseRatio) * 100 || parseFloat(etfData.TotalAssets_ExpenseRatio) || null,
    asOf: realtime.timestamp ? new Date(realtime.timestamp * 1000).toISOString() : null,
    cached: false,
  };

  cache.set(ticker, { data: result, time: Date.now() });
  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tickerParam = req.query.ticker;
  if (!tickerParam) {
    return res.status(400).json({ error: 'Missing ticker parameter' });
  }

  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'EODHD_API_KEY not configured' });
  }

  const tickers = tickerParam.split(',').map(t => t.trim()).filter(Boolean);
  if (tickers.length > 20) {
    return res.status(400).json({ error: 'Maximum 20 tickers per request' });
  }

  try {
    if (tickers.length === 1) {
      const stats = await fetchETFStats(tickers[0], apiKey);
      return res.status(200).json(stats);
    } else {
      const stats = await Promise.all(
        tickers.map(t => fetchETFStats(t, apiKey).catch(err => ({ ticker: t, error: err.message })))
      );
      return res.status(200).json({ etfs: stats });
    }
  } catch (err) {
    console.error('ETF stats API error:', err);
    return res.status(502).json({
      error: 'Failed to fetch ETF stats',
      message: err.message,
    });
  }
}
