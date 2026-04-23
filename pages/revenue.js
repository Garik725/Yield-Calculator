// pages/revenue.js
// Round-Trip P&L Calculator — dedicated page
// Attribution: Carry P&L + Market Move P&L = Total Revenue
// Method per BRD §6.1 (repriced-entry)

import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import {
  parseDate, isoDate, fmtDate, addBusinessDays, bracket, calcAccrued,
  cleanFromYtm, ytmFromClean,
} from '../lib/bondMath';

const fmtMoney = (n, ccy = 'USD') => {
  try { return n.toLocaleString('en-US', { style: 'currency', currency: ccy, minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  catch { return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
};
const fmt = (n, dp = 4) => n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

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

  const calculate = () => {
    setError('');
    setResult(null);
    try {
      const faceNum = parseFloat(String(face).replace(/,/g, ''));
      const couponNum = parseFloat(coupon);
      if (isNaN(faceNum) || faceNum <= 0) throw new Error('Enter a valid face value.');
      if (isNaN(couponNum) || couponNum < 0) throw new Error('Enter a valid coupon rate.');
      if (!buyDate || !sellDate || !maturity) throw new Error('All dates required.');

      const bond = {
        coupon: couponNum,
        maturity,
        freq: parseInt(freq),
        dc,
      };

      const bD = parseDate(buyDate);
      const sD = parseDate(sellDate);
      const mD = parseDate(maturity);

      if (bD >= sD) throw new Error('Sale date must be after purchase date.');
      if (sD > mD) throw new Error('Sale date must be on or before maturity.');
      if (bD >= mD) throw new Error('Purchase date must be before maturity.');

      const buyRaw = parseFloat(buyValue);
      const sellRaw = parseFloat(sellValue);
      if (isNaN(buyRaw) || isNaN(sellRaw)) throw new Error('Enter valid purchase and sale values.');

      // Derive both sides of both legs
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

      // Coupons between buy and sell (coupon on sale date goes to seller — conservative)
      const couponsPerPayment = bond.coupon / 100 * faceNum / bond.freq;
      const intervalMonths = 12 / bond.freq;
      let d = new Date(mD);
      let couponCount = 0;
      while (d > bD) {
        if (d > bD && d <= sD) couponCount++;
        d = new Date(d); d.setMonth(d.getMonth() - intervalMonths);
      }
      const couponsReceived = couponCount * couponsPerPayment;

      // Repriced entry: buy yield, sale date
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

  // Auto-calculate on mount with default values (canonical example)
  useEffect(() => { calculate(); /* eslint-disable-next-line */ }, []);

  return (
    <AppShell title="Round-Trip P&L">
      <div className="page-wrap">
        <div className="page-head">
          <div className="page-kicker">Module № 02</div>
          <h1 className="page-title">The <em>Round-Trip.</em></h1>
          <p className="page-intro">
            Total return, attributed. Split between carry and market move using the repriced-entry method. The canonical example below — 6% bond, one-year hold, yields down 100 bp — returns in carry and market move in a single click.
          </p>
        </div>

        <div className="layout">
          {/* INPUTS */}
          <div className="inputs">
            <div className="section">
              <div className="section-title">§ A · The Bond</div>
              <div className="field-grid">
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
                    <option>30/360</option>
                    <option>ACT/ACT</option>
                    <option>ACT/360</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="section">
              <div className="section-title buy">§ B · When You Bought It</div>
              <div className="field-grid">
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
            </div>

            <div className="section">
              <div className="section-title sell">§ C · When You Sold It</div>
              <div className="field-grid">
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
            </div>

            <button className="btn-calc" onClick={calculate}>Calculate Total Revenue →</button>
            {error && <div className="error">{error}</div>}
          </div>

          {/* RESULTS */}
          <div className="results">
            {result ? (
              <>
                <div className="headline-result">
                  <div className="result-label">Total Revenue</div>
                  <div className={`result-big ${result.totalRevenue > 0 ? 'pos' : result.totalRevenue < 0 ? 'neg' : ''}`}>
                    {result.totalRevenue >= 0 ? '+' : ''}{fmtMoney(result.totalRevenue, ccy)}
                  </div>
                  <div className="result-sub">
                    {result.totalPct >= 0 ? '+' : ''}{result.totalPct.toFixed(3)}% return on invested capital ·{' '}
                    {result.holdingDays} day holding period
                  </div>
                </div>

                <div className="attribution">
                  <div className="attr-cell carry">
                    <div className="attr-label">Carry P&amp;L</div>
                    <div className={`attr-val ${result.carryPL > 0 ? 'pos' : result.carryPL < 0 ? 'neg' : ''}`}>
                      {result.carryPL >= 0 ? '+' : ''}{fmtMoney(result.carryPL, ccy)}
                    </div>
                    <div className="attr-meta">Income from holding</div>
                  </div>
                  <div className="attr-cell market">
                    <div className="attr-label">Market Move P&amp;L</div>
                    <div className={`attr-val ${result.marketPL > 0 ? 'pos' : result.marketPL < 0 ? 'neg' : ''}`}>
                      {result.marketPL >= 0 ? '+' : ''}{fmtMoney(result.marketPL, ccy)}
                    </div>
                    <div className="attr-meta">Gain / loss from yields</div>
                  </div>
                </div>

                <details className="breakdown">
                  <summary>Detailed breakdown</summary>
                  <div className="breakdown-body">
                    <div className="brk-row"><span>Purchase Invoice (clean + accrued)</span><b>{fmtMoney(result.buyInvoice, ccy)}</b></div>
                    <div className="brk-row"><span>Sale Invoice (clean + accrued)</span><b>{fmtMoney(result.sellInvoice, ccy)}</b></div>
                    <div className="brk-row"><span>Coupons received during holding</span><b style={{color:'var(--bull)'}}>{fmtMoney(result.couponsReceived, ccy)}</b></div>
                    <div className="brk-row"><span>Repriced entry (at original yield, to sale date)</span><b>{fmtMoney(result.repricedInvoice, ccy)}</b></div>
                    <div className="brk-spacer" />
                    <div className="brk-row"><span>Purchase yield (YTM)</span><b>{fmt(result.buyY * 100, 4)}%</b></div>
                    <div className="brk-row"><span>Purchase clean price</span><b>{fmt(result.buyCleanPx, 4)}</b></div>
                    <div className="brk-row"><span>Sale yield (YTM)</span><b>{fmt(result.sellY * 100, 4)}%</b></div>
                    <div className="brk-row"><span>Sale clean price</span><b>{fmt(result.sellCleanPx, 4)}</b></div>
                  </div>
                </details>

                <div className="method-note">
                  <b>Method.</b> <em>Repriced Entry</em> = invoice at the original purchase yield, settled on the sale date.{' '}
                  <em>Carry</em> = Repriced − Buy + Coupons. <em>Market Move</em> = Sale − Repriced. Coupons are credited only to Carry to avoid double-counting with the natural pull-to-par already embedded in the Repriced Entry.
                </div>

                <div className="disclaimer">
                  Revenue is gross. Financing costs (repo), brokerage, and FX hedging not included.
                </div>
              </>
            ) : (
              <div className="empty">Enter the trade details and click Calculate.</div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .page-wrap { max-width: 1240px; margin: 0 auto; padding: 32px 24px 48px; }
        .page-head { margin-bottom: 36px; }
        .page-kicker { font-family: var(--sans); font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); font-weight: 600; margin-bottom: 10px; }
        .page-title { font-family: var(--display); font-weight: 700; font-size: clamp(36px, 5vw, 56px); line-height: 1; letter-spacing: -0.022em; margin-bottom: 16px; }
        .page-title :global(em) { font-style: italic; color: var(--accent); font-weight: 500; }
        .page-intro { font-family: var(--body); font-size: 17px; color: var(--ink-2); line-height: 1.6; max-width: 780px; }

        .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
        @media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }

        .inputs { display: flex; flex-direction: column; gap: 20px; }
        .section { background: var(--paper); border: 1px solid var(--rule); padding: 20px 22px; }
        .section-title { font-family: var(--sans); font-size: 10.5px; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; color: var(--ink-3); padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px solid var(--rule); }
        .section-title.buy { color: var(--bull); }
        .section-title.sell { color: var(--accent); }

        .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .field { display: flex; flex-direction: column; gap: 5px; }
        .field label { font-family: var(--sans); font-size: 11px; color: var(--ink-3); font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
        .field input, .field select { padding: 9px 11px; background: var(--paper-2); border: 1px solid var(--rule); font-family: var(--mono); font-size: 14px; color: var(--ink); outline: none; transition: border-color .15s; }
        .field input:focus, .field select:focus { border-color: var(--ink); background: var(--paper); }

        .mode-toggle { display: flex; gap: 0; margin-bottom: 4px; border: 1px solid var(--rule); }
        .mode-toggle button { flex: 1; padding: 6px 10px; font-family: var(--sans); font-size: 10.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-3); background: var(--paper-2); transition: all .15s; }
        .mode-toggle button.on { background: var(--ink); color: var(--paper); }

        .btn-calc { padding: 16px; background: var(--ink); color: var(--paper); font-family: var(--sans); font-weight: 600; font-size: 13.5px; letter-spacing: .03em; transition: background .15s; }
        .btn-calc:hover { background: var(--accent); }
        .error { background: var(--accent-dim); color: var(--accent); padding: 12px 14px; font-family: var(--body); font-size: 14px; border: 1px solid var(--accent); }

        .results { position: sticky; top: 100px; align-self: start; }
        .empty { padding: 80px 20px; text-align: center; font-family: var(--body); font-style: italic; color: var(--ink-3); background: var(--paper-2); border: 1px solid var(--rule); }

        .headline-result { background: var(--ink); color: var(--paper); padding: 28px 30px; }
        .result-label { font-family: var(--sans); font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: rgba(247,245,239,.55); font-weight: 600; margin-bottom: 8px; }
        .result-big { font-family: var(--display); font-weight: 700; font-size: clamp(36px, 5.5vw, 54px); letter-spacing: -0.03em; line-height: 1; margin-bottom: 8px; }
        .result-big.pos { color: #5DD176; }
        .result-big.neg { color: #E95B4B; }
        .result-sub { font-family: var(--body); font-style: italic; font-size: 14.5px; color: rgba(247,245,239,.7); }

        .attribution { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--rule); border: 1px solid var(--rule); border-top: none; }
        .attr-cell { background: var(--paper); padding: 18px 22px; border-top: 4px solid var(--rule); }
        .attr-cell.carry { border-top-color: var(--bull); }
        .attr-cell.market { border-top-color: var(--gold); }
        .attr-label { font-family: var(--sans); font-size: 10.5px; letter-spacing: .18em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; margin-bottom: 6px; }
        .attr-val { font-family: var(--display); font-weight: 700; font-size: 26px; letter-spacing: -0.02em; }
        .attr-val.pos { color: var(--bull); }
        .attr-val.neg { color: var(--accent); }
        .attr-meta { font-family: var(--body); font-style: italic; font-size: 12.5px; color: var(--ink-3); margin-top: 4px; }

        .breakdown { background: var(--paper); border: 1px solid var(--rule); margin-top: 14px; }
        .breakdown summary { padding: 12px 18px; font-family: var(--sans); font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-2); cursor: pointer; }
        .breakdown[open] summary { border-bottom: 1px solid var(--rule); }
        .breakdown-body { padding: 14px 18px; }
        .brk-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px dashed var(--rule); font-size: 13.5px; }
        .brk-row:last-child { border-bottom: none; }
        .brk-row span { font-family: var(--body); color: var(--ink-2); }
        .brk-row b { font-family: var(--mono); font-weight: 600; color: var(--ink); }
        .brk-spacer { height: 10px; }

        .method-note { margin-top: 16px; padding: 16px 18px; background: var(--gold-dim); border: 1px solid var(--gold); font-family: var(--body); font-size: 13.5px; line-height: 1.6; color: var(--ink-2); }
        .method-note :global(b) { color: var(--gold); font-weight: 700; }
        .method-note :global(em) { font-style: italic; color: var(--ink); font-weight: 500; }
        .disclaimer { margin-top: 12px; font-family: var(--body); font-style: italic; font-size: 12px; color: var(--ink-4); text-align: center; }
      `}</style>
    </AppShell>
  );
}
