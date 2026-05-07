// pages/api/bond.js
// Bond search API. Uses direct JSON import so Vercel bundles the data file.

import bondsData from '../../data/bonds.json';

const bonds = bondsData.bonds || [];

function norm(s) {
  return (s || '').toLowerCase().replace(/\s+/g, '');
}

function scoreMatch(bond, q) {
  const qn = norm(q);
  if (!qn) return 0;
  const isinN = norm(bond.isin);
  const cusipN = norm(bond.cusip);
  const nameN = norm(bond.name);
  const issuerN = norm(bond.issuer);

  if (isinN === qn) return 1000;
  if (cusipN === qn) return 999;
  if (isinN.startsWith(qn)) return 900;
  if (cusipN.startsWith(qn)) return 890;
  if (isinN.includes(qn)) return 700;
  if (cusipN.includes(qn)) return 690;
  if (issuerN === qn) return 600;
  if (issuerN.startsWith(qn)) return 500;
  if (issuerN.includes(qn)) return 400;
  if (nameN.includes(qn)) return 300;
  return 0;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (bonds.length === 0) {
    return res.status(503).json({ error: 'Bond database unavailable' });
  }

  // Apply currency filter if specified
  let pool = bonds;
  const currency = req.query.currency;
  if (currency && currency !== 'ALL') {
    const ccy = String(currency).trim().toUpperCase();
    pool = bonds.filter(b => b.currency === ccy);
  }

  if (req.query.isin) {
    const isin = String(req.query.isin).trim().toUpperCase();
    const found = pool.find(b => b.isin === isin);
    if (!found) return res.status(404).json({ error: 'ISIN not found', isin });
    return res.status(200).json(found);
  }

  if (req.query.cusip) {
    const cusip = String(req.query.cusip).trim().toUpperCase();
    const found = pool.find(b => b.cusip === cusip);
    if (!found) return res.status(404).json({ error: 'CUSIP not found', cusip });
    return res.status(200).json(found);
  }

  const q = req.query.q;
  if (!q) {
    return res.status(400).json({ error: 'Provide ?q=... or ?isin=... or ?cusip=...' });
  }

  const scored = pool
    .map(b => ({ bond: b, score: scoreMatch(b, q) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return res.status(200).json({
    query: q,
    currency: currency || 'ALL',
    count: scored.length,
    results: scored.map(x => x.bond),
  });
}
