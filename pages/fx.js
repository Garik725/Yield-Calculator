// pages/fx.js
// Module 05 · FX · Foreign Exchange Rates
// Live FX data from EODHD, with currency converter and cross-rate matrix.
// Self-contained, matches site design.

import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const G10 = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'SEK', 'NOK'];

const MAJOR_PAIRS = [
  { pair: 'EURUSD', name: 'Euro / US Dollar' },
  { pair: 'GBPUSD', name: 'British Pound / US Dollar' },
  { pair: 'USDJPY', name: 'US Dollar / Japanese Yen' },
  { pair: 'USDCHF', name: 'US Dollar / Swiss Franc' },
  { pair: 'AUDUSD', name: 'Australian Dollar / US Dollar' },
  { pair: 'USDCAD', name: 'US Dollar / Canadian Dollar' },
  { pair: 'NZDUSD', name: 'New Zealand Dollar / US Dollar' },
  { pair: 'EURGBP', name: 'Euro / British Pound' },
  { pair: 'EURJPY', name: 'Euro / Japanese Yen' },
  { pair: 'GBPJPY', name: 'British Pound / Japanese Yen' },
];

const CURRENCY_NAMES = {
  USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen',
  CHF: 'Swiss Franc', AUD: 'Australian Dollar', CAD: 'Canadian Dollar',
  NZD: 'New Zealand Dollar', SEK: 'Swedish Krona', NOK: 'Norwegian Krone',
};

const fmt = (n, dp) => {
  if (n === null || n === undefined || isNaN(n)) return '–';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
};

// Decimal places by pair convention (JPY pairs use 2 decimals, most use 4)
const dpFor = (pair) => (pair.endsWith('JPY') ? 2 : 4);

export default function FX() {
  const [pairs, setPairs] = useState({});
  const [dataStatus, setDataStatus] = useState('loading');
  const [asOf, setAsOf] = useState(null);

  // Converter state
  const [convFrom, setConvFrom] = useState('USD');
  const [convTo, setConvTo] = useState('EUR');
  const [convAmount, setConvAmount] = useState('100');

  // Fetch all major pairs on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/fx')
      .then(r => {
        if (!r.ok) throw new Error(`API returned ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (cancelled) return;
        if (data.error) throw new Error(data.message || data.error);
        const map = {};
        for (const p of data.pairs) {
          if (!p.error) map[p.pair] = p;
        }
        setPairs(map);
        setAsOf(data.asOf);
        setDataStatus('live');
      })
      .catch(err => {
        if (cancelled) return;
        console.error('FX fetch failed:', err);
        setDataStatus('error');
      });
    return () => { cancelled = true; };
  }, []);

  // Compute conversion rate from cached pairs
  // Strategy: try direct (FROM/TO), reverse (TO/FROM), or via USD
  function getRate(from, to) {
    if (from === to) return 1;
    const direct = pairs[from + to];
    if (direct?.rate) return direct.rate;
    const reverse = pairs[to + from];
    if (reverse?.rate) return 1 / reverse.rate;
    // Try via USD
    if (from !== 'USD' && to !== 'USD') {
      const fromToUsd = getRate(from, 'USD');
      const usdToTo = getRate('USD', to);
      if (fromToUsd && usdToTo) return fromToUsd * usdToTo;
    }
    return null;
  }

  const conversionRate = getRate(convFrom, convTo);
  const convertedAmount = (parseFloat(convAmount) || 0) * (conversionRate || 0);
  const convDp = (convFrom === 'JPY' || convTo === 'JPY') ? 2 : 4;

  // Build cross-rate matrix
  function getCrossRate(base, quote) {
    if (base === quote) return null;
    return getRate(base, quote);
  }

  return (
    <>
      <Head>
        <title>FX Rates · Yield Calculator</title>
        <meta name="description" content="Live foreign exchange rates, currency converter, and cross-rate matrix for major currencies." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
                /* Design tokens are defined globally in styles/globals.css */
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
            <Link href="/revenue" className="hd-link">P&amp;L</Link>
            <Link href="/portfolio" className="hd-link">Portfolio</Link>
            <Link href="/curve" className="hd-link">Yield Curve</Link>
            <Link href="/fx" className="hd-link active">FX</Link>
          </nav>
          <Link href="/" className="hd-back">← Home</Link>
        </div>
      </header>

      <main className="page">
        <div className="page-inner">
          <div className="page-head">
            <div className="eyebrow">Module № 05</div>
            <h1 className="page-h">The <em>FX Desk.</em></h1>
            <p className="page-lede">
              Live foreign exchange rates for the major pairs, plus a clean currency converter and the full G10 cross-rate matrix. Source EODHD, 15-minute delayed.
            </p>
          </div>

          {/* SECTION 1: MAJOR PAIRS */}
          <section className="card-box">
            <div className="card-hd">
              <div>
                <div className="card-title">Major Pairs</div>
                <div className="card-sub">
                  {MAJOR_PAIRS.length} pairs · source EODHD
                  {dataStatus === 'loading' && <span className="status loading"> · loading</span>}
                  {dataStatus === 'live' && <span className="status live"> · live</span>}
                  {dataStatus === 'error' && <span className="status error"> · data unavailable</span>}
                </div>
              </div>
              {asOf && (
                <div className="asof">
                  As of {new Date(asOf).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              )}
            </div>

            <div className="pairs-grid">
              <div className="pg-head">
                <div>Pair</div>
                <div className="r">Rate</div>
                <div className="r">Day Change</div>
                <div className="r">Day Change %</div>
                <div className="r">High</div>
                <div className="r">Low</div>
              </div>
              {MAJOR_PAIRS.map(({ pair, name }) => {
                const data = pairs[pair];
                const dp = dpFor(pair);
                if (!data) {
                  return (
                    <div key={pair} className="pg-row loading">
                      <div className="pair-cell">
                        <div className="pair-sym">{pair.substring(0, 3)}/{pair.substring(3, 6)}</div>
                        <div className="pair-name">{name}</div>
                      </div>
                      <div className="r mono">–</div>
                      <div className="r mono">–</div>
                      <div className="r mono">–</div>
                      <div className="r mono">–</div>
                      <div className="r mono">–</div>
                    </div>
                  );
                }
                const isPos = data.change >= 0;
                return (
                  <div key={pair} className="pg-row">
                    <div className="pair-cell">
                      <div className="pair-sym">{pair.substring(0, 3)}/{pair.substring(3, 6)}</div>
                      <div className="pair-name">{name}</div>
                    </div>
                    <div className="r mono rate">{fmt(data.rate, dp)}</div>
                    <div className={`r mono ${isPos ? 'pos' : 'neg'}`}>
                      {isPos ? '+' : ''}{fmt(data.change, dp)}
                    </div>
                    <div className={`r mono ${isPos ? 'pos' : 'neg'}`}>
                      {isPos ? '+' : ''}{fmt(data.changePercent, 2)}%
                    </div>
                    <div className="r mono">{fmt(data.high, dp)}</div>
                    <div className="r mono">{fmt(data.low, dp)}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: CONVERTER */}
          <section className="card-box converter">
            <div className="card-hd">
              <div>
                <div className="card-title">Currency Converter</div>
                <div className="card-sub">Convert any amount between G10 currencies</div>
              </div>
            </div>

            <div className="conv-row">
              <div className="conv-side">
                <label className="conv-label">From</label>
                <div className="conv-input-row">
                  <input
                    type="number"
                    className="conv-amount"
                    value={convAmount}
                    onChange={e => setConvAmount(e.target.value)}
                    step="any"
                  />
                  <select
                    className="conv-ccy"
                    value={convFrom}
                    onChange={e => setConvFrom(e.target.value)}
                  >
                    {G10.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="conv-name">{CURRENCY_NAMES[convFrom]}</div>
              </div>

              <button
                className="conv-swap"
                onClick={() => { const tmp = convFrom; setConvFrom(convTo); setConvTo(tmp); }}
                title="Swap currencies"
              >
                ⇄
              </button>

              <div className="conv-side">
                <label className="conv-label">To</label>
                <div className="conv-input-row">
                  <div className="conv-result">
                    {conversionRate === null ? '–' : fmt(convertedAmount, convDp)}
                  </div>
                  <select
                    className="conv-ccy"
                    value={convTo}
                    onChange={e => setConvTo(e.target.value)}
                  >
                    {G10.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="conv-name">{CURRENCY_NAMES[convTo]}</div>
              </div>
            </div>

            {conversionRate !== null && (
              <div className="conv-rate-line">
                <span>1 {convFrom} = <b>{fmt(conversionRate, convDp)}</b> {convTo}</span>
                <span className="conv-rate-rev">·</span>
                <span>1 {convTo} = <b>{fmt(1 / conversionRate, convDp)}</b> {convFrom}</span>
              </div>
            )}
          </section>

          {/* SECTION 3: CROSS-RATE MATRIX */}
          <section className="card-box">
            <div className="card-hd">
              <div>
                <div className="card-title">G10 Cross-Rate Matrix</div>
                <div className="card-sub">Read row → column · "1 of <i>row</i> equals N <i>column</i>"</div>
              </div>
            </div>

            <div className="matrix-wrap">
              <table className="matrix">
                <thead>
                  <tr>
                    <th></th>
                    {G10.map(c => <th key={c}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {G10.map(rowCcy => (
                    <tr key={rowCcy}>
                      <th>{rowCcy}</th>
                      {G10.map(colCcy => {
                        if (rowCcy === colCcy) {
                          return <td key={colCcy} className="diag">–</td>;
                        }
                        const rate = getCrossRate(rowCcy, colCcy);
                        if (rate === null) {
                          return <td key={colCcy} className="empty">–</td>;
                        }
                        const dp = (colCcy === 'JPY') ? 2 : 4;
                        return (
                          <td key={colCcy}>{fmt(rate, dp)}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="matrix-note">
              Rates derived from major pairs. SEK and NOK pairs may show as missing if their cross-rates are not in the major pairs feed.
            </div>
          </section>
        </div>
      </main>

      <footer className="ft">
        <div className="ft-inner">
          <div>© 2026 Yield Calculator · <Link href="/">Home</Link> · <a href="mailto:hello@yieldcalculator.tech">Contact</a></div>
          <div className="ft-disc">FX rates 15-minute delayed. For informational purposes only.</div>
        </div>
      </footer>

      <style jsx>{`
        /* HEADER (matches other module pages) */
        .hd { position: sticky; top: 0; z-index: 100; background: rgba(246,248,250,.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--rule); }
        .hd-inner { max-width: var(--col); margin: 0 auto; padding: 16px var(--pad); display: flex; align-items: center; gap: 32px; }
        .hd-brand { display: flex; align-items: center; gap: 12px; }
        .hd-mark { width: 32px; height: 32px; background: var(--accent); color: var(--paper); display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 700; font-size: 13px; letter-spacing: -.02em; }
        .hd-name { font-family: var(--display); font-weight: 600; font-size: 18px; letter-spacing: -.015em; line-height: 1; }
        .hd-name :global(i) { font-style: italic; font-weight: 400; color: var(--ink-3); }
        .hd-nav { flex: 1; display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; }
        .hd-link { padding: 8px 4px; font-family: var(--sans); font-size: 13.5px; font-weight: 500; color: var(--ink-3); border-bottom: 2px solid transparent; transition: color .15s, border-color .15s; white-space: nowrap; }
        .hd-link:hover { color: var(--ink); }
        .hd-link.active { color: var(--accent); border-bottom-color: var(--accent); }
        .hd-back { font-family: var(--sans); font-size: 13px; font-weight: 500; color: var(--ink-3); transition: color .15s; }
        .hd-back:hover { color: var(--accent); }

        /* PAGE */
        .page { padding: clamp(40px, 6vw, 72px) 0 80px; min-height: calc(100vh - 200px); }
        .page-inner { max-width: var(--col); margin: 0 auto; padding: 0 var(--pad); }
        .page-head { margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px solid var(--rule); }
        .eyebrow { font-family: var(--sans); font-weight: 600; font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; display: flex; align-items: center; gap: 12px; }
        .eyebrow::before { content: ""; width: 28px; height: 1px; background: var(--accent); }
        .page-h { font-family: var(--display); font-weight: 500; font-size: clamp(38px, 5.5vw, 64px); line-height: 1; letter-spacing: -.022em; margin-bottom: 14px; font-variation-settings: "opsz" 72; }
        .page-h :global(em) { font-style: italic; font-weight: 400; color: var(--accent); font-variation-settings: "opsz" 72; }
        .page-lede { font-family: var(--sans); font-size: 16px; line-height: 1.6; color: var(--ink-2); max-width: 720px; }

        /* CARD BOXES */
        .card-box { background: var(--paper-2); border: 1px solid var(--rule); padding: 24px 28px; margin-bottom: 24px; }
        .card-hd { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 16px; border-bottom: 1px solid var(--rule); margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .card-title { font-family: var(--display); font-weight: 500; font-size: 22px; letter-spacing: -.015em; font-variation-settings: "opsz" 24; }
        .card-sub { font-family: var(--mono); font-size: 11px; color: var(--ink-3); margin-top: 4px; }
        .card-sub :global(i) { font-style: italic; }
        .status.live { color: var(--bull); font-weight: 600; }
        .status.loading { color: var(--ink-3); font-style: italic; }
        .status.error { color: var(--bear); }
        .asof { font-family: var(--mono); font-size: 11px; color: var(--ink-3); }

        /* MAJOR PAIRS GRID */
        .pairs-grid { display: flex; flex-direction: column; }
        .pg-head, .pg-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr; gap: 16px; padding: 12px 4px; align-items: center; border-bottom: 1px solid var(--rule); font-size: 13.5px; }
        .pg-row:last-child { border-bottom: none; }
        .pg-head { font-family: var(--sans); font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; border-bottom: 2px solid var(--ink); padding-bottom: 12px; }
        .pg-row.loading { opacity: 0.5; }
        .pg-row:hover { background: var(--paper-3); }
        .pair-cell { display: flex; flex-direction: column; gap: 2px; }
        .pair-sym { font-family: var(--mono); font-weight: 700; color: var(--ink); font-size: 14px; letter-spacing: .03em; }
        .pair-name { font-family: var(--sans); font-style: italic; font-size: 12px; color: var(--ink-3); }
        .r { text-align: right; }
        .mono { font-family: var(--mono); font-weight: 500; color: var(--ink); }
        .mono.rate { font-weight: 600; }
        .pos { color: var(--bull); font-weight: 600; }
        .neg { color: var(--bear); font-weight: 600; }

        /* CONVERTER */
        .converter { background: var(--paper-2); }
        .conv-row { display: grid; grid-template-columns: 1fr auto 1fr; gap: 24px; align-items: end; padding: 24px 16px; }
        .conv-side { display: flex; flex-direction: column; gap: 8px; }
        .conv-label { font-family: var(--sans); font-size: 10.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); }
        .conv-input-row { display: flex; gap: 12px; align-items: stretch; }
        .conv-amount, .conv-result { flex: 1; padding: 16px 18px; background: var(--bg); border: 1.5px solid var(--border2); border-radius: 9px; font-family: var(--mono); font-size: 22px; font-weight: 600; color: var(--text); outline: none; transition: all .15s; min-width: 0; }
        .conv-amount:focus { border-color: var(--blue); background: var(--surface); }
        .conv-result { background: var(--blue-dim); color: var(--blue); border-color: var(--blue-dim); display: flex; align-items: center; justify-content: flex-end; }
        .conv-ccy { padding: 16px 14px; background: var(--text); color: #fff; border: 1.5px solid var(--text); border-radius: 9px; font-family: var(--mono); font-size: 14px; font-weight: 600; letter-spacing: .04em; cursor: pointer; }
        .conv-name { font-family: var(--sans); font-style: italic; font-size: 13px; color: var(--ink-3); padding-left: 4px; }
        .conv-swap { padding: 14px; font-size: 24px; color: var(--accent); cursor: pointer; transition: transform .2s; align-self: center; }
        .conv-swap:hover { transform: rotate(180deg); }
        .conv-rate-line { padding: 14px 16px; background: var(--paper-3); border-top: 1px solid var(--rule); font-family: var(--mono); font-size: 13px; color: var(--ink-2); display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }
        .conv-rate-line :global(b) { color: var(--accent); font-weight: 700; }
        .conv-rate-rev { color: var(--ink-4); }

        /* CROSS-RATE MATRIX */
        .matrix-wrap { overflow-x: auto; }
        .matrix { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .matrix th, .matrix td { padding: 10px 12px; border: 1px solid var(--rule); text-align: center; font-family: var(--mono); }
        .matrix thead th { background: var(--paper-3); font-weight: 700; color: var(--ink); letter-spacing: .04em; }
        .matrix tbody th { background: var(--paper-3); text-align: center; font-weight: 700; color: var(--ink); letter-spacing: .04em; }
        .matrix td { color: var(--ink); font-weight: 500; }
        .matrix td.diag { background: var(--paper-3); color: var(--ink-4); }
        .matrix td.empty { color: var(--ink-4); font-style: italic; }
        .matrix-note { padding-top: 12px; font-family: var(--sans); font-style: italic; font-size: 12px; color: var(--ink-3); }

        /* FOOTER */
        .ft { background: var(--ink); color: var(--paper); padding: 28px var(--pad); }
        .ft-inner { max-width: var(--col); margin: 0 auto; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; font-family: var(--sans); font-size: 12px; color: rgba(248,244,234,.6); }
        .ft :global(a) { color: rgba(248,244,234,.85); transition: color .15s; }
        .ft :global(a:hover) { color: var(--accent-2); }
        .ft-disc { font-style: italic; opacity: .7; }

        /* RESPONSIVE */
        @media (max-width: 960px) {
          .hd-inner { gap: 16px; }
          .hd-nav { gap: 16px; }
          .hd-link { font-size: 12px; }
          .hd-back { display: none; }
          .pg-head, .pg-row { grid-template-columns: 1.6fr 1fr 1fr; }
          .pg-head > div:nth-child(4),
          .pg-head > div:nth-child(5),
          .pg-head > div:nth-child(6),
          .pg-row > div:nth-child(4),
          .pg-row > div:nth-child(5),
          .pg-row > div:nth-child(6) { display: none; }
          .conv-row { grid-template-columns: 1fr; gap: 12px; }
          .conv-swap { transform: rotate(90deg); }
          .conv-swap:hover { transform: rotate(270deg); }
        }
        @media (max-width: 720px) {
          .hd-name { display: none; }
          .hd-nav { gap: 12px; }
          .hd-link { font-size: 11.5px; }
          .matrix th, .matrix td { padding: 6px 8px; font-size: 11px; }
        }
      `}</style>
    </>
  );
}
