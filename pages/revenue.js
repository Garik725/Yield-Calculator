// pages/revenue.js
// Module 02 · The Round-Trip · P&L attribution
// Self-contained, matches new landing page design.

import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  parseDate, bracket, calcAccrued, cleanFromYtm, ytmFromClean,
} from '../lib/bondMath';

const fmtMoney = (n, ccy = 'USD') => {
  try { return n.toLocaleString('en-US', { style: 'currency', currency: ccy, minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  catch { return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
};
const fmt = (n, dp = 4) => Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

export default function Revenue() {
  const [face, setFace] = useState('1,000,000');
  const [coupon, setCoupon] = useState('6.0');
  const [freq, setFreq] = useState(2);
  const [maturity, setMaturity] = useState('2030-01-01');
  const [dc, setDc] = useState('30/360');
  const [ccy, setCcy] = useState('USD');

  const [buyDate, setBuyDate] = useState('2025-01-01');
  const [buyMode, setBuyMode] = useState('ytm');
  const [buyValue, setBuyValue] = useState('5.0');

  const [sellDate, setSellDate] = useState('2026-01-01');
  const [sellMode, setSellMode] = useState('ytm');
  const [sellValue, setSellValue] = useState('4.0');

  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return;
    const close = (e) => { if (!e.target.closest('.nav-menu')) setNavOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [navOpen]);

  const calculate = () => {
    setError('');
    setResult(null);
    try {
      const faceNum = parseFloat(String(face).replace(/,/g, ''));
      const couponNum = parseFloat(coupon);
      if (isNaN(faceNum) || faceNum <= 0) throw new Error('Enter a valid face value.');
      if (isNaN(couponNum) || couponNum < 0) throw new Error('Enter a valid coupon rate.');
      if (!buyDate || !sellDate || !maturity) throw new Error('All dates required.');

      const bond = { coupon: couponNum, maturity, freq: parseInt(freq), dc };
      const bD = parseDate(buyDate);
      const sD = parseDate(sellDate);
      const mD = parseDate(maturity);

      if (bD >= sD) throw new Error('Sale date must be after purchase date.');
      if (sD > mD) throw new Error('Sale date must be on or before maturity.');
      if (bD >= mD) throw new Error('Purchase date must be before maturity.');

      const buyRaw = parseFloat(buyValue);
      const sellRaw = parseFloat(sellValue);
      if (isNaN(buyRaw) || isNaN(sellRaw)) throw new Error('Enter valid purchase and sale values.');

      let buyY, buyCleanPx;
      if (buyMode === 'price') {
        buyCleanPx = buyRaw;
        buyY = ytmFromClean(buyCleanPx, bond, bD);
      } else {
        buyY = buyRaw / 100;
        buyCleanPx = cleanFromYtm(buyY, bond, bD);
      }
      let sellY, sellCleanPx;
      if (sellMode === 'price') {
        sellCleanPx = sellRaw;
        sellY = ytmFromClean(sellCleanPx, bond, sD);
      } else {
        sellY = sellRaw / 100;
        sellCleanPx = cleanFromYtm(sellY, bond, sD);
      }

      const buyBr = bracket(maturity, bond.freq, bD);
      const sellBr = bracket(maturity, bond.freq, sD);
      const buyAcc = calcAccrued(bond, buyBr.last, buyBr.next, bD).ai;
      const sellAcc = calcAccrued(bond, sellBr.last, sellBr.next, sD).ai;

      const buyInvoice = (buyCleanPx + buyAcc) * faceNum / 100;
      const sellInvoice = (sellCleanPx + sellAcc) * faceNum / 100;

      const couponsPerPayment = bond.coupon / 100 * faceNum / bond.freq;
      const intervalMonths = 12 / bond.freq;
      let d = new Date(mD);
      let couponCount = 0;
      while (d > bD) {
        if (d > bD && d <= sD) couponCount++;
        d = new Date(d); d.setMonth(d.getMonth() - intervalMonths);
      }
      const couponsReceived = couponCount * couponsPerPayment;

      const repricedCleanPx = cleanFromYtm(buyY, bond, sD);
      const repricedInvoice = (repricedCleanPx + sellAcc) * faceNum / 100;

      const carryPL = repricedInvoice - buyInvoice + couponsReceived;
      const marketPL = sellInvoice - repricedInvoice;
      const totalRevenue = sellInvoice - buyInvoice + couponsReceived;
      const totalPct = (totalRevenue / buyInvoice) * 100;
      const holdingDays = Math.round((sD - bD) / 86400000);

      setResult({
        buyY, buyCleanPx, sellY, sellCleanPx,
        buyInvoice, sellInvoice, couponsReceived, repricedInvoice,
        carryPL, marketPL, totalRevenue, totalPct, holdingDays,
      });
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { calculate(); /* eslint-disable-next-line */ }, []);

  return (
    <>
      <Head>
        <title>Round-Trip P&L · Yield Calculator</title>
        <meta name="description" content="Round-trip P&L attribution: total return split between carry and market move." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        :root {
          --paper: #F8F4EA; --paper-2: #FBF8F0; --paper-3: #EFE9DA;
          --ink: #1A1815; --ink-2: #3D3A33; --ink-3: #6B6760; --ink-4: #8E8A82;
          --rule: #DDD5BF; --rule-soft: #E8E2D0;
          --accent: #214B3D; --accent-2: #2E6B5A; --accent-soft: #E5ECE7;
          --gold: #9D7E3E; --gold-soft: #F0E8D4;
          --bull: #1F5E40; --bear: #A33D2E;
          --display: 'Fraunces', Georgia, serif;
          --sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          --mono: 'JetBrains Mono', ui-monospace, monospace;
          --col: 1240px; --pad: clamp(20px, 4vw, 40px);
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        body { background: var(--paper); color: var(--ink); font-family: var(--sans); font-size: 16px; line-height: 1.6; min-height: 100vh; }
        a { color: inherit; text-decoration: none; }
        button { font-family: inherit; border: none; background: none; cursor: pointer; color: inherit; }
        input, select { font-family: var(--sans); }
      `}</style>

      <header className="hd">
        <div className="hd-inner">
          <Link href="/" className="hd-brand">
            <span className="hd-mark">YC</span>
            <span className="hd-name">Yield <i>Calculator</i></span>
          </Link>
          <nav className="hd-nav">
            <Link href="/calc" className="hd-link">Calculator</Link>
            <Link href="/revenue" className="hd-link active">Round-Trip</Link>
            <Link href="/portfolio" className="hd-link">Portfolio</Link>
            <Link href="/curve" className="hd-link">Yield Curve</Link>
          </nav>
          <div className="nav-menu">
            <button className={`nav-trigger ${navOpen ? 'on' : ''}`} onClick={() => setNavOpen(!navOpen)} aria-label="Open menu">
              Menu
              <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {navOpen && (
              <div className="nav-panel">
                <Link href="/" className="np-link" onClick={() => setNavOpen(false)}>Home</Link>
                <Link href="/calc" className="np-link" onClick={() => setNavOpen(false)}>Calculator</Link>
                <Link href="/revenue" className="np-link active" onClick={() => setNavOpen(false)}>Round-Trip P&amp;L</Link>
                <Link href="/portfolio" className="np-link" onClick={() => setNavOpen(false)}>Portfolio</Link>
                <Link href="/curve" className="np-link" onClick={() => setNavOpen(false)}>Yield Curve</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="page">
        <div className="page-inner">
          <div className="page-head">
            <div className="eyebrow">Module № 02</div>
            <h1 className="page-h">The <em>Round-Trip.</em></h1>
            <p className="page-lede">
              Total return, attributed. Enter a buy, a sell, and two settlement dates · receive the gain split between carry and market move using the repriced-entry method. The canonical example below · 6% bond, one-year hold, yields down 100 bp · solves on page load.
            </p>
          </div>

          <div className="layout">
            {/* INPUTS */}
            <div className="inputs">
              <section className="card">
                <div className="card-head">§ A · The Bond</div>
                <div className="grid-2">
                  <div className="field">
                    <label>Face Value</label>
                    <input type="text" value={face} onChange={e => setFace(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Currency</label>
                    <select value={ccy} onChange={e => setCcy(e.target.value)}>
                      <option>USD</option><option>EUR</option><option>GBP</option><option>JPY</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Coupon Rate (%)</label>
                    <input type="number" step="0.001" value={coupon} onChange={e => setCoupon(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Frequency</label>
                    <select value={freq} onChange={e => setFreq(e.target.value)}>
                      <option value="1">Annual</option>
                      <option value="2">Semi-annual</option>
                      <option value="4">Quarterly</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Maturity Date</label>
                    <input type="date" value={maturity} onChange={e => setMaturity(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Day Count</label>
                    <select value={dc} onChange={e => setDc(e.target.value)}>
                      <option>30/360</option><option>ACT/ACT</option><option>ACT/360</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="card">
                <div className="card-head buy">§ B · The Purchase</div>
                <div className="grid-2">
                  <div className="field">
                    <label>Purchase Date</label>
                    <input type="date" value={buyDate} onChange={e => setBuyDate(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>{buyMode === 'ytm' ? 'Purchase Yield (%)' : 'Purchase Clean Price'}</label>
                    <div className="mode-toggle">
                      <button className={buyMode === 'price' ? 'on' : ''} onClick={() => setBuyMode('price')}>Price</button>
                      <button className={buyMode === 'ytm' ? 'on' : ''} onClick={() => setBuyMode('ytm')}>Yield</button>
                    </div>
                    <input type="number" step="0.001" value={buyValue} onChange={e => setBuyValue(e.target.value)} />
                  </div>
                </div>
              </section>

              <section className="card">
                <div className="card-head sell">§ C · The Sale</div>
                <div className="grid-2">
                  <div className="field">
                    <label>Sale Date</label>
                    <input type="date" value={sellDate} onChange={e => setSellDate(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>{sellMode === 'ytm' ? 'Sale Yield (%)' : 'Sale Clean Price'}</label>
                    <div className="mode-toggle">
                      <button className={sellMode === 'price' ? 'on' : ''} onClick={() => setSellMode('price')}>Price</button>
                      <button className={sellMode === 'ytm' ? 'on' : ''} onClick={() => setSellMode('ytm')}>Yield</button>
                    </div>
                    <input type="number" step="0.001" value={sellValue} onChange={e => setSellValue(e.target.value)} />
                  </div>
                </div>
              </section>

              <button className="btn-fill big" onClick={calculate}>Calculate Total Revenue →</button>
              {error && <div className="error">{error}</div>}
            </div>

            {/* RESULTS */}
            <div className="results">
              {result ? (
                <>
                  <div className="result-feat">
                    <div className="result-l">Total Revenue</div>
                    <div className={`result-v ${result.totalRevenue > 0 ? 'pos' : result.totalRevenue < 0 ? 'neg' : ''}`}>
                      {result.totalRevenue >= 0 ? '+' : ''}{fmtMoney(result.totalRevenue, ccy)}
                    </div>
                    <div className="result-s">
                      {result.totalPct >= 0 ? '+' : ''}{result.totalPct.toFixed(3)}% return on invested capital ·{' '}
                      {result.holdingDays}-day holding period
                    </div>
                  </div>

                  <div className="attr">
                    <div className="attr-cell carry">
                      <div className="attr-l">Carry P&amp;L</div>
                      <div className={`attr-v ${result.carryPL > 0 ? 'pos' : result.carryPL < 0 ? 'neg' : ''}`}>
                        {result.carryPL >= 0 ? '+' : ''}{fmtMoney(result.carryPL, ccy)}
                      </div>
                      <div className="attr-m">Income from holding</div>
                    </div>
                    <div className="attr-cell market">
                      <div className="attr-l">Market Move P&amp;L</div>
                      <div className={`attr-v ${result.marketPL > 0 ? 'pos' : result.marketPL < 0 ? 'neg' : ''}`}>
                        {result.marketPL >= 0 ? '+' : ''}{fmtMoney(result.marketPL, ccy)}
                      </div>
                      <div className="attr-m">Gain or loss from yields</div>
                    </div>
                  </div>

                  <details className="brk" open>
                    <summary>Detailed breakdown</summary>
                    <div className="brk-body">
                      <div className="brk-row"><span>Purchase invoice (clean + accrued)</span><b>{fmtMoney(result.buyInvoice, ccy)}</b></div>
                      <div className="brk-row"><span>Sale invoice (clean + accrued)</span><b>{fmtMoney(result.sellInvoice, ccy)}</b></div>
                      <div className="brk-row"><span>Coupons received during holding</span><b className="bull">{fmtMoney(result.couponsReceived, ccy)}</b></div>
                      <div className="brk-row"><span>Repriced entry (at buy yield, sale date)</span><b>{fmtMoney(result.repricedInvoice, ccy)}</b></div>
                      <div className="brk-spacer" />
                      <div className="brk-row"><span>Purchase yield (YTM)</span><b>{fmt(result.buyY * 100, 4)}%</b></div>
                      <div className="brk-row"><span>Purchase clean price</span><b>{fmt(result.buyCleanPx, 4)}</b></div>
                      <div className="brk-row"><span>Sale yield (YTM)</span><b>{fmt(result.sellY * 100, 4)}%</b></div>
                      <div className="brk-row"><span>Sale clean price</span><b>{fmt(result.sellCleanPx, 4)}</b></div>
                    </div>
                  </details>

                  <div className="method">
                    <b>Method.</b> <em>Repriced Entry</em> = invoice at the original purchase yield, settled on the sale date.{' '}
                    <em>Carry</em> = Repriced − Buy + Coupons. <em>Market Move</em> = Sale − Repriced. Coupons credit only to Carry to avoid double-counting with the natural pull-to-par already embedded in the Repriced Entry.
                  </div>

                  <div className="disclaimer">
                    Revenue is gross. Financing costs (repo), brokerage, and FX hedging are not included.
                  </div>
                </>
              ) : (
                <div className="empty">
                  <div className="empty-mark">·</div>
                  <p>Enter the trade details and click Calculate.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="ft">
        <div className="ft-inner">
          <div>© 2026 Yield Calculator · <Link href="/">Home</Link> · <a href="mailto:hello@yieldcalculator.tech">Contact</a></div>
          <div className="ft-disc">For informational purposes only. Not financial advice.</div>
        </div>
      </footer>

      <style jsx>{`
        /* HEADER */
        .hd { position: sticky; top: 0; z-index: 100; background: rgba(248,244,234,.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--rule); }
        .hd-inner { max-width: var(--col); margin: 0 auto; padding: 16px var(--pad); display: flex; align-items: center; gap: 32px; }
        .hd-brand { display: flex; align-items: center; gap: 12px; }
        .hd-mark { width: 32px; height: 32px; background: var(--accent); color: var(--paper); display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 700; font-size: 13px; letter-spacing: -.02em; }
        .hd-name { font-family: var(--display); font-weight: 600; font-size: 18px; letter-spacing: -.015em; line-height: 1; }
        .hd-name :global(i) { font-style: italic; font-weight: 400; color: var(--ink-3); }
        .hd-nav { flex: 1; display: flex; gap: 4px; justify-content: center; }
        .hd-link { padding: 8px 16px; font-family: var(--sans); font-size: 13.5px; font-weight: 500; color: var(--ink-3); border-bottom: 2px solid transparent; transition: color .15s, border-color .15s; }
        .hd-link:hover { color: var(--ink); }
        .hd-link.active { color: var(--accent); border-bottom-color: var(--accent); }
        .hd-back { font-family: var(--sans); font-size: 13px; font-weight: 500; color: var(--ink-3); transition: color .15s; }
        .hd-back:hover { color: var(--accent); }

        /* ── NAV MENU DROPDOWN ── */
        .nav-menu { position: relative; }
        .nav-trigger { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: var(--paper-2); border: 1px solid var(--rule); font-family: var(--sans); font-size: 13px; font-weight: 500; color: var(--ink-2); cursor: pointer; transition: all .15s; }
        .nav-trigger:hover { border-color: var(--accent); color: var(--accent); }
        .nav-trigger.on { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
        .nav-trigger svg { transition: transform .2s; }
        .nav-trigger.on svg { transform: rotate(180deg); }
        .nav-panel { position: absolute; top: calc(100% + 8px); right: 0; background: var(--paper); border: 1px solid var(--rule); min-width: 220px; box-shadow: 0 12px 32px rgba(26,24,21,.12); z-index: 200; animation: navSlideDown .15s ease-out; }
        @keyframes navSlideDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .np-link { display: block; padding: 11px 18px; font-family: var(--sans); font-size: 13.5px; font-weight: 500; color: var(--ink-2); border-left: 2px solid transparent; transition: all .12s; }
        .np-link:hover { background: var(--accent-soft); color: var(--accent); border-left-color: var(--accent); }
        .np-link.active { color: var(--accent); background: var(--accent-soft); border-left-color: var(--accent); font-weight: 600; }

        /* PAGE */
        .page { padding: clamp(40px, 6vw, 72px) 0 80px; min-height: calc(100vh - 200px); }
        .page-inner { max-width: var(--col); margin: 0 auto; padding: 0 var(--pad); }
        .page-head { margin-bottom: 40px; padding-bottom: 28px; border-bottom: 1px solid var(--rule); }
        .eyebrow { font-family: var(--sans); font-weight: 600; font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; display: flex; align-items: center; gap: 12px; }
        .eyebrow::before { content: ""; width: 28px; height: 1px; background: var(--accent); }
        .page-h { font-family: var(--display); font-weight: 500; font-size: clamp(38px, 5.5vw, 64px); line-height: 1; letter-spacing: -.022em; margin-bottom: 14px; font-variation-settings: "opsz" 72; }
        .page-h :global(em) { font-style: italic; font-weight: 400; color: var(--accent); font-variation-settings: "opsz" 72; }
        .page-lede { font-family: var(--sans); font-size: 16px; line-height: 1.6; color: var(--ink-2); max-width: 720px; }

        /* LAYOUT */
        .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: start; }
        @media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }

        /* INPUTS */
        .inputs { display: flex; flex-direction: column; gap: 18px; }
        .card { background: var(--paper-2); border: 1px solid var(--rule); padding: 22px 26px; }
        .card-head { font-family: var(--sans); font-size: 11px; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink-3); padding-bottom: 14px; margin-bottom: 18px; border-bottom: 1px solid var(--rule); }
        .card-head.buy { color: var(--bull); }
        .card-head.sell { color: var(--accent); }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field label { font-family: var(--sans); font-size: 10.5px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); }
        .field input, .field select { padding: 10px 12px; background: var(--paper); border: 1px solid var(--rule); font-family: var(--mono); font-size: 13.5px; color: var(--ink); outline: none; transition: border-color .15s; }
        .field input:focus, .field select:focus { border-color: var(--accent); }

        .mode-toggle { display: flex; border: 1px solid var(--rule); margin-bottom: 4px; }
        .mode-toggle button { flex: 1; padding: 6px 10px; font-family: var(--sans); font-size: 10.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); background: var(--paper); transition: all .15s; }
        .mode-toggle button.on { background: var(--ink); color: var(--paper); }

        .btn-fill { display: inline-block; padding: 14px 28px; background: var(--accent); color: var(--paper); font-family: var(--sans); font-weight: 500; font-size: 13.5px; letter-spacing: .02em; transition: background .15s; text-align: center; }
        .btn-fill:hover { background: var(--accent-2); }
        .btn-fill.big { width: 100%; padding: 16px; font-size: 14px; }

        .error { background: #FCEDE9; color: var(--bear); border: 1px solid var(--bear); padding: 12px 16px; font-family: var(--sans); font-size: 14px; margin-top: 8px; }

        /* RESULTS */
        .results { position: sticky; top: 100px; align-self: start; display: flex; flex-direction: column; gap: 16px; }
        @media (max-width: 960px) { .results { position: static; } }

        .empty { padding: 80px 24px; text-align: center; background: var(--paper-2); border: 1px solid var(--rule); }
        .empty-mark { font-family: var(--display); font-size: 64px; color: var(--ink-4); line-height: 0.4; margin-bottom: 14px; }
        .empty p { font-family: var(--sans); font-style: italic; font-size: 15px; color: var(--ink-3); }

        .result-feat { background: var(--ink); color: var(--paper); padding: 32px 32px; }
        .result-l { font-family: var(--sans); font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: rgba(248,244,234,.55); font-weight: 600; margin-bottom: 10px; }
        .result-v { font-family: var(--display); font-weight: 600; font-size: clamp(36px, 5vw, 52px); letter-spacing: -.025em; line-height: 1; margin-bottom: 10px; font-variation-settings: "opsz" 72; }
        .result-v.pos { color: #5DD176; }
        .result-v.neg { color: #E95B4B; }
        .result-s { font-family: var(--display); font-style: italic; font-weight: 400; font-size: 14px; color: rgba(248,244,234,.7); }

        .attr { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--rule); border: 1px solid var(--rule); }
        .attr-cell { background: var(--paper-2); padding: 20px 24px; border-top: 3px solid var(--rule); }
        .attr-cell.carry { border-top-color: var(--bull); }
        .attr-cell.market { border-top-color: var(--gold); }
        .attr-l { font-family: var(--sans); font-size: 10.5px; letter-spacing: .18em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; margin-bottom: 8px; }
        .attr-v { font-family: var(--display); font-weight: 600; font-size: 26px; letter-spacing: -.02em; font-variation-settings: "opsz" 36; }
        .attr-v.pos { color: var(--bull); }
        .attr-v.neg { color: var(--bear); }
        .attr-m { font-family: var(--display); font-style: italic; font-size: 12.5px; color: var(--ink-3); margin-top: 4px; font-weight: 400; }

        .brk { background: var(--paper-2); border: 1px solid var(--rule); }
        .brk summary { padding: 14px 22px; font-family: var(--sans); font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-2); cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; }
        .brk summary::-webkit-details-marker { display: none; }
        .brk summary::after { content: "+"; font-family: var(--mono); font-size: 16px; color: var(--ink-3); transition: transform .2s; }
        .brk[open] summary::after { content: "−"; }
        .brk[open] summary { border-bottom: 1px solid var(--rule); }
        .brk-body { padding: 16px 22px; }
        .brk-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed var(--rule); font-size: 13.5px; }
        .brk-row:last-child { border-bottom: none; }
        .brk-row span { font-family: var(--sans); color: var(--ink-2); }
        .brk-row b { font-family: var(--mono); font-weight: 600; color: var(--ink); }
        .brk-row b.bull { color: var(--bull); }
        .brk-spacer { height: 12px; }

        .method { padding: 16px 20px; background: var(--gold-soft); border-left: 3px solid var(--gold); font-family: var(--sans); font-size: 13.5px; line-height: 1.6; color: var(--ink-2); }
        .method :global(b) { color: var(--gold); font-weight: 700; }
        .method :global(em) { font-style: italic; color: var(--ink); font-weight: 500; }

        .disclaimer { font-family: var(--sans); font-style: italic; font-size: 12px; color: var(--ink-4); text-align: center; padding: 8px 0; }

        /* FOOTER */
        .ft { background: var(--ink); color: var(--paper); padding: 28px var(--pad); }
        .ft-inner { max-width: var(--col); margin: 0 auto; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; font-family: var(--sans); font-size: 12px; color: rgba(248,244,234,.6); }
        .ft :global(a) { color: rgba(248,244,234,.85); transition: color .15s; }
        .ft :global(a:hover) { color: var(--accent-2); }
        .ft-disc { font-style: italic; opacity: .7; }

        @media (max-width: 960px) {
          .hd-inner { gap: 16px; }
          .hd-link { padding: 8px 10px; font-size: 12px; }
          .hd-back { display: none; }
        }
        @media (max-width: 720px) { .hd-name { display: none; } .hd-link { padding: 8px 8px; font-size: 11.5px; } }
        @media (max-width: 560px) { .grid-2 { grid-template-columns: 1fr; } .attr { grid-template-columns: 1fr; } .hd-link { padding: 6px 6px; font-size: 11px; } }
      `}</style>
    </>
  );
}
