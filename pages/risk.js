// pages/risk.js
//
// Module № 06 — Risk: realized volatility + correlation matrix for any
// stocks/ETFs the user types. Calls /api/risk which fetches adjusted-close
// price history from EODHD and runs lib/riskMath.js.
//
// Design notes:
//   - Mirrors the calc.js aesthetic (teal-blue + green palette, white cards,
//     rounded inset inputs, subsection labels).
//   - Ticker input is chip-based: type a symbol + Enter/comma/space to add.
//   - Date range uses preset buttons (1M/3M/6M/1Y/3Y/5Y) plus custom inputs.
//   - Errors and warnings from the API are surfaced per-ticker, not swallowed.
//   - When some tickers fail and others succeed, we still show results for
//     what worked — partial success > total failure.

import { useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

const PRESETS = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '3Y', days: 365 * 3 },
  { label: '5Y', days: 365 * 5 },
];

// Sample tickers shown in the empty-state, one click loads them all
const SAMPLE_BASKETS = [
  { name: 'Stocks vs bonds', tickers: ['SPY', 'TLT', 'GLD'] },
  { name: 'Tech leaders',    tickers: ['AAPL', 'MSFT', 'NVDA', 'GOOGL'] },
  { name: 'Bond ETF curve',  tickers: ['SHY', 'IEF', 'TLT', 'LQD', 'HYG'] },
];

// Heat colour for a correlation value. Returns inline style strings so the
// component doesn't need a separate <style> rule per pair. Matches the
// site's teal-blue (positive) and pink/coral (negative) palette.
const corrStyle = (c) => {
  if (c >= 0.85)  return { background: '#9FE1CB', color: '#04342C' };
  if (c >= 0.5)   return { background: '#E1F5EE', color: '#085041' };
  if (c >= 0.15)  return { background: '#F4F8F6', color: '#3D3A33' };
  if (c >= -0.15) return { background: '#F2F4F6', color: '#6B6760' };
  if (c >= -0.5)  return { background: '#FBEAF0', color: '#72243E' };
  return { background: '#F4C0D1', color: '#4B1528' };
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Risk() {
  const [chips, setChips] = useState([]);          // array of ticker strings
  const [input, setInput] = useState('');           // current text in the input
  const [from, setFrom] = useState(daysAgo(365));
  const [to, setTo] = useState(today());
  const [preset, setPreset] = useState('1Y');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [errors, setErrors] = useState(null);       // { [ticker]: errString }
  const [warnings, setWarnings] = useState(null);
  const [topError, setTopError] = useState(null);   // global error message

  const canCompute = chips.length >= 2 && from && to && from < to && !loading;

  // ─── Chip management ──
  // Accept tickers separated by Enter, comma, or space. Uppercase, trim,
  // dedup case-insensitively. Reject empty strings and obvious garbage.
  const addTickers = useCallback((raw) => {
    const candidates = String(raw).toUpperCase().split(/[\s,]+/).filter(Boolean);
    setChips((prev) => {
      const seen = new Set(prev);
      const next = [...prev];
      for (const c of candidates) {
        // Allow letters, digits, hyphen, dot. Reject anything else.
        if (!/^[A-Z0-9.\-]{1,20}$/.test(c)) continue;
        if (!seen.has(c)) { next.push(c); seen.add(c); }
      }
      return next;
    });
    setInput('');
  }, []);

  const removeChip = (t) => setChips(chips.filter((c) => c !== t));

  const onInputKey = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (input.trim()) addTickers(input);
    } else if (e.key === 'Backspace' && !input && chips.length > 0) {
      removeChip(chips[chips.length - 1]);
    }
  };

  // ─── Preset date ranges ──
  const setPresetRange = (p) => {
    setPreset(p.label);
    setFrom(daysAgo(p.days));
    setTo(today());
  };

  const onFromChange = (v) => { setFrom(v); setPreset('custom'); };
  const onToChange   = (v) => { setTo(v);   setPreset('custom'); };

  // ─── Submit ──
  const compute = async () => {
    setLoading(true);
    setReport(null); setErrors(null); setWarnings(null); setTopError(null);
    try {
      const res = await fetch('/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: chips, from, to }),
      });
      const data = await res.json();
      if (data.ok) {
        setReport(data.report);
        if (data.errors)   setErrors(data.errors);
        if (data.warnings) setWarnings(data.warnings);
      } else {
        setTopError(data.error || 'Unknown error');
        if (data.errors) setErrors(data.errors);
      }
    } catch (e) {
      setTopError('Network error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Derived display values ──
  const volRows = useMemo(() => {
    if (!report) return [];
    return Object.entries(report.volatility).map(([ticker, v]) => ({
      ticker,
      dailyMean: v.dailyMean * 100,
      dailyStdev: v.dailyStdev * 100,
      annualVol: v.annualizedVol * 100,
      n: v.observations,
    })).sort((a, b) => b.annualVol - a.annualVol);  // highest vol first
  }, [report]);

  const droppedSummary = useMemo(() => {
    if (!report) return null;
    let total = 0;
    for (const t of Object.keys(report.dropped)) total += report.dropped[t].length;
    return total;
  }, [report]);

  return (
    <>
      <Head>
        <title>Risk · Correlation &amp; Volatility · Yield Calculator</title>
        <meta name="description" content="Realized volatility and correlation matrix for any stocks, ETFs, or bond funds. Powered by adjusted-close price history." />
      </Head>

      <style jsx global>{`
        a { color: inherit; text-decoration: none; }
        button { font-family: inherit; border: none; background: none; cursor: pointer; color: inherit; }
        input { font-family: var(--sans); }
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
            <Link href="/fx" className="hd-link">FX</Link>
            <Link href="/risk" className="hd-link active">Risk</Link>
          </nav>
        </div>
      </header>

      <main className="page">
        <div className="page-inner">
          <div className="page-head">
            <div className="eyebrow">Module № 06</div>
            <h1 className="page-h">The <em>Risk Desk.</em></h1>
            <p className="page-lede">
              Realized volatility and pairwise correlation for any portfolio of stocks, ETFs, or bond funds. Daily log returns over your chosen window, annualized at √252 trading days. Adjusted-close prices via EODHD &middot; no scraping, no Yahoo dependencies.
            </p>
          </div>

          {/* ── Input card ─────────────────────────────────────────────── */}
          <div className="card">
            <div className="sub-label">Instruments</div>
            <div className="chips" onClick={() => document.getElementById('risk-input')?.focus()}>
              {chips.map((t) => (
                <span key={t} className="chip">
                  {t}
                  <button className="chip-x" onClick={(e) => { e.stopPropagation(); removeChip(t); }} aria-label={`Remove ${t}`}>&times;</button>
                </span>
              ))}
              <input
                id="risk-input"
                className="chip-input"
                placeholder={chips.length === 0 ? 'Type ticker symbols (SPY, TLT, GLD) and press Enter' : ''}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onInputKey}
                onBlur={() => { if (input.trim()) addTickers(input); }}
                spellCheck={false}
                autoCapitalize="characters"
              />
            </div>
            <div className="helper">
              Default exchange is <code>.US</code>. For non-US tickers append the exchange: <code>VOD.LSE</code>, <code>BMW.XETRA</code>.
            </div>

            {chips.length === 0 && (
              <div className="samples">
                <span className="samples-label">Try a sample basket:</span>
                {SAMPLE_BASKETS.map((b) => (
                  <button key={b.name} className="sample-btn" onClick={() => addTickers(b.tickers.join(' '))}>
                    {b.name}
                    <span className="sample-tickers">{b.tickers.join(' · ')}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="hdivider"/>

            <div className="sub-label">Date range</div>
            <div className="preset-row">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  className={`preset${preset === p.label ? ' on' : ''}`}
                  onClick={() => setPresetRange(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="date-row">
              <div className="field">
                <div className="fl">From</div>
                <input type="date" className="fi" value={from} onChange={(e) => onFromChange(e.target.value)} max={to}/>
              </div>
              <div className="field">
                <div className="fl">To</div>
                <input type="date" className="fi" value={to} onChange={(e) => onToChange(e.target.value)} min={from} max={today()}/>
              </div>
            </div>

            <div className="hdivider"/>

            <button className="btn-go" onClick={compute} disabled={!canCompute}>
              {loading ? 'Computing…' : (chips.length < 2 ? `Add ${2 - chips.length} more ticker${chips.length === 1 ? '' : 's'}` : 'Compute risk')}
            </button>
          </div>

          {/* ── Errors / warnings ─────────────────────────────────────── */}
          {topError && (
            <div className="msg-error">
              <strong>Couldn't compute.</strong> {topError}
              {errors && Object.keys(errors).length > 0 && (
                <ul className="err-list">
                  {Object.entries(errors).map(([t, e]) => (
                    <li key={t}><code>{t}</code> &mdash; {e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {!topError && errors && Object.keys(errors).length > 0 && (
            <div className="msg-warn">
              <strong>Partial result.</strong> Some tickers failed and were excluded from the analysis:
              <ul className="err-list">
                {Object.entries(errors).map(([t, e]) => (
                  <li key={t}><code>{t}</code> &mdash; {e}</li>
                ))}
              </ul>
            </div>
          )}
          {warnings && Object.keys(warnings).length > 0 && (
            <div className="msg-warn">
              <strong>Data warnings.</strong>
              <ul className="err-list">
                {Object.entries(warnings).map(([t, w]) => (
                  <li key={t}><code>{t}</code> &mdash; {w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Report ─────────────────────────────────────────────────── */}
          {report && (
            <>
              <div className="card">
                <div className="sub-label">Summary</div>
                <div className="stat-grid">
                  <div className="stat">
                    <div className="stat-label">Instruments</div>
                    <div className="stat-value">{report.tickers.length}</div>
                    <div className="stat-sub">{report.tickers.join(' · ')}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Trading days</div>
                    <div className="stat-value">{report.alignedDates.length}</div>
                    <div className="stat-sub">{report.returnDates.length} return obs.</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Date range</div>
                    <div className="stat-value">{(report.alignedDates.length / 252).toFixed(2)}y</div>
                    <div className="stat-sub">{report.alignedDates[0]} → {report.alignedDates[report.alignedDates.length - 1]}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Coverage</div>
                    <div className="stat-value">{(report.coverage * 100).toFixed(1)}%</div>
                    <div className="stat-sub">{droppedSummary === 0 ? 'perfect alignment' : `${droppedSummary} missing-date drops`}</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="sub-label">Annualized volatility &middot; sorted high to low</div>
                <table className="vol-table">
                  <thead>
                    <tr>
                      <th>Instrument</th>
                      <th style={{textAlign:'right'}}>Mean daily return</th>
                      <th style={{textAlign:'right'}}>Daily stdev</th>
                      <th style={{textAlign:'right'}}>Annualized vol</th>
                      <th style={{textAlign:'right'}}>Observations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volRows.map((r) => (
                      <tr key={r.ticker}>
                        <td><span className="pill">{r.ticker}</span></td>
                        <td className="num">{r.dailyMean.toFixed(3)}%</td>
                        <td className="num">{r.dailyStdev.toFixed(3)}%</td>
                        <td className="num bold">{r.annualVol.toFixed(2)}%</td>
                        <td className="num muted">{r.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <div className="sub-label">Correlation matrix &middot; Pearson on daily log returns</div>
                <div className="corr-wrap">
                  <table className="corr-table">
                    <thead>
                      <tr>
                        <th></th>
                        {report.correlation.tickers.map((t) => (
                          <th key={t} className="corr-head">{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.correlation.tickers.map((rowTicker, i) => (
                        <tr key={rowTicker}>
                          <th className="corr-head row">{rowTicker}</th>
                          {report.correlation.tickers.map((colTicker, j) => {
                            const c = report.correlation.matrix[i][j];
                            const isDiag = i === j;
                            return (
                              <td
                                key={colTicker}
                                className={`corr-cell${isDiag ? ' diag' : ''}`}
                                style={isDiag ? undefined : corrStyle(c)}
                                title={`${rowTicker} vs ${colTicker}: ${c.toFixed(4)}`}
                              >
                                {isDiag ? '—' : c.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="legend">
                  <span className="lg-item"><span className="lg-sw" style={corrStyle(0.9)}/>&ge;0.85 strong+</span>
                  <span className="lg-item"><span className="lg-sw" style={corrStyle(0.7)}/>0.5–0.85</span>
                  <span className="lg-item"><span className="lg-sw" style={corrStyle(0.3)}/>0.15–0.5</span>
                  <span className="lg-item"><span className="lg-sw" style={corrStyle(0)}/>±0.15 ~ zero</span>
                  <span className="lg-item"><span className="lg-sw" style={corrStyle(-0.3)}/>-0.5 to -0.15</span>
                  <span className="lg-item"><span className="lg-sw" style={corrStyle(-0.9)}/>&le;-0.5 strong−</span>
                </div>
              </div>

              <div className="card method">
                <div className="sub-label">Method</div>
                <p>
                  Daily log returns computed as <code>ln(P_t / P_{`{t-1}`})</code> over aligned trading dates. Volatility is the sample standard deviation of returns multiplied by <code>&radic;252</code>. Correlation is Pearson on the same return series. Dates where any instrument is missing a price are dropped &mdash; no forward-fill, no interpolation.
                </p>
                <p className="method-secondary">
                  Prices are adjusted close (split- and dividend-adjusted) from EODHD. v1 does not include rolling/time-varying correlation, EWMA or GARCH weighting, beta vs benchmark, tracking error, or implied volatility &mdash; ask if any of those would help your workflow.
                </p>
              </div>
            </>
          )}

        </div>
      </main>

      <footer className="ft">
        <div className="ft-inner">
          <div>© 2026 Yield Calculator · <Link href="/">Home</Link> · <a href="mailto:hello@yieldcalculator.tech">Contact</a></div>
          <div className="ft-disc">Adjusted-close prices via EODHD. Not investment advice.</div>
        </div>
      </footer>

      <style jsx>{`
        /* HEADER */
        .hd { position: sticky; top: 0; z-index: 100; background: rgba(246,248,250,.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
        .hd-inner { max-width: var(--col); margin: 0 auto; padding: 14px var(--pad); display: flex; justify-content: space-between; align-items: center; gap: 24px; }
        .hd-brand { display: flex; align-items: center; gap: 12px; }
        .hd-mark { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: var(--blue); color: #fff; font-family: var(--sans); font-weight: 700; font-size: 11px; border-radius: 6px; letter-spacing: 0.5px; }
        .hd-name { font-family: var(--display); font-size: 17px; color: var(--text); }
        .hd-name i { font-style: italic; color: var(--blue); }
        .hd-nav { display: flex; gap: 24px; align-items: center; }
        .hd-link { font-size: 13.5px; color: var(--text2); transition: color .15s; }
        .hd-link:hover { color: var(--blue); }
        .hd-link.active { color: var(--blue); font-weight: 500; }

        /* PAGE */
        .page { min-height: calc(100vh - 200px); padding: 48px 0 96px; }
        .page-inner { max-width: 980px; margin: 0 auto; padding: 0 var(--pad); display: flex; flex-direction: column; gap: 24px; }
        .page-head { margin-bottom: 12px; }
        .eyebrow { font-size: 11px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: var(--blue); margin-bottom: 14px; }
        .page-h { font-family: var(--display); font-size: 44px; font-weight: 400; color: var(--text); margin: 0 0 18px; line-height: 1.1; }
        .page-h em { font-style: italic; color: var(--blue); }
        .page-lede { font-size: 16px; color: var(--text2); line-height: 1.6; max-width: 720px; }
        .page-lede code { font-family: var(--mono); font-size: 13.5px; color: var(--blue); background: var(--blue-dim); padding: 1px 5px; border-radius: 4px; }

        /* CARD */
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px 28px; }
        .sub-label { font-size: 10px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--blue); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .sub-label::before { content: ""; display: inline-block; width: 14px; height: 1.5px; background: var(--blue); }
        .hdivider { border: none; border-top: 1px solid var(--border); margin: 22px 0; }

        /* CHIPS */
        .chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 12px; background: var(--bg); border: 1.5px solid var(--border2); border-radius: 9px; min-height: 50px; align-items: center; cursor: text; transition: all .15s; }
        .chips:focus-within { border-color: var(--blue); background: var(--surface); }
        .chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 4px 4px 10px; background: var(--blue); color: #fff; font-family: var(--mono); font-size: 12.5px; font-weight: 600; border-radius: 5px; letter-spacing: 0.3px; }
        .chip-x { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; background: rgba(255,255,255,0.18); color: #fff; border-radius: 3px; font-size: 14px; line-height: 1; padding: 0; }
        .chip-x:hover { background: rgba(255,255,255,0.3); }
        .chip-input { flex: 1; min-width: 200px; border: none; outline: none; background: transparent; font-family: var(--mono); font-size: 13px; color: var(--text); padding: 4px 0; }
        .helper { font-size: 12px; color: var(--text3); line-height: 1.6; margin-top: 8px; }
        .helper code { font-family: var(--mono); font-size: 11.5px; color: var(--blue); background: var(--blue-dim); padding: 1px 5px; border-radius: 3px; }

        /* SAMPLES */
        .samples { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 14px; }
        .samples-label { font-size: 11.5px; color: var(--text3); margin-right: 4px; }
        .sample-btn { display: inline-flex; flex-direction: column; align-items: flex-start; padding: 6px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; transition: all .12s; }
        .sample-btn:hover { border-color: var(--blue); background: var(--blue-dim); }
        .sample-btn > span:first-child, .sample-btn { color: var(--text2); }
        .sample-btn:hover { color: var(--blue); }
        .sample-tickers { font-family: var(--mono); font-size: 10.5px; color: var(--text3); margin-top: 1px; }
        .sample-btn:hover .sample-tickers { color: var(--blue); }

        /* DATE RANGE */
        .preset-row { display: flex; gap: 4px; background: var(--bg); border: 1px solid var(--border); border-radius: 7px; padding: 3px; width: fit-content; margin-bottom: 14px; }
        .preset { padding: 5px 14px; border-radius: 5px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: var(--text3); transition: all .12s; }
        .preset:hover { color: var(--text2); }
        .preset.on { background: var(--blue); color: #fff; box-shadow: 0 1px 2px rgba(14,79,110,0.18); }
        .date-row { display: flex; gap: 16px; }
        .field { flex: 1; }
        .fl { font-size: 11px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text3); margin-bottom: 5px; }
        .fi { width: 100%; padding: 9px 11px; background: var(--bg); border: 1.5px solid var(--border2); border-radius: 7px; color: var(--text); font-size: 14px; font-family: var(--mono); font-weight: 500; outline: none; transition: all .14s; }
        .fi:focus { border-color: var(--blue); background: var(--surface); }

        /* COMPUTE BUTTON */
        .btn-go { width: 100%; padding: 14px; background: var(--blue); color: #fff; font-family: var(--sans); font-weight: 600; font-size: 14px; letter-spacing: 0.02em; border-radius: 9px; transition: background .15s; }
        .btn-go:hover:not(:disabled) { background: var(--blue-deep); }
        .btn-go:disabled { background: var(--border); color: var(--text3); cursor: not-allowed; }

        /* MESSAGES */
        .msg-error, .msg-warn { padding: 14px 18px; border-radius: 9px; font-size: 13.5px; line-height: 1.6; }
        .msg-error { background: var(--red-dim); color: var(--red); border: 1px solid var(--red); }
        .msg-warn { background: #FEF6E0; color: #6F4D00; border: 1px solid #E5C76A; }
        .err-list { margin: 8px 0 0; padding-left: 20px; }
        .err-list li { margin: 2px 0; }
        .err-list code { font-family: var(--mono); font-size: 12px; font-weight: 600; }

        /* SUMMARY STATS */
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
        .stat { background: var(--bg); border-radius: 8px; padding: 14px 16px; }
        .stat-label { font-size: 10.5px; font-weight: 600; letter-spacing: 0.7px; text-transform: uppercase; color: var(--text3); margin-bottom: 7px; }
        .stat-value { font-size: 26px; font-weight: 500; font-family: var(--mono); color: var(--text); }
        .stat-sub { font-size: 11.5px; color: var(--text3); margin-top: 3px; font-family: var(--mono); }

        /* VOL TABLE */
        .vol-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        .vol-table th, .vol-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border); }
        .vol-table th { font-weight: 500; font-size: 10.5px; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text3); }
        .vol-table tr:last-child td { border-bottom: none; }
        .vol-table td.num { font-family: var(--mono); text-align: right; }
        .vol-table td.bold { font-weight: 600; color: var(--text); }
        .vol-table td.muted { color: var(--text3); }
        .pill { display: inline-block; padding: 3px 9px; background: var(--blue-dim); color: var(--blue); font-family: var(--mono); font-size: 12px; font-weight: 700; border-radius: 4px; letter-spacing: 0.3px; }

        /* CORRELATION MATRIX */
        .corr-wrap { overflow-x: auto; }
        .corr-table { border-collapse: separate; border-spacing: 2px; margin: 0 auto; }
        .corr-cell, .corr-head { padding: 10px 10px; text-align: center; font-family: var(--mono); font-size: 12.5px; border-radius: 4px; min-width: 62px; }
        .corr-head { font-weight: 600; font-size: 11px; color: var(--text3); letter-spacing: 0.4px; background: transparent; }
        .corr-head.row { text-align: right; padding-right: 14px; }
        .corr-cell.diag { background: var(--bg); color: var(--text3); }
        .legend { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; margin-top: 16px; font-size: 11px; color: var(--text3); }
        .lg-item { display: inline-flex; align-items: center; gap: 5px; }
        .lg-sw { display: inline-block; width: 14px; height: 14px; border-radius: 3px; }

        /* METHOD */
        .card.method p { font-size: 13.5px; color: var(--text2); line-height: 1.7; margin: 0; }
        .card.method p + p { margin-top: 10px; }
        .method-secondary { color: var(--text3) !important; font-size: 12.5px !important; }
        .card.method code { font-family: var(--mono); font-size: 12.5px; color: var(--blue); background: var(--blue-dim); padding: 1px 5px; border-radius: 3px; }

        /* FOOTER */
        .ft { border-top: 1px solid var(--border); background: var(--surface); padding: 28px 0; margin-top: 64px; }
        .ft-inner { max-width: var(--col); margin: 0 auto; padding: 0 var(--pad); display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text3); }
        .ft-disc { font-style: italic; }

        @media (max-width: 700px) {
          .hd-nav { gap: 12px; font-size: 12px; overflow-x: auto; }
          .hd-link { font-size: 12px; white-space: nowrap; }
          .page-h { font-size: 32px; }
          .card { padding: 18px 16px; }
          .date-row { flex-direction: column; gap: 10px; }
          .stat-grid { grid-template-columns: 1fr 1fr; }
          .ft-inner { flex-direction: column; gap: 8px; text-align: center; }
        }
      `}</style>
    </>
  );
}
