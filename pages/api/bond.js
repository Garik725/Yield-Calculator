// pages/api/bond.js
// Secure server-side endpoint - API key never exposed to browser

export default async function handler(req, res) {
  const { isin, currency } = req.query;

  if (!isin) {
    return res.status(400).json({ error: 'ISIN is required' });
  }

  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Search EODHD for bond by ISIN
    const searchUrl = `https://eodhd.com/api/search/${encodeURIComponent(isin)}?api_token=${apiKey}&type=bond&fmt=json`;
    const searchRes = await fetch(searchUrl);
    
    if (!searchRes.ok) {
      throw new Error(`EODHD search failed: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();

    if (!searchData || searchData.length === 0) {
      // Try broader search
      const broadUrl = `https://eodhd.com/api/search/${encodeURIComponent(isin)}?api_token=${apiKey}&fmt=json&limit=5`;
      const broadRes = await fetch(broadUrl);
      const broadData = await broadRes.json();
      
      if (!broadData || broadData.length === 0) {
        return res.status(404).json({ error: 'Bond not found', isin });
      }

      const match = broadData[0];
      return res.status(200).json(formatBond(match, isin, currency));
    }

    const bond = searchData[0];
    return res.status(200).json(formatBond(bond, isin, currency));

  } catch (error) {
    console.error('Bond lookup error:', error);
    return res.status(500).json({ error: 'Failed to fetch bond data', details: error.message });
  }
}

function formatBond(data, isin, requestedCurrency) {
  // Determine currency from bond data or request
  const ccy = requestedCurrency || data.Currency || 'USD';
  
  // Extract bond details - EODHD returns different fields
  const name = data.Name || data.name || isin;
  const coupon = parseFloat(data.Coupon || data.couponRate || 0);
  const maturity = data.MaturityDate || data.maturityDate || '';
  const issuer = data.Issuer || data.issuerName || data.Exchange || '';
  const rating = data.Rating || data.rating || '—';
  
  // Determine day count convention
  // Government bonds typically use ACT/ACT, corporates use 30/360
  const type = data.Type || data.type || '';
  const isGovt = type.toLowerCase().includes('gov') || 
                 name.toLowerCase().includes('treasury') ||
                 name.toLowerCase().includes('govt') ||
                 issuer.toLowerCase().includes('government') ||
                 issuer.toLowerCase().includes('treasury') ||
                 issuer.toLowerCase().includes('republic') ||
                 issuer.toLowerCase().includes('sovereign');
  const dc = isGovt ? 'ACT/ACT' : '30/360';
  
  // Frequency - most bonds are semi-annual
  const freq = parseInt(data.PaymentFrequency || 2);

  return {
    isin,
    name,
    issuer,
    coupon,
    maturity,
    freq: isNaN(freq) ? 2 : freq,
    dc,
    rating,
    ccy,
    type: isGovt ? 'Government' : (type || 'Corporate'),
    raw: data,
  };
}
