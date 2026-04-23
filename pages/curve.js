// pages/curve.js
// US Treasury Yield Curve Viewer with historical overlays and ETF context
// Per BRD Feature 4

import { useState } from 'react';
import AppShell from '../components/AppShell';

// Hardcoded demo curve data (would come from /api/curve/us in production)
const CURVES = {
  today: { '1M': 5.32, '3M': 5.18, '6M': 4.95, '1Y': 4.68, '2Y': 4.42, '3Y': 4.28, '5Y': 4.15, '7Y': 4.22, '10Y': 4.25, '20Y': 4.48, '30Y': 4.52 },
  week:  { '1M': 5.34, '3M': 5.20, '6M': 4.97, '1Y': 4.72, '2Y': 4.48, '3Y': 4.32, '5Y': 4.18, '7Y': 4.24, '10Y': 4.28, '20Y': 4.50, '30Y': 4.54 },
  year:  { '1M': 5.10, '3M': 4.98, '6M': 4.82, '1Y': 4.70, '2Y': 4.55, '3Y': 4.42, '5Y': 4.28, '7Y': 4.25, '10Y': 4.30, '20Y': 4.48, '30Y': 4.52 },
};

const TENORS = ['1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y'];
const TENOR_X = { '1M': 80, '3M': 164, '6M': 237, '1Y': 325, '2Y': 437, '3Y': 513, '5Y': 619, '7Y': 706, '10Y': 801, '20Y': 945, '30Y': 1060 };

// ETF data
const ETFS = [
  { sym: 'TLT',  name: '20+ Year Treasury',         price: 88.42,  chg: 0.36, ytd: -2.1, dur: 16.8, yld: 4.48, er: 0.15 },
  { sym: 'IEF',  name: '7-10 Year Treasury',        price: 94.18,  chg: 0.12, ytd: -0.4, dur: 7.9,  yld: 4.22, er: 0.15 },
  { sym: 'SHY',  name: '1-3 Year Treasury',         price: 82.15,  chg: 0.02, ytd:  1.8, dur: 1.9,  yld: 4.55, er: 0.15 },
  { sym: 'LQD',  name: 'Investment-Grade Corporate',price: 107.25, chg: -0.08, ytd: -1.2, dur: 8.3,  yld: 5.12, er: 0.14 },
  { sym: 'HYG',  name: 'High-Yield Corporate',      price: 76.90,  chg: 0.15, ytd:  2.4, dur: 3.4,  yld: 7.18, er: 0.48 },
  { sym: 'AGG',  name: 'Aggregate Bond',            price: 97.32,  chg: 0.05, ytd: -0.6, dur: 6.1,  yld: 4.38, er: 0.03 },
];

// Y-axis: 3.80 → 5.40 (1.60 span) maps to 340 → 30 (310px plot height)
const yOf = (v) => 30 + (5.40 - v) / 1.60 * 310;

const makePoints = (curve) => TENORS.map(t => `${TENOR_X[t]},${yOf(curve[t]).toFixed(2)}`).join(' ');

const makeAreaPath = (curve) => {
  const pts = TENORS.map(t => `${TENOR_X[t]},${yOf(curve[t]).toFixed(2)}`);
  return `M ${pts.join(' L ')} L 1060,340 L 80,340 Z`;
};

export default function Curve() {
  const [showWeek, setShowWeek] = useState(true);
  const [showYear, setShowYear] = useState(true);
  const [view, setView] = useState('treasury'); // 'treasury' | 'etf'

  const t = CURVES.today;
  const spreads = {
    s2s10s: (t['10Y'] - t['2Y']) * 100,
    s3m10y: (t['10Y'] - t['3M']) * 100,
    slope: (t['30Y'] - t['3M']) * 100,
  };
  const shape = spreads.s2s10s < -5 ? 'Inverted' : spreads.s2s10s < 5 ? 'Flat' : spreads.s2s10s < 50 ? 'Normal' : 'Steep';

  const todayDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <AppShell title="Yield Curve & ETFs">
      <div className="page-wrap">
        <div className="page-head">
          <div className="page-kicker">Module № 04</div>
          <h1 className="page-title">The <em>Curve.</em></h1>
          <p className="page-intro">
            The US Treasury constant-maturity curve and the major bond ETFs — together in one view. Eleven tenors from one-month bills to thirty-year bonds, with historical overlays and spread summaries. Below, the six ETFs most commonly used as curve proxies.
          </p>
        </div>

        <div className="view-switch">
          <button className={view === 'treasury' ? 'on' : ''} onClick={() => setView('treasury')}>US Treasury Curve</button>
          <button className={view === 'etf' ? 'on' : ''} onClick={() => setView('etf')}>Bond ETFs</button>
        </div>

        {view === 'treasury' && (
          <>
            <div className="curve-panel">
              <div className="curve-panel-hd">
                <div>
                  <div className="curve-panel-title">US Treasury Constant-Maturity Curve</div>
                  <div className="curve-panel-sub">{todayDate} · end-of-day · source EODHD (demo data)</div>
                </div>
                <div className="overlay-controls">
                  <label className="overlay-toggle">
                    <input type="checkbox" checked={showWeek} onChange={e => setShowWeek(e.target.checked)} />
                    <span className="line-preview dashed"></span>
                    1 week ago
                  </label>
                  <label className="overlay-toggle">
                    <input type="checkbox" checked={showYear} onChange={e => setShowYear(e.target.checked)} />
                    <span className="line-preview dotted"></span>
                    1 year ago
                  </label>
                </div>
              </div>

              <svg className="curve-chart" viewBox="0 0 1100 420" preserveAspectRatio="xMidYMid meet" role="img">
                <defs>
                  <linearGradient id="fillGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#A11E22" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#A11E22" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                <g stroke="#D6CFC0" strokeWidth="0.5" fontFamily="Libre Franklin" fontSize="10" fill="#767676">
                  {[5.40, 5.00, 4.60, 4.20, 3.80].map((v, i) => (
                    <g key={v}>
                      <line x1="80" y1={yOf(v)} x2="1060" y2={yOf(v)} strokeDasharray={i === 0 || i === 4 ? null : '2 3'} />
                      <text x="70" y={yOf(v) + 4} textAnchor="end">{v.toFixed(2)}</text>
                    </g>
                  ))}
                </g>

                {/* Tenor labels */}
                <g fontFamily="JetBrains Mono" fontSize="10.5" fill="#555555" textAnchor="middle">
                  {TENORS.map(tn => <text key={tn} x={TENOR_X[tn]} y="365">{tn}</text>)}
                </g>
                <text x="30" y="185" fontFamily="Libre Franklin" fontSize="10" fill="#767676" transform="rotate(-90 30 185)" textAnchor="middle" letterSpacing="1.2">YIELD (%)</text>
                <text x="570" y="395" fontFamily="Libre Franklin" fontSize="10" fill="#767676" textAnchor="middle" letterSpacing="1.2">TENOR</text>

                {/* Year overlay */}
                {showYear && (
                  <polyline points={makePoints(CURVES.year)} fill="none" stroke="#767676" strokeWidth="1.4" strokeDasharray="1.5 3" opacity="0.75" />
                )}

                {/* Week overlay */}
                {showWeek && (
                  <polyline points={makePoints(CURVES.week)} fill="none" stroke="#946B0F" strokeWidth="1.8" strokeDasharray="5 4" opacity="0.85" />
                )}

                {/* Today filled area */}
                <path d={makeAreaPath(CURVES.today)} fill="url(#fillGrad)" />

                {/* Today line */}
                <polyline points={makePoints(CURVES.today)} fill="none" stroke="#A11E22" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />

                {/* Data points */}
                <g fill="#A11E22">
                  {TENORS.map(tn => <circle key={tn} cx={TENOR_X[tn]} cy={yOf(t[tn])} r="4" />)}
                </g>

                {/* Highlighted points: 5Y (trough) and 10Y (benchmark) */}
                <g fill="#F7F5EF" stroke="#A11E22" strokeWidth="1.6">
                  <circle cx={TENOR_X['5Y']} cy={yOf(t['5Y'])} r="6" />
                  <circle cx={TENOR_X['10Y']} cy={yOf(t['10Y'])} r="6" />
                </g>

                {/* Value labels */}
                <g fontFamily="JetBrains Mono" fontSize="11" fontWeight="600" fill="#121212">
                  <text x={TENOR_X['1M']} y="13" textAnchor="middle">{t['1M'].toFixed(2)}</text>
                  <text x={TENOR_X['5Y']} y={yOf(t['5Y']) + 17} textAnchor="middle" fill="#A11E22">{t['5Y'].toFixed(2)}</text>
                  <text x={TENOR_X['30Y']} y={yOf(t['30Y']) - 11} textAnchor="middle">{t['30Y'].toFixed(2)}</text>
                </g>

                {/* Inversion indicator (short-end above 2Y) */}
                {t['1M'] > t['2Y'] && (
                  <g>
                    <rect x="80" y="30" width={TENOR_X['2Y'] - 80} height={yOf(t['2Y']) - 30} fill="#A11E22" opacity="0.04" />
                    <line x1="80" y1={yOf(t['2Y'])} x2={TENOR_X['2Y']} y2={yOf(t['2Y'])} stroke="#A11E22" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.6" />
                    <text x={(80 + TENOR_X['2Y']) / 2} y="52" fontFamily="Libre Franklin" fontSize="10" fontWeight="600" fill="#A11E22" textAnchor="middle" letterSpacing="1.5">INVERSION · SHORT-END ABOVE 2Y</text>
                  </g>
                )}

                {/* Trough annotation */}
                <g fontFamily="Source Serif 4" fontStyle="italic" fontSize="11" fill="#555555">
                  <line x1={TENOR_X['5Y']} y1={yOf(t['5Y']) + 10} x2={TENOR_X['5Y']} y2={yOf(t['5Y']) + 32} stroke="#767676" strokeWidth="0.6" />
                  <text x={TENOR_X['5Y']} y={yOf(t['5Y']) + 48} textAnchor="middle">trough · the belly</text>
                </g>
              </svg>

              <div className="curve-stats">
                <div className="curve-stat">
                  <div className="curve-stat-label">2s10s Spread</div>
                  <div className={`curve-stat-val ${spreads.s2s10s < 0 ? 'neg' : 'pos'}`}>
                    {spreads.s2s10s > 0 ? '+' : ''}{spreads.s2s10s.toFixed(0)} bp
                  </div>
                  <div className="curve-stat-meta">10Y {t['10Y'].toFixed(2)} − 2Y {t['2Y'].toFixed(2)}</div>
                </div>
                <div className="curve-stat">
                  <div className="curve-stat-label">3m10y Spread</div>
                  <div className={`curve-stat-val ${spreads.s3m10y < 0 ? 'neg' : 'pos'}`}>
                    {spreads.s3m10y > 0 ? '+' : ''}{spreads.s3m10y.toFixed(0)} bp
                  </div>
                  <div className="curve-stat-meta">{spreads.s3m10y < 0 ? 'inverted' : 'positive'}</div>
                </div>
                <div className="curve-stat">
                  <div className="curve-stat-label">Curve Slope</div>
                  <div className={`curve-stat-val ${spreads.slope < 0 ? 'neg' : 'pos'}`}>
                    {spreads.slope > 0 ? '+' : ''}{spreads.slope.toFixed(0)} bp
                  </div>
                  <div className="curve-stat-meta">30Y − 3M</div>
                </div>
                <div className="curve-stat">
                  <div className="curve-stat-label">Shape</div>
                  <div className={`curve-stat-val ${shape === 'Inverted' ? 'neg' : 'pos'}`}>{shape}</div>
                  <div className="curve-stat-meta">{shape === 'Inverted' ? 'recession signal' : shape === 'Normal' ? 'healthy economy' : shape === 'Steep' ? 'growth expected' : 'transitioning'}</div>
                </div>
              </div>
            </div>

            <div className="tenor-table">
              <div className="tt-title">Individual Tenors</div>
              <div className="tt-grid">
                <div className="tt-row tt-head">
                  <div>Tenor</div>
                  <div>Yield</div>
                  <div>1D Chg (bp)</div>
                  <div>1W Chg (bp)</div>
                  <div>1Y Chg (bp)</div>
                </div>
                {TENORS.map(tn => {
                  const val = CURVES.today[tn];
                  const dChg = (val - CURVES.today[tn]) * 100;
                  const wChg = (val - CURVES.week[tn]) * 100;
                  const yChg = (val - CURVES.year[tn]) * 100;
                  return (
                    <div key={tn} className="tt-row">
                      <div className="tt-tn">{tn}</div>
                      <div className="tt-val">{val.toFixed(2)}%</div>
                      <div className="tt-meta">—</div>
                      <div className={`tt-meta ${wChg < 0 ? 'neg' : wChg > 0 ? 'pos' : ''}`}>{wChg > 0 ? '+' : ''}{wChg.toFixed(1)}</div>
                      <div className={`tt-meta ${yChg < 0 ? 'neg' : yChg > 0 ? 'pos' : ''}`}>{yChg > 0 ? '+' : ''}{yChg.toFixed(1)}</div>
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
              <div className="etf-sub">The six most traded bond-market proxies · end-of-day · source EODHD (demo data)</div>
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

      <style jsx>{`
        .page-wrap { max-width: 1240px; margin: 0 auto; padding: 32px 24px 48px; }
        .page-head { margin-bottom: 28px; }
        .page-kicker { font-family: var(--sans); font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); font-weight: 600; margin-bottom: 10px; }
        .page-title { font-family: var(--display); font-weight: 700; font-size: clamp(36px, 5vw, 56px); line-height: 1; letter-spacing: -0.022em; margin-bottom: 16px; }
        .page-title :global(em) { font-style: italic; color: var(--accent); font-weight: 500; }
        .page-intro { font-family: var(--body); font-size: 17px; color: var(--ink-2); line-height: 1.6; max-width: 780px; }

        .view-switch { display: flex; gap: 2px; margin-bottom: 24px; border-bottom: 2px solid var(--ink); }
        .view-switch button { padding: 12px 24px; font-family: var(--sans); font-size: 12.5px; font-weight: 600; letter-spacing: .04em; color: var(--ink-3); transition: all .15s; border-bottom: 2px solid transparent; margin-bottom: -2px; }
        .view-switch button:hover { color: var(--ink); }
        .view-switch button.on { color: var(--accent); border-bottom-color: var(--accent); }

        .curve-panel { background: var(--paper); border: 1px solid var(--rule); padding: 28px 32px 32px; margin-bottom: 24px; }
        .curve-panel-hd { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 16px; border-bottom: 1px solid var(--rule); margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
        .curve-panel-title { font-family: var(--display); font-weight: 700; font-size: 22px; letter-spacing: -0.015em; }
        .curve-panel-sub { font-family: var(--mono); font-size: 11px; color: var(--ink-3); letter-spacing: .04em; margin-top: 4px; }

        .overlay-controls { display: flex; gap: 18px; flex-wrap: wrap; }
        .overlay-toggle { display: flex; align-items: center; gap: 8px; font-family: var(--sans); font-size: 11.5px; color: var(--ink-2); font-weight: 500; cursor: pointer; user-select: none; }
        .overlay-toggle input { cursor: pointer; }
        .line-preview { width: 18px; height: 0; }
        .line-preview.dashed { border-top: 2px dashed var(--gold); }
        .line-preview.dotted { border-top: 2px dotted var(--ink-3); }

        .curve-chart { width: 100%; height: auto; display: block; }

        .curve-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--rule); margin-top: 24px; border: 1px solid var(--rule); }
        @media (max-width: 700px) { .curve-stats { grid-template-columns: 1fr 1fr; } }
        .curve-stat { background: var(--paper); padding: 16px 18px; }
        .curve-stat-label { font-family: var(--sans); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; margin-bottom: 6px; }
        .curve-stat-val { font-family: var(--display); font-weight: 700; font-size: 22px; letter-spacing: -0.015em; }
        .curve-stat-val.neg { color: var(--accent); }
        .curve-stat-val.pos { color: var(--bull); }
        .curve-stat-meta { font-family: var(--mono); font-size: 10.5px; color: var(--ink-3); margin-top: 3px; }

        .tenor-table { background: var(--paper); border: 1px solid var(--rule); }
        .tt-title { padding: 16px 22px; font-family: var(--sans); font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; border-bottom: 1px solid var(--rule); }
        .tt-grid { display: flex; flex-direction: column; }
        .tt-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr; padding: 10px 22px; border-bottom: 1px solid var(--rule); font-size: 13.5px; }
        .tt-row:last-child { border-bottom: none; }
        .tt-row.tt-head { font-family: var(--sans); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; background: var(--paper-2); }
        .tt-tn { font-family: var(--mono); font-weight: 600; color: var(--ink); }
        .tt-val { font-family: var(--mono); font-weight: 600; color: var(--ink); }
        .tt-meta { font-family: var(--mono); color: var(--ink-3); }
        .tt-meta.pos { color: var(--bull); }
        .tt-meta.neg { color: var(--accent); }

        .etf-panel { background: var(--paper); border: 1px solid var(--rule); padding: 24px 28px; }
        .etf-hd { padding-bottom: 16px; border-bottom: 1px solid var(--rule); margin-bottom: 20px; }
        .etf-title { font-family: var(--display); font-weight: 700; font-size: 24px; letter-spacing: -0.015em; }
        .etf-sub { font-family: var(--mono); font-size: 11px; color: var(--ink-3); margin-top: 4px; }

        .etf-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        @media (max-width: 900px) { .etf-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 560px) { .etf-grid { grid-template-columns: 1fr; } }

        .etf-card { background: var(--paper-2); border: 1px solid var(--rule); padding: 18px 20px; }
        .etf-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .etf-sym { font-family: var(--mono); font-weight: 700; font-size: 20px; letter-spacing: .04em; color: var(--ink); }
        .etf-name { font-family: var(--body); font-size: 12.5px; color: var(--ink-3); font-style: italic; margin-top: 2px; }
        .etf-price-box { text-align: right; }
        .etf-price { font-family: var(--display); font-weight: 700; font-size: 22px; letter-spacing: -0.015em; }
        .etf-chg { font-family: var(--mono); font-size: 12px; font-weight: 600; }
        .etf-chg.pos { color: var(--bull); }
        .etf-chg.neg { color: var(--accent); }

        .etf-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--rule); }
        .etf-stats > div { display: flex; justify-content: space-between; font-size: 12.5px; padding: 3px 0; }
        .etf-stats span { font-family: var(--sans); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; }
        .etf-stats b { font-family: var(--mono); font-weight: 600; color: var(--ink); }
        .etf-stats b.pos { color: var(--bull); }
        .etf-stats b.neg { color: var(--accent); }
      `}</style>
    </AppShell>
  );
}

// Mini sparkline (purely visual)
function MiniSpark({ up }) {
  const pts = [];
  let y = 20;
  for (let i = 0; i <= 14; i++) {
    y += (Math.random() - 0.5) * 5 + (up ? -0.8 : 0.8);
    y = Math.max(4, Math.min(36, y));
    pts.push(`${i * 14},${y.toFixed(1)}`);
  }
  const color = up ? '#0A7A3C' : '#A11E22';
  return (
    <svg viewBox="0 0 200 40" style={{ width: '100%', height: 40, marginTop: 6 }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
