// pages/api/quote.js
// Universal ticker lookup for stocks, ETFs, indices.
// Supports comma-separated tickers for batch fetching.
// 
// Usage:
//   GET /api/quote?ticker=AAPL          → single ticker
//   GET /api/quote?ticker=AAPL,MSFT,TLT → batch (up to 20 at once)
//
// Response shape (single):
//   { ticker, name, price, change, changePercent, currency, exchange, asOf, ytd, dur, yld, er }
//
// Response shape (batch):
//   { quotes: [ {...}, {...} ] }
//
// Caching: 60-second TTL. Stocks DO move; we don't want to lie about prices being live.

let cache = new Map(); // ticker -> { data, time }
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// Resolve a user-typed ticker to EODHD format.
// EODHD wants TICKER.EXCHANGE (e.g., AAPL.US, BMW.XETRA).
// If the user just types "AAPL" with no dot, we default to .US.
function resolveTicker(input) {
  const t = input.trim().toUpperCase();
  if (t.includes('.')) return t; // user provided exchange
  return `${t}.US`; // default to US market
}

async function fetchQuote(ticker, apiKey) {
  const cached = cache.get(ticker);
  if (cached && (Date.now() - cached.time) < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  const eodhdTicker = resolveTicker(ticker);
  const url = `https://eodhd.com/api/real-time/${eodhdTicker}?api_token=${apiKey}&fmt=json`;
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`EODHD ${eodhdTicker} returned ${r.status}`);
  }

  const data = await r.json();

  // EODHD real-time response shape:
  // { code, timestamp, gmtoffset, open, high, low, close, volume, previousClose, change, change_p }
  if (data.code === 'NA' || data.close === 'NA') {
    throw new Error(`Ticker ${ticker} not found`);
  }

  const result = {
    ticker: ticker.toUpperCase(),
    eodhdTicker,
    price: parseFloat(data.close),
    previousClose: parseFloat(data.previousClose),
    change: parseFloat(data.change),
    changePercent: parseFloat(data.change_p),
    open: parseFloat(data.open),
    high: parseFloat(data.high),
    low: parseFloat(data.low),
    volume: parseInt(data.volume) || 0,
    asOf: data.timestamp ? new Date(data.timestamp * 1000).toISOString() : null,
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

  // Batch mode if comma-separated
  const tickers = tickerParam.split(',').map(t => t.trim()).filter(Boolean);
  if (tickers.length > 20) {
    return res.status(400).json({ error: 'Maximum 20 tickers per request' });
  }

  try {
    if (tickers.length === 1) {
      const quote = await fetchQuote(tickers[0], apiKey);
      return res.status(200).json(quote);
    } else {
      const quotes = await Promise.all(
        tickers.map(t => fetchQuote(t, apiKey).catch(err => ({ ticker: t, error: err.message })))
      );
      return res.status(200).json({ quotes });
    }
  } catch (err) {
    console.error('Quote API error:', err);
    return res.status(502).json({
      error: 'Failed to fetch quote',
      message: err.message,
    });
  }
}
