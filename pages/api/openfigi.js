// pages/api/openfigi.js
// Validates an ISIN or CUSIP via Bloomberg's OpenFIGI API (free, no auth required).
//
// Usage:
//   GET /api/openfigi?id=US037833DV97          → validates ISIN
//   GET /api/openfigi?id=037833DV9             → validates CUSIP
//
// Response (success):
//   { id, idType, valid: true, issuer, name, securityType, marketSector, ticker, exchCode }
//
// Response (not found):
//   { id, idType, valid: false }
//
// Response (invalid format):
//   { error: 'Invalid ID format' }

// Detect whether a string looks like an ISIN (12 chars) or CUSIP (9 chars)
function detectIdType(id) {
  const cleaned = id.trim().toUpperCase();
  if (cleaned.length === 12 && /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(cleaned)) {
    return { type: 'ID_ISIN', cleaned };
  }
  if (cleaned.length === 9 && /^[A-Z0-9]{9}$/.test(cleaned)) {
    return { type: 'ID_CUSIP', cleaned };
  }
  return null;
}

// Simple in-memory cache — OpenFIGI metadata rarely changes
const cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  const detected = detectIdType(id);
  if (!detected) {
    return res.status(400).json({
      error: 'Invalid ID format',
      message: 'Expected 12-char ISIN (e.g., US037833DV97) or 9-char CUSIP (e.g., 037833DV9)',
    });
  }

  // Check cache
  const cacheKey = `${detected.type}:${detected.cleaned}`;
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.time) < CACHE_TTL_MS) {
    return res.status(200).json({ ...cached.data, cached: true });
  }

  try {
    // OpenFIGI mapping endpoint — free, no auth, generous rate limit
    // Optional: with API key you get higher rate limits, but we don't need it for low volume
    const apiKey = process.env.OPENFIGI_API_KEY; // optional
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-OPENFIGI-APIKEY'] = apiKey;

    const r = await fetch('https://api.openfigi.com/v3/mapping', {
      method: 'POST',
      headers,
      body: JSON.stringify([{
        idType: detected.type,
        idValue: detected.cleaned,
      }]),
    });

    if (!r.ok) {
      throw new Error(`OpenFIGI returned ${r.status}`);
    }

    const responseData = await r.json();
    // OpenFIGI returns an array, one entry per query
    const result = responseData[0];

    // No match found
    if (result.warning || result.error || !result.data || result.data.length === 0) {
      const response = {
        id: detected.cleaned,
        idType: detected.type === 'ID_ISIN' ? 'ISIN' : 'CUSIP',
        valid: false,
        message: 'Not found in OpenFIGI database',
      };
      cache.set(cacheKey, { data: response, time: Date.now() });
      return res.status(200).json(response);
    }

    // Take the first match (composite if multiple exchanges)
    const match = result.data[0];

    // Map securityType to friendly labels
    const securityTypeLabels = {
      'Common Stock': 'Common Stock',
      'ADR': 'American Depositary Receipt',
      'GDR': 'Global Depositary Receipt',
      'PRF EQUITY': 'Preferred Stock',
      'Corp': 'Corporate Bond',
      'CORP': 'Corporate Bond',
      'GOVT': 'Government Bond',
      'Govt': 'Government Bond',
      'MUNI': 'Municipal Bond',
      'Mtge': 'Mortgage-Backed Security',
      'ETP': 'ETF',
      'ETF': 'ETF',
      'MF': 'Mutual Fund',
    };

    const friendlySecurityType = securityTypeLabels[match.securityType2] ||
                                 securityTypeLabels[match.securityType] ||
                                 match.securityType2 ||
                                 match.securityType ||
                                 'Unknown';

    const isBond = friendlySecurityType.toLowerCase().includes('bond') ||
                   friendlySecurityType.toLowerCase().includes('mortgage') ||
                   match.marketSector === 'Corp' ||
                   match.marketSector === 'Govt' ||
                   match.marketSector === 'Muni';

    const response = {
      id: detected.cleaned,
      idType: detected.type === 'ID_ISIN' ? 'ISIN' : 'CUSIP',
      valid: true,
      figi: match.figi,
      name: match.name,
      ticker: match.ticker,
      issuer: match.name,
      securityType: friendlySecurityType,
      marketSector: match.marketSector,
      exchCode: match.exchCode,
      isBond,
    };

    cache.set(cacheKey, { data: response, time: Date.now() });
    return res.status(200).json(response);

  } catch (err) {
    console.error('OpenFIGI error:', err);
    return res.status(502).json({
      error: 'Failed to validate ID',
      message: err.message,
    });
  }
}
