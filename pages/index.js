// pages/index.js
// NYT-inspired editorial landing page. Bloomberg-free.

import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [billing, setBilling] = useState('yearly');
  const [pubDate, setPubDate] = useState('');

  useEffect(() => {
    setPubDate(new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).toUpperCase());
  }, []);

  return (
    <>
      <Head>
        <title>Yield Calculator — Professional Fixed-Income Toolkit</title>
        <meta name="description" content="Bond settlement, round-trip P&L attribution, portfolio analytics, and a live US Treasury curve with major bond ETFs — institutional-grade fixed-income math in a browser tab." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;0,8..60,700;1,8..60,400;1,8..60,500&family=Libre+Franklin:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        :root {
          --paper:#F7F5EF;--paper-2:#F0EDE4;--paper-dim:#E8E4D9;
          --ink:#121212;--ink-2:#333333;--ink-3:#555555;--ink-4:#767676;
          --muted:#8D8A80;--rule:#CFC9BC;--rule-soft:#DDD6C5;
          --accent:#A11E22;--accent-dim:#F3E1E1;
          --bull:#0A7A3C;--bull-dim:#E1ECDE;
          --gold:#946B0F;--gold-dim:#F1E8CE;
          --display:'Playfair Display',Georgia,serif;
          --body:'Source Serif 4',Georgia,serif;
          --sans:'Libre Franklin','Helvetica Neue',sans-serif;
          --mono:'JetBrains Mono',ui-monospace,monospace;
          --col-max:1240px;
          --gutter:clamp(16px,3vw,32px);
        }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
        body{background:var(--paper);color:var(--ink);font-family:var(--body);font-size:17px;line-height:1.55;overflow-x:hidden;font-feature-settings:"kern","liga","onum";}
        a{color:inherit;text-decoration:none;}
        img,svg{max-width:100%;display:block;}
        button{font-family:inherit;border:none;background:none;cursor:pointer;color:inherit;}
        body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;background-image:radial-gradient(circle at 20% 30%,rgba(0,0,0,.02) 0,transparent 60%),radial-gradient(circle at 80% 70%,rgba(0,0,0,.015) 0,transparent 60%);}
      `}</style>

      {/* MASTHEAD */}
      <header className="masthead">
        <div className="masthead-top">
          <div className="edition">VOL. I — NO. 01</div>
          <div className="locale">
            <span>NEW YORK</span><span>LONDON</span><span>HONG KONG</span><span>EST. 2026</span>
          </div>
          <div className="edition">{pubDate}</div>
        </div>
        <div className="masthead-main">
          <div className="mh-left">Fixed Income<br/>Analytics Daily</div>
          <h1 className="mh-title">Yield <i>Calculator</i></h1>
          <div className="mh-right">Price · Yield<br/>Carry · Curve</div>
        </div>
        <nav className="masthead-nav">
          <div className="masthead-nav-inner">
            <div className="nav-primary">
              <a href="#modules">Modules</a>
              <a href="#curve">Yield Curve</a>
              <a href="#engine">Method</a>
              <a href="#compare">Included</a>
              <a href="#pricing">Subscribe</a>
            </div>
            <div className="nav-right">
              <div className="nav-ticker"><span className="dot"></span> UST 10Y · 4.25 · <span style={{color:'var(--bull)'}}>+0.7 bp</span></div>
              <Link href="/calc" className="nav-cta">Open the App</Link>
            </div>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <main className="hero">
        <div className="hero-grid">
          <div>
            <div className="hero-kicker">The Professional Fixed-Income Toolkit</div>
            <h2 className="hero-headline">
              The math<br/>
              of the <em>bond desk,</em><br/>
              <span className="amp">&amp;</span> the clarity<br/>
              of the <em>front page.</em>
            </h2>
            <p className="hero-lede">
              Bond settlement, round-trip P&amp;L attribution, portfolio analytics, and a live yield curve for Treasuries and major ETFs — all running on one shared math engine, accurate to a hundredth of a basis point, and priced for the analyst who writes the ticket.
            </p>
            <div className="hero-cta-row">
              <Link href="/calc" className="btn-primary">Open the App</Link>
              <a href="#engine" className="btn-secondary">Read the Methodology</a>
            </div>
            <div className="hero-proof">
              <div><b>0.0001%</b>Yield tolerance<br/>industry standard</div>
              <div><b>&lt; 50ms</b>Client-side<br/>calculation</div>
              <div><b>$100</b>per year<br/>for the whole platform</div>
            </div>
          </div>

          {/* CONSOLE PREVIEW */}
          <div className="console" aria-hidden="true">
            <div className="console-bar">
              <div className="console-dots"><span/><span/><span/></div>
              <div className="console-title">SETTLEMENT CONSOLE</div>
            </div>
            <div className="c-stamp">LIVE</div>
            <div className="console-body">
              <div className="c-section">Security</div>
              <div className="c-row"><span className="c-label">ISIN</span><span className="c-val">US91282CJM14</span></div>
              <div className="c-row"><span className="c-label">Description</span><span className="c-val">UST 4.25% 02/15/35</span></div>
              <div className="c-row"><span className="c-label">Coupon · Freq</span><span className="c-val">4.250 · Semi</span></div>
              <div className="c-row"><span className="c-label">Day Count</span><span className="c-val">ACT/ACT</span></div>
              <div className="c-section">Trade</div>
              <div className="c-row"><span className="c-label">Settlement</span><span className="c-val">Apr 25, 2026 · T+2</span></div>
              <div className="c-row"><span className="c-label">Face Value</span><span className="c-val">1,000,000</span></div>
              <div className="c-row"><span className="c-label">Yield</span><span className="c-val hl">4.2510 %</span></div>
              <div className="c-row"><span className="c-label">Clean Price</span><span className="c-val">99.9912</span></div>
              <div className="c-row"><span className="c-label">Accrued (69d)</span><span className="c-val">8,047.06</span></div>
              <div className="c-section">Risk</div>
              <div className="c-row"><span className="c-label">Mod Duration</span><span className="c-val">7.312 y</span></div>
              <div className="c-row"><span className="c-label">DV01</span><span className="c-val">$731.16</span></div>
              <div className="c-big">
                <span className="c-big-label">You Pay</span>
                <span className="c-big-val">$1,007,960.54</span>
              </div>
              <div className="c-meta">USD · per dirty price 100.7961</div>
            </div>
          </div>
        </div>
      </main>

      {/* TICKER */}
      <div className="ticker-bar">
        <div className="ticker-track">
          <span><b>UST 3M</b>5.18 <span className="dn">−0.3</span></span>
          <span><b>UST 2Y</b>4.42 <span className="up">+0.9</span></span>
          <span><b>UST 5Y</b>4.15 <span className="up">+0.4</span></span>
          <span><b>UST 10Y</b>4.25 <span className="up">+0.7</span></span>
          <span><b>UST 30Y</b>4.52 <span className="dn">−0.1</span></span>
          <span><b>2s10s</b>−17 bp</span>
          <span><b>TLT</b>88.42 · <span className="up">+0.36</span></span>
          <span><b>IEF</b>94.18 · <span className="up">+0.12</span></span>
          <span><b>LQD</b>107.25 · <span className="dn">−0.08</span></span>
          <span><b>HYG</b>76.90 · <span className="up">+0.15</span></span>
          <span><b>AAPL 27</b>98.82 · <span className="up">+0.04</span></span>
          <span><b>MSFT 52</b>82.40 · <span className="dn">−0.08</span></span>
          <span><b>UST 3M</b>5.18 <span className="dn">−0.3</span></span>
          <span><b>UST 2Y</b>4.42 <span className="up">+0.9</span></span>
          <span><b>UST 10Y</b>4.25 <span className="up">+0.7</span></span>
        </div>
      </div>

      <div className="section-rule">
        <span>Section B</span>
        <span className="edition">The Platform</span>
        <span>Pages B1–B4</span>
      </div>

      {/* MODULES */}
      <section id="modules" className="modules">
        <div className="modules-header">
          <div>
            <div className="modules-kicker">The Four Modules</div>
            <h3 className="modules-headline">One <em>engine.</em><br/>Four workflows.</h3>
          </div>
          <p className="modules-intro">
            Every module runs on the same pure-JavaScript bond-math library. Price a bond in the Calculator, trade it in Revenue, manage it in Portfolio, benchmark it against the Treasury curve or its ETF proxy — without the number ever drifting between screens.
          </p>
        </div>
        <div className="module-grid">
          <Link href="/calc" className="module m1">
            <div className="module-route">/calc</div>
            <div className="module-num">№ 01</div>
            <h4 className="module-title">The <em>Calculator</em></h4>
            <p className="module-body">Enter an ISIN, a price, or a yield. The other side solves instantly. Clean and dirty prices, accrued interest down to the day, modified duration, DV01, and an export-ready settlement ticket.</p>
            <div className="module-specs">
              <span>ISIN lookup</span><span>Newton-Raphson YTM</span><span>ACT/ACT · 30/360</span><span>PDF ticket</span>
            </div>
          </Link>

          <Link href="/revenue" className="module m2">
            <div className="module-route">/revenue</div>
            <div className="module-num">№ 02</div>
            <h4 className="module-title">The <em>Round-Trip</em></h4>
            <p className="module-body">Total return, attributed. Enter a buy, a sell, two settlement dates — receive the gain split between carry and market move. The repriced-entry method, not a naive cash difference.</p>
            <div className="module-specs">
              <span>Carry decomp</span><span>Market-move</span><span>Coupon accounting</span><span>Hold-period return</span>
            </div>
          </Link>

          <Link href="/portfolio" className="module m3">
            <div className="module-route">/portfolio</div>
            <div className="module-num">№ 03</div>
            <h4 className="module-title">The <em>Book</em></h4>
            <p className="module-body">A working portfolio, stored in your browser. Add positions by ISIN or manual entry. Weighted yield, weighted duration, aggregate DV01, and a maturity ladder. Import/export as JSON.</p>
            <div className="module-specs">
              <span>Weighted YTM</span><span>Aggregate DV01</span><span>Maturity ladder</span><span>LocalStorage</span>
            </div>
          </Link>

          <Link href="/curve" className="module m4">
            <div className="module-route">/curve</div>
            <div className="module-num">№ 04</div>
            <h4 className="module-title">The <em>Curve</em></h4>
            <p className="module-body">The US Treasury constant-maturity curve — today, yesterday, a week ago, a year ago — overlaid and annotated. Plus live charts for the major bond ETFs: TLT, IEF, SHY, LQD, HYG, AGG.</p>
            <div className="module-specs">
              <span>1M → 30Y</span><span>Historical overlay</span><span>ETF pricing</span><span>Inversion flags</span>
            </div>
          </Link>
        </div>
      </section>

      {/* CURVE SHOWCASE */}
      <section id="curve" className="curve-showcase">
        <div className="curve-showcase-inner">
          <div className="curve-header">
            <div>
              <div className="curve-kicker">Module Four · The Curve</div>
              <h3 className="curve-headline">The shape<br/>of <em>money</em>, right now.</h3>
            </div>
            <p className="curve-intro">
              Eleven tenors from one-month bills to thirty-year bonds, rendered live with historical overlays. The inversion is marked where it happens; the spreads are computed below. No bond calculation is complete without knowing where it sits on this curve.
            </p>
          </div>

          <div className="curve-panel">
            <div className="curve-panel-hd">
              <div>
                <div className="curve-panel-title">US Treasury Constant-Maturity Curve</div>
                <div className="curve-panel-sub">Apr 23, 2026 · end-of-day · source EODHD</div>
              </div>
              <div className="curve-legend">
                <div className="curve-legend-item"><span className="curve-legend-line solid"/>Today</div>
                <div className="curve-legend-item"><span className="curve-legend-line dashed"/>1 week ago</div>
                <div className="curve-legend-item"><span className="curve-legend-line dotted"/>1 year ago</div>
              </div>
            </div>

            <svg className="curve-chart" viewBox="0 0 1100 420" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="US Treasury yield curve">
              <defs>
                <linearGradient id="fillGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#A11E22" stopOpacity="0.10"/>
                  <stop offset="100%" stopColor="#A11E22" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <g stroke="#D6CFC0" strokeWidth="0.5" fontFamily="Libre Franklin" fontSize="10" fill="#767676">
                <line x1="80" y1="30" x2="1060" y2="30"/><text x="70" y="34" textAnchor="end">5.40</text>
                <line x1="80" y1="107.5" x2="1060" y2="107.5" strokeDasharray="2 3"/><text x="70" y="111" textAnchor="end">5.00</text>
                <line x1="80" y1="185" x2="1060" y2="185" strokeDasharray="2 3"/><text x="70" y="189" textAnchor="end">4.60</text>
                <line x1="80" y1="262.5" x2="1060" y2="262.5" strokeDasharray="2 3"/><text x="70" y="266" textAnchor="end">4.20</text>
                <line x1="80" y1="340" x2="1060" y2="340"/><text x="70" y="344" textAnchor="end">3.80</text>
              </g>
              <g fontFamily="JetBrains Mono" fontSize="10.5" fill="#555555" textAnchor="middle">
                <text x="80" y="365">1M</text><text x="164" y="365">3M</text><text x="237" y="365">6M</text>
                <text x="325" y="365">1Y</text><text x="437" y="365">2Y</text><text x="513" y="365">3Y</text>
                <text x="619" y="365">5Y</text><text x="706" y="365">7Y</text><text x="801" y="365">10Y</text>
                <text x="945" y="365">20Y</text><text x="1060" y="365">30Y</text>
              </g>
              <text x="30" y="185" fontFamily="Libre Franklin" fontSize="10" fill="#767676" transform="rotate(-90, 30, 185)" textAnchor="middle" letterSpacing="1.2">YIELD (%)</text>
              <text x="570" y="395" fontFamily="Libre Franklin" fontSize="10" fill="#767676" textAnchor="middle" letterSpacing="1.2">TENOR</text>

              <polyline points="80,66.56 164,89.81 237,120.81 325,144.06 437,173.13 513,198.31 619,225.44 706,231.25 801,221.56 945,186.69 1060,178.94" fill="none" stroke="#767676" strokeWidth="1.4" strokeDasharray="1.5 3" opacity="0.75"/>
              <polyline points="80,20.75 164,47.88 237,92.44 325,140.75 437,187.13 513,218.13 619,245.25 706,233.63 801,225.88 945,183.00 1060,175.25" fill="none" stroke="#946B0F" strokeWidth="1.8" strokeDasharray="5 4" opacity="0.85"/>
              <path d="M 80,24.63 L 164,51.75 L 237,96.31 L 325,148.50 L 437,198.81 L 513,226.06 L 619,251.25 L 706,237.69 L 801,231.88 L 945,187.13 L 1060,179.38 L 1060,340 L 80,340 Z" fill="url(#fillGrad)"/>
              <polyline points="80,24.63 164,51.75 237,96.31 325,148.50 437,198.81 513,226.06 619,251.25 706,237.69 801,231.88 945,187.13 1060,179.38" fill="none" stroke="#A11E22" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/>
              <g fill="#A11E22">
                <circle cx="80" cy="24.63" r="4"/><circle cx="164" cy="51.75" r="4"/><circle cx="237" cy="96.31" r="4"/>
                <circle cx="325" cy="148.50" r="4"/><circle cx="437" cy="198.81" r="4"/><circle cx="513" cy="226.06" r="4"/>
                <circle cx="619" cy="251.25" r="4"/><circle cx="706" cy="237.69" r="4"/><circle cx="801" cy="231.88" r="4"/>
                <circle cx="945" cy="187.13" r="4"/><circle cx="1060" cy="179.38" r="4"/>
              </g>
              <g fill="#F7F5EF" stroke="#A11E22" strokeWidth="1.6">
                <circle cx="619" cy="251.25" r="6"/><circle cx="801" cy="231.88" r="6"/>
              </g>
              <g fontFamily="JetBrains Mono" fontSize="11" fontWeight="600" fill="#121212">
                <text x="80" y="13" textAnchor="middle">5.32</text>
                <text x="619" y="268" textAnchor="middle" fill="#A11E22">4.15</text>
                <text x="1060" y="168" textAnchor="middle">4.52</text>
              </g>
              <g>
                <rect x="80" y="30" width="357" height="168.81" fill="#A11E22" opacity="0.04"/>
                <line x1="80" y1="198.81" x2="437" y2="198.81" stroke="#A11E22" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.6"/>
                <text x="258" y="52" fontFamily="Libre Franklin" fontSize="10" fontWeight="600" fill="#A11E22" textAnchor="middle" letterSpacing="1.5">INVERSION · SHORT-END ABOVE 2Y</text>
              </g>
              <g fontFamily="Source Serif 4" fontStyle="italic" fontSize="11" fill="#555555">
                <line x1="619" y1="260" x2="619" y2="282" stroke="#767676" strokeWidth="0.6"/>
                <text x="619" y="298" textAnchor="middle">trough · the belly</text>
              </g>
            </svg>

            <div className="curve-stats">
              <div className="curve-stat"><div className="curve-stat-label">2s10s Spread</div><div className="curve-stat-val neg">−17 bp</div><div className="curve-stat-meta">10Y 4.25 − 2Y 4.42</div></div>
              <div className="curve-stat"><div className="curve-stat-label">3m10y Spread</div><div className="curve-stat-val neg">−93 bp</div><div className="curve-stat-meta">inverted</div></div>
              <div className="curve-stat"><div className="curve-stat-label">Curve Slope</div><div className="curve-stat-val neg">−80 bp</div><div className="curve-stat-meta">30Y − 3M</div></div>
              <div className="curve-stat"><div className="curve-stat-label">Shape</div><div className="curve-stat-val" style={{color:'var(--accent)'}}>Inverted</div><div className="curve-stat-meta">recession signal</div></div>
            </div>

            <div className="etf-note">
              <div className="etf-note-badge">Also covered</div>
              <div className="etf-note-body">
                <b>Bond ETFs, charted the same way.</b> TLT (20+Yr), IEF (7-10Yr), SHY (1-3Yr), LQD (investment-grade corporates), HYG (high-yield), and AGG (aggregate) — each with their own price chart, yield, expense ratio, and duration.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METHOD */}
      <section id="engine" className="showcase">
        <div className="showcase-inner">
          <div className="showcase-left">
            <h3>The Canonical Example</h3>
            <h2>We do not <em>round.</em><br/>We reconcile.</h2>
            <p>A 6% semi-annual bond, 30/360, bought on 2 January 2025 at a 5% yield, sold on 2 January 2026 at a 4% yield, on $1,000,000 face. Every fixed-income tool in the world should produce the same three numbers. We produce these three:</p>
            <ul>
              <li><span className="n">I.</span><span className="t">Carry P&amp;L</span><span className="meta">+$52,091</span></li>
              <li><span className="n">II.</span><span className="t">Market Move P&amp;L</span><span className="meta">+$37,399</span></li>
              <li><span className="n">III.</span><span className="t">Total Revenue</span><span className="meta">+$89,490</span></li>
            </ul>
            <p style={{marginTop:'28px',fontSize:'15.5px',color:'var(--ink-3)',fontStyle:'italic'}}>The test suite runs twenty-plus reference trades on every deploy. If any number drifts, the build does not ship.</p>
          </div>
          <div className="formula-panel">
            <div className="formula-stamp">Method · §6.1</div>
            <div className="formula-title">Attribution, in four lines.</div>
            <div className="formula-line"><span className="lbl">Repriced Entry =</span><span className="val">invoice @ buy yield, sale date</span></div>
            <div className="formula-line"><span className="lbl">Carry P&amp;L =</span><span className="val">Repriced − Buy + Coupons</span></div>
            <div className="formula-line"><span className="lbl">Market Move P&amp;L =</span><span className="val">Sale − Repriced</span></div>
            <div className="formula-line"><span className="lbl">Total =</span><span className="val">Carry + Market Move</span></div>
            <p className="formula-note">Algebraically identical to sale minus purchase plus coupons. Intellectually, an answer to the question the cash P&amp;L never asks: <em>why did I make the money?</em></p>
          </div>
        </div>
      </section>

      {/* PULL QUOTE */}
      <section className="pullquote">
        <div className="pullquote-inner">
          <span className="pullquote-mark">"</span>
          <p className="pullquote-text">For settlement math, round-trip attribution, and curve context, I want <em>a scalpel</em> that opens in a browser tab — nothing to install, nothing to train on, answers in seconds.</p>
          <div className="pullquote-attrib">— A Fixed-Income Trader, Midtown</div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section id="compare" className="compare">
        <div className="compare-header">
          <div className="compare-kicker">Platform Capabilities</div>
          <h3 className="compare-headline">Every <em>capability</em> that matters<br/>for settlement &amp; analytics.</h3>
        </div>
        <div className="capability-grid">
          {[
            ['01','Settlement Math, To The Penny',"Clean price, dirty price, accrued interest, yield to maturity, modified duration and DV01 — computed with the conventions each bond was issued under. Reproducible to the counterparty's ticket."],
            ['02','Round-Trip P&L Attribution',"Total return split into Carry and Market-Move, using the repriced-entry method. Not a naive cash-difference — a proper answer to <em>why</em> the trade made money."],
            ['03','Portfolio-Weighted Analytics',"Aggregate yield, weighted duration, portfolio DV01, and a maturity ladder on your book. Positions stored locally, exportable as JSON or CSV. Fast enough for a hundred-line portfolio."],
            ['04','US Treasury Curve, Live',"Eleven tenors from 1 month to 30 years, with historical overlays and spread summaries. Inversion flagged automatically. 2s10s and 3m10y computed below the chart."],
            ['05','Bond ETF Coverage',"Price and context for the major bond ETFs — TLT, IEF, SHY, LQD, HYG, AGG — alongside the government curve. The fastest read of the bond market when you don't have time for every CUSIP."],
            ['06','Browser-Native, No Install',"Opens in any modern browser on any device, with one login working across up to five. No downloads, no VPN, no IT ticket. Works on a phone in a taxi."],
            ['07','PDF Settlement Tickets',"Every calculation exports to a clean PDF ticket with a unique reference number — for email to the back office, for the audit trail, or just for your own records."],
            ['08','Priced For The Individual',"One subscription, one login, up to five devices. $100 for a year or $11.50 a month. No per-seat surcharges, no enterprise gating on basic features."],
          ].map(([num, title, body]) => (
            <div key={num} className="cap-item">
              <div className="cap-num">{num}</div>
              <div className="cap-title">{title}</div>
              <div className="cap-body" dangerouslySetInnerHTML={{__html:body}}/>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="pricing">
        <div className="pricing-header">
          <div className="pricing-kicker">Subscription</div>
          <h3 className="pricing-headline">One login. <em>Five devices.</em></h3>
          <p className="pricing-sub">One price, no tiers, no per-seat surcharges. Cancel anytime.</p>
        </div>
        <div className="plan-single">
          <div className="plan-ribbon">Save 28%</div>
          <div className="plan-left">
            <div className="plan-tag">The Account</div>
            <div className="plan-name">Yield <em>Calculator</em></div>
            <div className="price-toggle">
              <button className={billing==='yearly'?'on':''} onClick={()=>setBilling('yearly')}>Annual</button>
              <button className={billing==='monthly'?'on':''} onClick={()=>setBilling('monthly')}>Monthly</button>
            </div>
            <div className="price-display">
              <div className="price-amt">
                <span className="cur">$</span>
                <span>{billing==='yearly'?'100':'11.50'}</span>
                <span className="per">{billing==='yearly'?'/ year':'/ month'}</span>
              </div>
              <div className="price-context">
                {billing==='yearly' ? (
                  <><b>Annual · $100.</b> That is $8.33 a month — with twelve months paid up front, and the twelfth effectively free when compared against monthly billing.</>
                ) : (
                  <><b>Monthly · $11.50.</b> Pay-as-you-go, cancel any month. Over a full year that comes to $138 — switch to Annual to save $38.</>
                )}
              </div>
            </div>
          </div>
          <div className="plan-right">
            <div className="plan-features-title">Everything included</div>
            <ul className="plan-features">
              <li>All four modules — Calculator, Revenue, Portfolio, Curve</li>
              <li><b>One login, up to 5 devices</b> — laptop, desktop, phone, tablet, one spare</li>
              <li>Unlimited ISIN lookups and PDF settlement tickets</li>
              <li>Portfolio with live marks, import/export</li>
              <li>US Treasury curve with historical overlays</li>
              <li>Bond ETF pricing — TLT, IEF, LQD, HYG, AGG and more</li>
              <li>Email support with 24-hour reply</li>
            </ul>
            <Link href="/calc" className="plan-cta">Start 14-Day Free Trial</Link>
            <div className="plan-foot">No card required · cancel anytime</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="colophon">
        <div className="colophon-inner">
          <div className="colophon-top">
            <div>
              <div className="colophon-brand">Yield <em>Calculator</em></div>
              <div className="colophon-tag">Fixed-Income Analytics Daily</div>
              <p className="colophon-addr">Built for the analyst who writes the ticket. Precise, reproducible fixed-income math — in a browser tab, priced for the individual rather than the institution.</p>
            </div>
            <div className="colophon-col">
              <h4>Modules</h4>
              <ul>
                <li><Link href="/calc">Calculator</Link></li>
                <li><Link href="/revenue">Round-Trip P&amp;L</Link></li>
                <li><Link href="/portfolio">Portfolio</Link></li>
                <li><Link href="/curve">Yield Curve &amp; ETFs</Link></li>
              </ul>
            </div>
            <div className="colophon-col">
              <h4>Resources</h4>
              <ul>
                <li><a href="#engine">Methodology</a></li>
                <li><a href="#compare">Capabilities</a></li>
                <li><a href="#pricing">Pricing</a></li>
              </ul>
            </div>
            <div className="colophon-col">
              <h4>Contact</h4>
              <ul>
                <li><a href="mailto:hello@yieldcalculator.tech">hello@yieldcalculator.tech</a></li>
              </ul>
            </div>
          </div>
          <div className="colophon-bottom">
            <div>© 2026 Yield Calculator · All rights reserved</div>
            <div>v1.0 · Released Apr 2026</div>
          </div>
        </div>
      </footer>

      <div className="disclaimer-banner">
        For informational purposes only. Not financial advice. Not a regulated product. Not a book of record.
      </div>

      {/* STYLES — all scoped via styled-jsx */}
      <style jsx>{`
        .masthead{border-bottom:1px solid var(--rule);background:var(--paper);position:relative;z-index:10;}
        .masthead-top{max-width:var(--col-max);margin:0 auto;padding:12px var(--gutter);display:flex;align-items:center;justify-content:space-between;font-family:var(--sans);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);font-weight:500;}
        .masthead-top .edition{font-family:var(--mono);font-weight:400;}
        .masthead-top .locale{display:flex;gap:16px;}
        .masthead-top .locale span+span::before{content:"·";margin-right:16px;color:var(--rule);}
        .masthead-main{max-width:var(--col-max);margin:0 auto;padding:22px var(--gutter) 28px;display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:28px;border-top:2px solid var(--ink);}
        .mh-left,.mh-right{font-family:var(--sans);font-size:11px;color:var(--ink-3);letter-spacing:.1em;font-weight:600;line-height:1.4;}
        .mh-left{text-align:left;}
        .mh-right{text-align:right;}
        .mh-title{font-family:var(--display);font-weight:900;font-size:clamp(44px,8vw,98px);line-height:.88;letter-spacing:-0.025em;text-align:center;white-space:nowrap;color:var(--ink);}
        .mh-title :global(i){font-family:var(--display);font-style:italic;font-weight:400;color:var(--ink-2);letter-spacing:-0.02em;}
        .masthead-nav{border-top:2px solid var(--ink);border-bottom:1px solid var(--ink);}
        .masthead-nav-inner{max-width:var(--col-max);margin:0 auto;padding:0 var(--gutter);display:flex;align-items:center;justify-content:space-between;gap:20px;font-family:var(--sans);font-size:12.5px;}
        .nav-primary{display:flex;gap:28px;}
        .nav-primary a{padding:14px 0;font-weight:500;letter-spacing:.02em;color:var(--ink);transition:color .15s;}
        .nav-primary a:hover{color:var(--accent);}
        .nav-right{display:flex;align-items:center;gap:16px;}
        .nav-ticker{font-family:var(--mono);font-size:11px;letter-spacing:.04em;color:var(--ink-3);padding:5px 10px;border:1px solid var(--rule);display:flex;align-items:center;gap:8px;}
        .nav-ticker .dot{width:6px;height:6px;border-radius:50%;background:var(--bull);animation:pulse 2s infinite;}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
        .nav-cta{padding:8px 18px;background:var(--ink);color:var(--paper);font-size:12.5px;font-weight:600;letter-spacing:.03em;transition:background .15s;}
        .nav-cta:hover{background:var(--accent);}

        .hero{max-width:var(--col-max);margin:0 auto;padding:clamp(48px,7vw,88px) var(--gutter) clamp(44px,6vw,72px);position:relative;}
        .hero-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:clamp(32px,5vw,72px);align-items:start;}
        .hero-kicker{font-family:var(--sans);font-weight:600;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:22px;display:flex;align-items:center;gap:12px;}
        .hero-kicker::before{content:"";width:42px;height:1px;background:var(--accent);}
        .hero-headline{font-family:var(--display);font-weight:800;font-size:clamp(42px,6.4vw,84px);line-height:.97;letter-spacing:-0.025em;color:var(--ink);margin-bottom:32px;}
        .hero-headline :global(em){font-style:italic;font-weight:500;color:var(--accent);}
        .hero-headline .amp{font-family:var(--display);font-style:italic;font-weight:400;color:var(--muted);padding:0 .05em;}
        .hero-lede{font-family:var(--body);font-weight:400;font-size:19px;line-height:1.55;color:var(--ink-2);max-width:560px;margin-bottom:36px;}
        .hero-lede::first-letter{font-size:3.6em;float:left;font-family:var(--display);font-weight:800;line-height:.85;padding:6px 12px 0 0;color:var(--accent);}
        .hero-cta-row{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:32px;}

        .btn-primary{font-family:var(--sans);padding:14px 28px;background:var(--ink);color:var(--paper);font-weight:600;font-size:13.5px;letter-spacing:.03em;transition:background .18s;display:inline-block;}
        .btn-primary::after{content:"→";margin-left:10px;display:inline-block;transition:transform .2s;}
        .btn-primary:hover{background:var(--accent);}
        .btn-secondary{font-family:var(--sans);padding:13px 22px;color:var(--ink);font-weight:500;font-size:13.5px;border-bottom:1px solid var(--ink);transition:color .15s,border-color .15s;display:inline-block;}
        .btn-secondary:hover{color:var(--accent);border-color:var(--accent);}

        .hero-proof{display:flex;gap:40px;padding-top:28px;border-top:1px solid var(--rule);font-family:var(--sans);font-size:11px;letter-spacing:.08em;color:var(--ink-3);text-transform:uppercase;font-weight:500;}
        .hero-proof b{color:var(--ink);font-size:22px;font-family:var(--display);font-weight:700;display:block;margin-bottom:2px;letter-spacing:-0.015em;text-transform:none;}

        .console{background:#0D1017;color:#D8D4C8;font-family:var(--mono);overflow:hidden;box-shadow:0 30px 80px -20px rgba(0,0,0,.4),0 1px 0 rgba(255,255,255,.04) inset;position:relative;border:1px solid #1F232B;}
        .console-bar{padding:12px 16px;background:#151922;border-bottom:1px solid #1F232B;display:flex;align-items:center;gap:10px;font-size:10.5px;color:#6B7280;letter-spacing:.08em;}
        .console-dots{display:flex;gap:6px;}
        .console-dots :global(span){width:10px;height:10px;border-radius:50%;}
        .console-dots :global(span:nth-child(1)){background:#E95B4B;}
        .console-dots :global(span:nth-child(2)){background:#F5C24D;}
        .console-dots :global(span:nth-child(3)){background:#5DD176;}
        .console-title{margin-left:auto;margin-right:auto;letter-spacing:.1em;text-transform:uppercase;}
        .console-body{padding:24px 26px;font-size:13px;line-height:1.7;}
        .c-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #1F232B;}
        .c-row:last-child{border-bottom:none;}
        .c-label{color:#6B7280;letter-spacing:.03em;}
        .c-val{color:#E4DFD0;font-weight:500;}
        .c-val.hl{color:#E9AF3E;font-weight:600;}
        .c-section{margin-top:20px;padding-top:14px;border-top:1px solid #1F232B;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#6B7280;margin-bottom:8px;}
        .c-section:first-child{margin-top:0;padding-top:0;border-top:none;}
        .c-big{display:flex;justify-content:space-between;align-items:baseline;padding:14px 0 6px;}
        .c-big-label{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#6B7280;}
        .c-big-val{font-size:22px;font-weight:600;color:#5DD176;letter-spacing:-.01em;}
        .c-meta{color:#6B7280;font-size:10.5px;margin-top:4px;}
        .c-stamp{position:absolute;top:48px;right:24px;font-family:var(--display);font-style:italic;color:rgba(233,175,62,.8);font-size:11px;letter-spacing:.2em;text-transform:uppercase;border-left:1px solid rgba(233,175,62,.3);padding-left:10px;}

        .ticker-bar{background:var(--ink);color:var(--paper);overflow:hidden;border-top:1px solid rgba(247,245,239,.1);border-bottom:1px solid rgba(247,245,239,.1);white-space:nowrap;padding:12px 0;font-family:var(--mono);font-size:12px;letter-spacing:.03em;}
        .ticker-track{display:inline-block;animation:scroll 48s linear infinite;padding-left:100%;}
        .ticker-track :global(span){margin-right:40px;}
        .ticker-track :global(span b){color:var(--paper);font-weight:600;margin-right:8px;}
        .ticker-track :global(span .up){color:#5DD176;}
        .ticker-track :global(span .dn){color:#E95B4B;}
        @keyframes scroll{from{transform:translateX(0);}to{transform:translateX(-100%);}}

        .section-rule{max-width:var(--col-max);margin:0 auto;border-top:1px solid var(--ink);border-bottom:1px solid var(--rule);padding:18px var(--gutter);display:flex;justify-content:space-between;align-items:center;font-family:var(--sans);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);font-weight:500;}
        .section-rule .edition{color:var(--ink);font-weight:700;}

        .modules{max-width:var(--col-max);margin:0 auto;padding:clamp(48px,6vw,88px) var(--gutter);}
        .modules-header{display:grid;grid-template-columns:1fr 1.6fr;gap:48px;margin-bottom:56px;align-items:end;}
        .modules-kicker{font-family:var(--sans);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:16px;font-weight:600;}
        .modules-headline{font-family:var(--display);font-weight:700;font-size:clamp(34px,4.8vw,60px);line-height:1;letter-spacing:-0.022em;}
        .modules-headline :global(em){font-style:italic;font-weight:500;color:var(--muted);}
        .modules-intro{font-family:var(--body);font-size:17.5px;line-height:1.6;color:var(--ink-2);max-width:560px;}

        .module-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:1px;background:var(--rule);border:1px solid var(--rule);}
        .module{background:var(--paper);padding:36px 32px 40px;position:relative;transition:background .25s;min-height:340px;display:flex;flex-direction:column;grid-column:span 6;}
        .module:hover{background:#FCF9EF;}
        .module-num{font-family:var(--mono);font-size:11px;letter-spacing:.2em;color:var(--muted);margin-bottom:12px;}
        .module-title{font-family:var(--display);font-weight:700;font-size:32px;line-height:1.05;letter-spacing:-0.022em;margin-bottom:16px;}
        .module-title :global(em){font-style:italic;font-weight:500;color:var(--accent);}
        .module-body{font-family:var(--body);font-size:15.5px;line-height:1.6;color:var(--ink-2);margin-bottom:24px;flex-grow:1;}
        .module-specs{display:flex;flex-wrap:wrap;gap:6px 12px;padding-top:16px;border-top:1px solid var(--rule);font-family:var(--sans);font-size:10.5px;color:var(--ink-3);letter-spacing:.06em;text-transform:uppercase;font-weight:500;}
        .module-specs :global(span){display:flex;align-items:center;gap:6px;}
        .module-specs :global(span::before){content:"■";color:var(--accent);font-size:8px;}
        .module-route{position:absolute;top:36px;right:32px;font-family:var(--mono);font-size:11px;color:var(--ink-3);letter-spacing:.05em;}

        .curve-showcase{background:var(--paper-2);border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);}
        .curve-showcase-inner{max-width:var(--col-max);margin:0 auto;padding:clamp(48px,6vw,80px) var(--gutter);}
        .curve-header{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:40px;align-items:end;}
        .curve-kicker{font-family:var(--sans);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:14px;font-weight:600;}
        .curve-headline{font-family:var(--display);font-weight:700;font-size:clamp(32px,4.5vw,54px);line-height:1;letter-spacing:-0.022em;}
        .curve-headline :global(em){font-style:italic;font-weight:500;color:var(--accent);}
        .curve-intro{font-family:var(--body);font-size:16.5px;line-height:1.6;color:var(--ink-2);}
        .curve-panel{background:var(--paper);border:1px solid var(--rule);padding:28px 32px 32px;}
        .curve-panel-hd{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:16px;border-bottom:1px solid var(--rule);margin-bottom:20px;flex-wrap:wrap;gap:16px;}
        .curve-panel-title{font-family:var(--display);font-weight:700;font-size:22px;letter-spacing:-0.015em;}
        .curve-panel-sub{font-family:var(--mono);font-size:11px;color:var(--ink-3);letter-spacing:.04em;margin-top:4px;}
        .curve-legend{display:flex;gap:16px;flex-wrap:wrap;}
        .curve-legend-item{display:flex;align-items:center;gap:8px;font-family:var(--sans);font-size:11.5px;color:var(--ink-2);font-weight:500;}
        .curve-legend-line{width:20px;height:2px;}
        .curve-legend-line.solid{background:var(--accent);}
        .curve-legend-line.dashed{background:none;border-top:2px dashed var(--gold);height:0;}
        .curve-legend-line.dotted{background:none;border-top:2px dotted var(--ink-3);height:0;}
        .curve-chart{width:100%;height:auto;display:block;}
        .curve-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--rule);margin-top:24px;border:1px solid var(--rule);}
        .curve-stat{background:var(--paper);padding:16px 18px;}
        .curve-stat-label{font-family:var(--sans);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);font-weight:600;margin-bottom:6px;}
        .curve-stat-val{font-family:var(--display);font-weight:700;font-size:22px;letter-spacing:-0.015em;}
        .curve-stat-val.neg{color:var(--accent);}
        .curve-stat-val.pos{color:var(--bull);}
        .curve-stat-meta{font-family:var(--mono);font-size:10.5px;color:var(--ink-3);margin-top:3px;}
        .etf-note{margin-top:28px;padding:20px 24px;background:var(--paper);border:1px solid var(--rule);display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center;}
        .etf-note-badge{font-family:var(--sans);font-weight:700;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--paper);background:var(--accent);padding:6px 12px;white-space:nowrap;}
        .etf-note-body{font-family:var(--body);font-size:15px;color:var(--ink-2);line-height:1.55;}
        .etf-note-body :global(b){font-weight:600;color:var(--ink);}

        .showcase{background:var(--paper);border-bottom:1px solid var(--ink);}
        .showcase-inner{max-width:var(--col-max);margin:0 auto;padding:clamp(48px,6vw,88px) var(--gutter);display:grid;grid-template-columns:1fr 1fr;gap:clamp(40px,6vw,80px);align-items:center;}
        .showcase-left h3{font-family:var(--sans);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:20px;font-weight:600;}
        .showcase-left h2{font-family:var(--display);font-weight:700;font-size:clamp(36px,4.5vw,58px);line-height:1.02;letter-spacing:-0.022em;margin-bottom:24px;}
        .showcase-left h2 :global(em){font-style:italic;color:var(--accent);font-weight:500;}
        .showcase-left p{font-family:var(--body);font-size:17.5px;line-height:1.65;color:var(--ink-2);margin-bottom:20px;}
        .showcase-left ul{list-style:none;margin-top:28px;}
        .showcase-left li{padding:14px 0;border-top:1px solid var(--rule);display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:center;font-size:15px;}
        .showcase-left li:last-child{border-bottom:1px solid var(--rule);}
        .showcase-left li .n{font-family:var(--mono);color:var(--muted);font-size:11px;letter-spacing:.1em;}
        .showcase-left li .t{font-family:var(--body);color:var(--ink);font-weight:500;}
        .showcase-left li .meta{font-family:var(--mono);font-size:11.5px;color:var(--ink);font-weight:600;letter-spacing:.02em;}
        .formula-panel{background:var(--paper-2);border:1px solid var(--rule);padding:32px;position:relative;}
        .formula-stamp{position:absolute;top:-12px;left:24px;background:var(--paper);padding:0 12px;font-family:var(--sans);font-size:10.5px;color:var(--muted);letter-spacing:.18em;text-transform:uppercase;font-weight:600;}
        .formula-title{font-family:var(--display);font-style:italic;font-size:22px;font-weight:500;margin-bottom:24px;padding-bottom:14px;border-bottom:1px solid var(--rule);}
        .formula-line{font-family:var(--mono);font-size:13px;padding:10px 0;border-bottom:1px dashed var(--rule);display:flex;justify-content:space-between;gap:16px;}
        .formula-line:last-child{border-bottom:none;padding-top:14px;font-weight:600;color:var(--accent);font-size:14px;border-top:1px solid var(--ink);margin-top:6px;}
        .formula-line .lbl{color:var(--ink-2);}
        .formula-line .val{color:var(--ink);font-weight:500;white-space:nowrap;}
        .formula-note{margin-top:20px;padding-top:16px;border-top:1px solid var(--rule);font-family:var(--body);font-style:italic;font-size:14px;color:var(--ink-3);line-height:1.6;}

        .pullquote{background:var(--ink);color:var(--paper);padding:clamp(48px,8vw,96px) var(--gutter);text-align:center;}
        .pullquote-inner{max-width:900px;margin:0 auto;}
        .pullquote-mark{font-family:var(--display);font-style:italic;font-size:100px;line-height:.4;color:var(--accent);margin-bottom:12px;display:block;font-weight:700;}
        .pullquote-text{font-family:var(--display);font-weight:400;font-style:italic;font-size:clamp(24px,3.5vw,40px);line-height:1.28;margin-bottom:24px;}
        .pullquote-text :global(em){font-style:normal;color:var(--paper);background:var(--accent);padding:0 .2em;font-weight:500;}
        .pullquote-attrib{font-family:var(--sans);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(247,245,239,.55);font-weight:600;}

        .compare{max-width:var(--col-max);margin:0 auto;padding:clamp(48px,6vw,88px) var(--gutter);}
        .compare-header{text-align:center;margin-bottom:48px;}
        .compare-kicker{font-family:var(--sans);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:14px;font-weight:600;}
        .compare-headline{font-family:var(--display);font-weight:700;font-size:clamp(34px,5vw,62px);line-height:1;letter-spacing:-0.022em;}
        .compare-headline :global(em){font-style:italic;color:var(--muted);font-weight:500;}
        .capability-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--rule);border:1px solid var(--rule);}
        .cap-item{background:var(--paper);padding:28px 26px 32px;display:flex;flex-direction:column;gap:10px;transition:background .25s;}
        .cap-item:hover{background:#FCF9EF;}
        .cap-num{font-family:var(--mono);font-size:11px;letter-spacing:.22em;color:var(--accent);font-weight:500;}
        .cap-title{font-family:var(--display);font-weight:700;font-size:20px;line-height:1.15;letter-spacing:-0.015em;color:var(--ink);}
        .cap-body{font-family:var(--body);font-size:14.5px;line-height:1.55;color:var(--ink-2);}
        .cap-body :global(em){font-style:italic;color:var(--accent);}

        .pricing{max-width:var(--col-max);margin:0 auto;padding:clamp(48px,7vw,96px) var(--gutter);}
        .pricing-header{text-align:center;margin-bottom:56px;}
        .pricing-kicker{font-family:var(--sans);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:14px;font-weight:600;}
        .pricing-headline{font-family:var(--display);font-weight:700;font-size:clamp(36px,5.2vw,64px);line-height:1;letter-spacing:-0.022em;margin-bottom:18px;}
        .pricing-headline :global(em){font-style:italic;color:var(--accent);font-weight:500;}
        .pricing-sub{font-family:var(--body);font-size:18px;color:var(--ink-2);}
        .plan-single{max-width:720px;margin:0 auto;background:var(--ink);color:var(--paper);display:grid;grid-template-columns:1fr 1fr;position:relative;overflow:hidden;box-shadow:0 24px 60px -20px rgba(0,0,0,.35);}
        .plan-ribbon{position:absolute;top:18px;right:-38px;background:var(--accent);color:var(--paper);font-family:var(--sans);font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;padding:5px 44px;transform:rotate(40deg);box-shadow:0 4px 12px rgba(0,0,0,.25);z-index:2;}
        .plan-left{padding:44px 36px 40px;border-right:1px solid rgba(247,245,239,.1);}
        .plan-right{padding:44px 36px 40px;background:rgba(255,255,255,.025);}
        .plan-tag{font-family:var(--sans);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:rgba(247,245,239,.55);margin-bottom:14px;font-weight:600;}
        .plan-name{font-family:var(--display);font-weight:700;font-size:34px;line-height:1;letter-spacing:-0.02em;margin-bottom:24px;}
        .plan-name :global(em){font-style:italic;color:var(--accent);font-weight:500;}
        .price-toggle{display:flex;background:rgba(255,255,255,.06);padding:4px;margin-bottom:26px;}
        .price-toggle button{flex:1;padding:10px 14px;font-family:var(--sans);font-size:12px;font-weight:600;letter-spacing:.04em;color:rgba(247,245,239,.6);transition:all .2s;}
        .price-toggle button.on{background:var(--accent);color:var(--paper);}
        .price-display{margin-bottom:20px;}
        .price-amt{font-family:var(--display);font-weight:700;font-size:76px;letter-spacing:-0.04em;line-height:.85;display:flex;align-items:baseline;gap:6px;}
        .price-amt .cur{font-size:28px;font-weight:500;color:rgba(247,245,239,.6);margin-right:2px;}
        .price-amt .per{font-family:var(--mono);font-size:13px;color:rgba(247,245,239,.55);margin-left:8px;letter-spacing:.04em;}
        .price-context{font-family:var(--body);font-size:14.5px;color:rgba(247,245,239,.72);font-style:italic;padding-top:16px;border-top:1px solid rgba(247,245,239,.1);margin-top:10px;line-height:1.5;}
        .price-context :global(b){color:var(--paper);font-style:normal;font-weight:600;}
        .plan-features-title{font-family:var(--sans);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:rgba(247,245,239,.55);font-weight:600;margin-bottom:18px;}
        .plan-features{list-style:none;margin-bottom:32px;}
        .plan-features li{padding:11px 0;border-bottom:1px solid rgba(247,245,239,.1);font-family:var(--body);font-size:15px;line-height:1.4;display:grid;grid-template-columns:18px 1fr;gap:12px;align-items:start;}
        .plan-features li::before{content:"+";color:var(--accent);font-family:var(--mono);font-weight:700;line-height:1.4;}
        .plan-cta{width:100%;padding:16px;background:var(--accent);color:var(--paper);font-family:var(--sans);font-weight:600;font-size:13.5px;letter-spacing:.04em;transition:background .15s;display:block;text-align:center;}
        .plan-cta:hover{background:#881619;}
        .plan-foot{margin-top:14px;font-family:var(--mono);font-size:10.5px;color:rgba(247,245,239,.45);letter-spacing:.06em;text-transform:uppercase;text-align:center;}

        .colophon{background:var(--ink);color:var(--paper);padding:clamp(48px,6vw,80px) var(--gutter) 32px;border-top:6px solid var(--accent);}
        .colophon-inner{max-width:var(--col-max);margin:0 auto;}
        .colophon-top{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:48px;padding-bottom:40px;border-bottom:1px solid rgba(247,245,239,.12);}
        .colophon-brand{font-family:var(--display);font-weight:800;font-size:42px;letter-spacing:-0.025em;line-height:1;margin-bottom:14px;}
        .colophon-brand :global(em){font-style:italic;color:var(--accent);font-weight:500;}
        .colophon-tag{font-family:var(--sans);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(247,245,239,.6);margin-bottom:22px;font-weight:600;}
        .colophon-addr{font-family:var(--body);font-size:14px;line-height:1.6;color:rgba(247,245,239,.6);max-width:360px;}
        .colophon-col h4{font-family:var(--sans);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(247,245,239,.45);margin-bottom:14px;font-weight:600;}
        .colophon-col ul{list-style:none;}
        .colophon-col li{padding:5px 0;}
        .colophon-col a{font-family:var(--body);font-size:14px;color:rgba(247,245,239,.85);transition:color .15s;}
        .colophon-col a:hover{color:var(--accent);}
        .colophon-bottom{padding-top:28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;font-family:var(--sans);font-size:11px;letter-spacing:.1em;color:rgba(247,245,239,.42);text-transform:uppercase;font-weight:500;}
        .disclaimer-banner{background:#0A0C10;color:rgba(247,245,239,.55);padding:18px var(--gutter);text-align:center;font-family:var(--body);font-style:italic;font-size:13.5px;}

        @media(max-width:960px){
          .masthead-main{grid-template-columns:1fr;gap:10px;text-align:center;}
          .mh-left,.mh-right{text-align:center;}
          .hero-grid{grid-template-columns:1fr;}
          .modules-header{grid-template-columns:1fr;gap:20px;}
          .module{grid-column:span 12;}
          .showcase-inner{grid-template-columns:1fr;}
          .curve-header{grid-template-columns:1fr;gap:20px;}
          .curve-stats{grid-template-columns:repeat(2,1fr);}
          .plan-single{grid-template-columns:1fr;}
          .plan-left{border-right:none;border-bottom:1px solid rgba(247,245,239,.1);}
          .colophon-top{grid-template-columns:1fr 1fr;gap:32px;}
          .capability-grid{grid-template-columns:1fr 1fr;}
        }
        @media(max-width:560px){
          .nav-primary{display:none;}
          .masthead-top{font-size:10px;}
          .hero-proof{gap:24px;flex-wrap:wrap;}
          .hero-proof b{font-size:18px;}
          .colophon-top{grid-template-columns:1fr;gap:32px;}
          .etf-note{grid-template-columns:1fr;}
          .capability-grid{grid-template-columns:1fr;}
        }
      `}</style>
    </>
  );
}
