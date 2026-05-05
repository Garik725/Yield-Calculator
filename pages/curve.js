// pages/curve.js
// Module 04 · The Curve · US Treasury yield curve & bond ETFs
// Self-contained, matches new landing page design.

import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

const CURVES = {
  today: { '1M': 5.32, '3M': 5.18, '6M': 4.95, '1Y': 4.68, '2Y': 4.42, '3Y': 4.28, '5Y': 4.15, '7Y': 4.22, '10Y': 4.25, '20Y': 4.48, '30Y': 4.52 },
  week:  { '1M': 5.34, '3M': 5.20, '6M': 4.97, '1Y': 4.72, '2Y': 4.48, '3Y': 4.32, '5Y': 4.18, '7Y': 4.24, '10Y': 4.28, '20Y': 4.50, '30Y': 4.54 },
  year:  { '1M': 5.10, '3M': 4.98, '6M': 4.82, '1Y': 4.70, '2Y': 4.55, '3Y': 4.42, '5Y': 4.28, '7Y': 4.25, '10Y': 4.30, '20Y': 4.48, '30Y': 4.52 },
};

const TENORS = ['1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y'];
const TENOR_X = { '1M': 80, '3M': 164, '6M': 237, '1Y': 325, '2Y': 437, '3Y': 513, '5Y': 619, '7Y': 706, '10Y': 801, '20Y': 945, '30Y': 1060 };

const ETFS = [
  { sym: 'TLT', name: '20+ Year Treasury',         price: 88.42,  chg: 0.36,  ytd: -2.1, dur: 16.8, yld: 4.48, er: 0.15 },
  { sym: 'IEF', name: '7-10 Year Treasury',        price: 94.18,  chg: 0.12,  ytd: -0.4, dur: 7.9,  yld: 4.22, er: 0.15 },
  { sym: 'SHY', name: '1-3 Year Treasury',         price: 82.15,  chg: 0.02,  ytd:  1.8, dur: 1.9,  yld: 4.55, er: 0.15 },
  { sym: 'LQD', name: 'Investment-Grade Corporate',price: 107.25, chg: -0.08, ytd: -1.2, dur: 8.3,  yld: 5.12, er: 0.14 },
  { sym: 'HYG', name: 'High-Yield Corporate',      price: 76.90,  chg: 0.15,  ytd:  2.4, dur: 3.4,  yld: 7.18, er: 0.48 },
  { sym: 'AGG', name: 'Aggregate Bond',            price: 97.32,  chg: 0.05,  ytd: -0.6, dur: 6.1,  yld: 4.38, er: 0.03 },
];

const yOf = (v) => 30 + (5.40 - v) / 1.60 * 310;
const makePoints = (curve) => TENORS.map(t => `${TENOR_X[t]},${yOf(curve[t]).toFixed(2)}`).join(' ');
const makeAreaPath = (curve) => {
  const pts = TENORS.map(t => `${TENOR_X[t]},${yOf(curve[t]).toFixed(2)}`);
  return `M ${pts.join(' L ')} L 1060,340 L 80,340 Z`;
};

export default function Curve() {
  const [showWeek, setShowWeek] = useState(true);
  const [showYear, setShowYear] = useState(true);
  const [view, setView] = useState('treasury');

  const t = CURVES.today;
  const spreads = {
    s2s10s: (t['10Y'] - t['2Y']) * 100,
    s3m10y: (t['10Y'] - t['3M']) * 100,
    slope:  (t['30Y'] - t['3M']) * 100,
  };
  const shape = spreads.s2s10s < -5 ? 'Inverted' : spreads.s2s10s < 5 ? 'Flat' : spreads.s2s10s < 50 ? 'Normal' : 'Steep';
  const todayDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <>
      <Head>
        <title>Yield Curve & ETFs · Yield Calculator</title>
        <meta name="description" content="US Treasury constant-maturity yield curve and major bond ETF coverage." />
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
            <Link href="/curve" className="hd-link active">Yield Curve</Link>
          </nav>
        </div>
      </header>

      <main className="page">
        <div className="page-inner">
          <div className="page-head">
            <div className="eyebrow">Module № 04</div>
            <h1 className="page-h">The <em>Curve.</em></h1>
            <p className="page-lede">
              The US Treasury constant-maturity curve and the major bond ETFs · together in one view. Eleven tenors from one-month bills to thirty-year bonds, with historical overlays and spread summaries. Below, the six ETFs most commonly used as curve proxies.
            </p>
          </div>

          <div className="view-switch">
            <button className={view === 'treasury' ? 'on' : ''} onClick={() => setView('treasury')}>US Treasury Curve</button>
            <button className={view === 'etf' ? 'on' : ''} onClick={() => setView('etf')}>Bond ETFs</button>
          </div>

          {view === 'treasury' && (
            <>
              <div className="curve-card">
                <div className="curve-card-hd">
                  <div>
                    <div className="curve-title">US Treasury Constant-Maturity Curve</div>
                    <div className="curve-sub">{todayDate} · end-of-day · source EODHD (demo data)</div>
                  </div>
                  <div className="overlay-controls">
                    <label>
                      <input type="checkbox" checked={showWeek} onChange={e => setShowWeek(e.target.checked)} />
                      <span className="ll dashed"></span>1 week ago
                    </label>
                    <label>
                      <input type="checkbox" checked={showYear} onChange={e => setShowYear(e.target.checked)} />
                      <span className="ll dotted"></span>1 year ago
                    </label>
                  </div>
                </div>

                <svg className="curve-svg" viewBox="0 0 1100 420" preserveAspectRatio="xMidYMid meet" role="img">
                  <defs>
                    <linearGradient id="emeraldFill2" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#214B3D" stopOpacity="0.10" />
                      <stop offset="100%" stopColor="#214B3D" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <g stroke="#DDD5BF" strokeWidth="0.5" fontFamily="Inter" fontSize="10" fill="#8E8A82">
                    {[5.40, 5.00, 4.60, 4.20, 3.80].map((v, i) => (
                      <g key={v}>
                        <line x1="80" y1={yOf(v)} x2="1060" y2={yOf(v)} strokeDasharray={i === 0 || i === 4 ? null : '2 3'} />
                        <text x="70" y={yOf(v) + 4} textAnchor="end">{v.toFixed(2)}</text>
                      </g>
                    ))}
                  </g>

                  <g fontFamily="JetBrains Mono" fontSize="10.5" fill="#6B6760" textAnchor="middle">
                    {TENORS.map(tn => <text key={tn} x={TENOR_X[tn]} y="365">{tn}</text>)}
                  </g>
                  <text x="30" y="185" fontFamily="Inter" fontSize="10" fill="#8E8A82" transform="rotate(-90 30 185)" textAnchor="middle" letterSpacing="1.4">YIELD (%)</text>

                  {showYear && (
                    <polyline points={makePoints(CURVES.year)} fill="none" stroke="#8E8A82" strokeWidth="1.4" strokeDasharray="1.5 3" opacity="0.65" />
                  )}
                  {showWeek && (
                    <polyline points={makePoints(CURVES.week)} fill="none" stroke="#9D7E3E" strokeWidth="1.7" strokeDasharray="5 4" opacity="0.85" />
                  )}

                  <path d={makeAreaPath(CURVES.today)} fill="url(#emeraldFill2)" />
                  <polyline points={makePoints(CURVES.today)} fill="none" stroke="#214B3D" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />

                  <g fill="#214B3D">
                    {TENORS.map(tn => <circle key={tn} cx={TENOR_X[tn]} cy={yOf(t[tn])} r="4" />)}
                  </g>
                  <g fill="#F8F4EA" stroke="#214B3D" strokeWidth="1.6">
                    <circle cx={TENOR_X['5Y']} cy={yOf(t['5Y'])} r="6" />
                    <circle cx={TENOR_X['10Y']} cy={yOf(t['10Y'])} r="6" />
                  </g>

                  <g fontFamily="JetBrains Mono" fontSize="11" fontWeight="600" fill="#1A1815">
                    <text x={TENOR_X['1M']} y="13" textAnchor="middle">{t['1M'].toFixed(2)}</text>
                    <text x={TENOR_X['5Y']} y={yOf(t['5Y']) + 17} textAnchor="middle" fill="#214B3D">{t['5Y'].toFixed(2)}</text>
                    <text x={TENOR_X['30Y']} y={yOf(t['30Y']) - 11} textAnchor="middle">{t['30Y'].toFixed(2)}</text>
                  </g>

                  {t['1M'] > t['2Y'] && (
                    <g>
                      <rect x="80" y="30" width={TENOR_X['2Y'] - 80} height={yOf(t['2Y']) - 30} fill="#214B3D" opacity="0.04" />
                      <line x1="80" y1={yOf(t['2Y'])} x2={TENOR_X['2Y']} y2={yOf(t['2Y'])} stroke="#214B3D" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.5" />
                      <text x={(80 + TENOR_X['2Y']) / 2} y="52" fontFamily="Inter" fontSize="10" fontWeight="600" fill="#214B3D" textAnchor="middle" letterSpacing="1.4">INVERSION · SHORT-END ABOVE 2Y</text>
                    </g>
                  )}

                  <g fontFamily="Fraunces" fontStyle="italic" fontSize="11" fill="#6B6760">
                    <line x1={TENOR_X['5Y']} y1={yOf(t['5Y']) + 10} x2={TENOR_X['5Y']} y2={yOf(t['5Y']) + 32} stroke="#8E8A82" strokeWidth="0.6" />
                    <text x={TENOR_X['5Y']} y={yOf(t['5Y']) + 48} textAnchor="middle">trough · the belly</text>
                  </g>
                </svg>

                <div className="stats">
                  <div className="stat">
                    <div className="stat-l">2s10s Spread</div>
                    <div className={`stat-v ${spreads.s2s10s < 0 ? 'neg' : 'pos'}`}>
                      {spreads.s2s10s > 0 ? '+' : ''}{spreads.s2s10s.toFixed(0)} bp
                    </div>
                    <div className="stat-m">10Y {t['10Y'].toFixed(2)} − 2Y {t['2Y'].toFixed(2)}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-l">3m10y Spread</div>
                    <div className={`stat-v ${spreads.s3m10y < 0 ? 'neg' : 'pos'}`}>
                      {spreads.s3m10y > 0 ? '+' : ''}{spreads.s3m10y.toFixed(0)} bp
                    </div>
                    <div className="stat-m">{spreads.s3m10y < 0 ? 'inverted' : 'positive'}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-l">Curve Slope</div>
                    <div className={`stat-v ${spreads.slope < 0 ? 'neg' : 'pos'}`}>
                      {spreads.slope > 0 ? '+' : ''}{spreads.slope.toFixed(0)} bp
                    </div>
                    <div className="stat-m">30Y − 3M</div>
                  </div>
                  <div className="stat">
                    <div className="stat-l">Shape</div>
                    <div className={`stat-v ${shape === 'Inverted' ? 'neg' : 'acc'}`}>{shape}</div>
                    <div className="stat-m">{shape === 'Inverted' ? 'recession signal' : shape === 'Normal' ? 'healthy' : shape === 'Steep' ? 'growth' : 'transitioning'}</div>
                  </div>
                </div>
              </div>

              <div className="tenor-table">
                <div className="tt-h">Individual Tenors</div>
                <div className="tt-grid">
                  <div className="tt-row tt-head">
                    <div>Tenor</div>
                    <div>Yield</div>
                    <div className="r">1W Chg (bp)</div>
                    <div className="r">1Y Chg (bp)</div>
                  </div>
                  {TENORS.map(tn => {
                    const val = CURVES.today[tn];
                    const wChg = (val - CURVES.week[tn]) * 100;
                    const yChg = (val - CURVES.year[tn]) * 100;
                    return (
                      <div key={tn} className="tt-row">
                        <div className="tt-tn">{tn}</div>
                        <div className="tt-val">{val.toFixed(2)}%</div>
                        <div className={`tt-meta r ${wChg < 0 ? 'neg' : wChg > 0 ? 'pos' : ''}`}>{wChg > 0 ? '+' : ''}{wChg.toFixed(1)}</div>
                        <div className={`tt-meta r ${yChg < 0 ? 'neg' : yChg > 0 ? 'pos' : ''}`}>{yChg > 0 ? '+' : ''}{yChg.toFixed(1)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {view === 'etf' && (
            <div className="etf-panel">
              <div className="etf-hd">
                <div className="etf-title">Major Bond ETFs</div>
                <div className="etf-sub">The six most-traded bond-market proxies · end-of-day · source EODHD (demo data)</div>
              </div>
              <div className="etf-grid">
                {ETFS.map(e => (
                  <div key={e.sym} className="etf-card">
                    <div className="etf-card-top">
                      <div>
                        <div className="etf-sym">{e.sym}</div>
                        <div className="etf-name">{e.name}</div>
                      </div>
                      <div className="etf-price-box">
                        <div className="etf-price">${e.price.toFixed(2)}</div>
                        <div className={`etf-chg ${e.chg >= 0 ? 'pos' : 'neg'}`}>{e.chg >= 0 ? '+' : ''}{e.chg.toFixed(2)}</div>
                      </div>
                    </div>
                    <MiniSpark up={e.chg >= 0} />
                    <div className="etf-stats">
                      <div><span>YTD</span><b className={e.ytd >= 0 ? 'pos' : 'neg'}>{e.ytd >= 0 ? '+' : ''}{e.ytd.toFixed(1)}%</b></div>
                      <div><span>Duration</span><b>{e.dur.toFixed(1)}y</b></div>
                      <div><span>Yield</span><b>{e.yld.toFixed(2)}%</b></div>
                      <div><span>Expense</span><b>{e.er.toFixed(2)}%</b></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="ft">
        <div className="ft-inner">
          <div>© 2026 Yield Calculator · <Link href="/">Home</Link> · <a href="mailto:hello@yieldcalculator.tech">Contact</a></div>
          <div className="ft-disc">Demo data shown. Live EODHD integration available on launch.</div>
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
        .hd-nav { flex: 1; display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; }
        .hd-link { padding: 8px 4px; font-family: var(--sans); font-size: 13.5px; font-weight: 500; color: var(--ink-3); border-bottom: 2px solid transparent; transition: color .15s, border-color .15s; white-space: nowrap; }
        .hd-link:hover { color: var(--ink); }
        .hd-link.active { color: var(--accent); border-bottom-color: var(--accent); }
        .hd-back { font-family: var(--sans); font-size: 13px; font-weight: 500; color: var(--ink-3); transition: color .15s; }
        .hd-back:hover { color: var(--accent); }

        /* ── NAV MENU DROPDOWN ── */

        /* PAGE */
        .page { padding: clamp(40px, 6vw, 72px) 0 80px; min-height: calc(100vh - 200px); }
        .page-inner { max-width: var(--col); margin: 0 auto; padding: 0 var(--pad); }
        .page-head { margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px solid var(--rule); }
        .eyebrow { font-family: var(--sans); font-weight: 600; font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; display: flex; align-items: center; gap: 12px; }
        .eyebrow::before { content: ""; width: 28px; height: 1px; background: var(--accent); }
        .page-h { font-family: var(--display); font-weight: 500; font-size: clamp(38px, 5.5vw, 64px); line-height: 1; letter-spacing: -.022em; margin-bottom: 14px; font-variation-settings: "opsz" 72; }
        .page-h :global(em) { font-style: italic; font-weight: 400; color: var(--accent); font-variation-settings: "opsz" 72; }
        .page-lede { font-family: var(--sans); font-size: 16px; line-height: 1.6; color: var(--ink-2); max-width: 720px; }

        /* VIEW SWITCH */
        .view-switch { display: flex; gap: 0; margin-bottom: 24px; border-bottom: 1px solid var(--rule); }
        .view-switch button { padding: 12px 24px; font-family: var(--sans); font-size: 13px; font-weight: 500; letter-spacing: .02em; color: var(--ink-3); transition: all .15s; border-bottom: 2px solid transparent; margin-bottom: -1px; }
        .view-switch button:hover { color: var(--ink); }
        .view-switch button.on { color: var(--accent); border-bottom-color: var(--accent); }

        /* CURVE CARD */
        .curve-card { background: var(--paper-2); border: 1px solid var(--rule); padding: 28px 32px 32px; margin-bottom: 24px; }
        .curve-card-hd { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 18px; border-bottom: 1px solid var(--rule); margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .curve-title { font-family: var(--display); font-weight: 500; font-size: 22px; letter-spacing: -.015em; font-variation-settings: "opsz" 24; }
        .curve-sub { font-family: var(--mono); font-size: 11px; color: var(--ink-3); margin-top: 4px; }
        .overlay-controls { display: flex; gap: 18px; flex-wrap: wrap; }
        .overlay-controls label { display: flex; align-items: center; gap: 8px; font-family: var(--sans); font-size: 12px; color: var(--ink-2); font-weight: 500; cursor: pointer; user-select: none; }
        .overlay-controls input { cursor: pointer; }
        .ll { width: 18px; height: 0; }
        .ll.dashed { border-top: 2px dashed var(--gold); }
        .ll.dotted { border-top: 2px dotted var(--ink-3); }
        .curve-svg { width: 100%; height: auto; display: block; }

        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--rule); border: 1px solid var(--rule); margin-top: 24px; }
        .stat { background: var(--paper-2); padding: 16px 18px; }
        .stat-l { font-family: var(--sans); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; margin-bottom: 6px; }
        .stat-v { font-family: var(--display); font-weight: 600; font-size: 22px; letter-spacing: -.015em; font-variation-settings: "opsz" 28; }
        .stat-v.neg { color: var(--bear); }
        .stat-v.pos { color: var(--bull); }
        .stat-v.acc { color: var(--accent); }
        .stat-m { font-family: var(--mono); font-size: 10.5px; color: var(--ink-3); margin-top: 3px; }

        /* TENOR TABLE */
        .tenor-table { background: var(--paper-2); border: 1px solid var(--rule); }
        .tt-h { padding: 16px 22px; font-family: var(--sans); font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; border-bottom: 1px solid var(--rule); }
        .tt-grid { display: flex; flex-direction: column; }
        .tt-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; padding: 11px 22px; border-bottom: 1px solid var(--rule); font-size: 13.5px; align-items: center; }
        .tt-row:last-child { border-bottom: none; }
        .tt-row.tt-head { font-family: var(--sans); font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; background: var(--paper-3); border-bottom: 2px solid var(--ink); }
        .tt-tn { font-family: var(--mono); font-weight: 600; color: var(--ink); }
        .tt-val { font-family: var(--mono); font-weight: 600; color: var(--ink); }
        .tt-meta { font-family: var(--mono); color: var(--ink-3); }
        .tt-meta.pos { color: var(--bull); }
        .tt-meta.neg { color: var(--bear); }
        .r { text-align: right; }

        /* ETFS */
        .etf-panel { background: var(--paper-2); border: 1px solid var(--rule); padding: 24px 28px; }
        .etf-hd { padding-bottom: 18px; border-bottom: 1px solid var(--rule); margin-bottom: 24px; }
        .etf-title { font-family: var(--display); font-weight: 500; font-size: 24px; letter-spacing: -.015em; font-variation-settings: "opsz" 28; }
        .etf-sub { font-family: var(--mono); font-size: 11px; color: var(--ink-3); margin-top: 4px; }
        .etf-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .etf-card { background: var(--paper-3); border: 1px solid var(--rule); padding: 18px 20px; }
        .etf-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .etf-sym { font-family: var(--mono); font-weight: 700; font-size: 20px; letter-spacing: .04em; color: var(--ink); }
        .etf-name { font-family: var(--display); font-style: italic; font-size: 12.5px; color: var(--ink-3); margin-top: 2px; font-variation-settings: "opsz" 14; }
        .etf-price-box { text-align: right; }
        .etf-price { font-family: var(--display); font-weight: 600; font-size: 22px; letter-spacing: -.015em; font-variation-settings: "opsz" 28; }
        .etf-chg { font-family: var(--mono); font-size: 12px; font-weight: 600; }
        .etf-chg.pos { color: var(--bull); }
        .etf-chg.neg { color: var(--bear); }
        .etf-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--rule); }
        .etf-stats > div { display: flex; justify-content: space-between; font-size: 12.5px; padding: 3px 0; }
        .etf-stats span { font-family: var(--sans); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; }
        .etf-stats b { font-family: var(--mono); font-weight: 600; color: var(--ink); }
        .etf-stats b.pos { color: var(--bull); }
        .etf-stats b.neg { color: var(--bear); }

        /* FOOTER */
        .ft { background: var(--ink); color: var(--paper); padding: 28px var(--pad); }
        .ft-inner { max-width: var(--col); margin: 0 auto; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; font-family: var(--sans); font-size: 12px; color: rgba(248,244,234,.6); }
        .ft :global(a) { color: rgba(248,244,234,.85); transition: color .15s; }
        .ft :global(a:hover) { color: var(--accent-2); }
        .ft-disc { font-style: italic; opacity: .7; }

        @media (max-width: 960px) {
          .hd-inner { gap: 16px; }
          .hd-nav { gap: 18px; }
          .hd-link { font-size: 12.5px; }
          .hd-back { display: none; }
          .stats { grid-template-columns: 1fr 1fr; }
          .etf-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 720px) {
          .hd-name { display: none; }
          .hd-nav { gap: 14px; }
          .hd-link { font-size: 12px; }
        }
        @media (max-width: 560px) {
          .etf-grid { grid-template-columns: 1fr; }
          .hd-nav { gap: 12px; }
          .hd-link { font-size: 11.5px; }
        }
      `}</style>
    </>
  );
}

function MiniSpark({ up }) {
  const pts = [];
  let y = 20;
  for (let i = 0; i <= 14; i++) {
    y += (Math.random() - 0.5) * 5 + (up ? -0.8 : 0.8);
    y = Math.max(4, Math.min(36, y));
    pts.push(`${i * 14},${y.toFixed(1)}`);
  }
  const color = up ? '#1F5E40' : '#A33D2E';
  return (
    <svg viewBox="0 0 200 40" style={{ width: '100%', height: 40, marginTop: 6 }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
