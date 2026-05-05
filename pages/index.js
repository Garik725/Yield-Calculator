// pages/index.js
// Elegant editorial landing page · Fraunces + Inter, emerald + ivory.

import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [billing, setBilling] = useState('yearly');
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return;
    const close = (e) => { if (!e.target.closest('.nav-menu')) setNavOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [navOpen]);

  return (
    <>
      <Head>
        <title>Yield Calculator · Fixed-Income Analytics</title>
        <meta name="description" content="Bond settlement, round-trip P&L attribution, portfolio analytics, and a live US Treasury yield curve. Refined fixed-income math in a browser tab." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,300;1,9..144,400;1,9..144,500;1,9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        :root {
          --paper: #F8F4EA;
          --paper-2: #FBF8F0;
          --paper-3: #EFE9DA;
          --ink: #1A1815;
          --ink-2: #3D3A33;
          --ink-3: #6B6760;
          --ink-4: #8E8A82;
          --rule: #DDD5BF;
          --rule-soft: #E8E2D0;
          --accent: #214B3D;
          --accent-2: #2E6B5A;
          --accent-soft: #E5ECE7;
          --gold: #9D7E3E;
          --gold-soft: #F0E8D4;
          --bull: #1F5E40;
          --bear: #A33D2E;
          --display: 'Fraunces', Georgia, serif;
          --sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          --mono: 'JetBrains Mono', ui-monospace, monospace;
          --col: 1240px;
          --pad: clamp(20px, 4vw, 40px);
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        body { background: var(--paper); color: var(--ink); font-family: var(--sans); font-size: 16px; line-height: 1.6; overflow-x: hidden; }
        a { color: inherit; text-decoration: none; }
        button { font-family: inherit; border: none; background: none; cursor: pointer; color: inherit; }
        img, svg { max-width: 100%; display: block; }
      `}</style>

      {/* HEADER */}
      <header className="hd">
        <div className="hd-inner">
          <Link href="/" className="hd-brand">
            <span className="hd-mark">YC</span>
            <span className="hd-name">Yield <i>Calculator</i></span>
          </Link>
          <nav className="hd-nav">
            <a href="#modules">Modules</a>
            <a href="#method">Method</a>
            <a href="#capabilities">Capabilities</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <Link href="/calc" className="hd-cta">Open the App</Link>
          <div className="nav-menu">
            <button className={`nav-trigger ${navOpen ? 'on' : ''}`} onClick={() => setNavOpen(!navOpen)} aria-label="Open menu">
              Menu
              <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {navOpen && (
              <div className="nav-panel">
                <Link href="/" className="np-link active" onClick={() => setNavOpen(false)}>Home</Link>
                <Link href="/calc" className="np-link" onClick={() => setNavOpen(false)}>Calculator</Link>
                <Link href="/revenue" className="np-link" onClick={() => setNavOpen(false)}>Round-Trip P&amp;L</Link>
                <Link href="/portfolio" className="np-link" onClick={() => setNavOpen(false)}>Portfolio</Link>
                <Link href="/curve" className="np-link" onClick={() => setNavOpen(false)}>Yield Curve</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="eyebrow">Fixed-Income Analytics, Refined</div>
            <h1 className="hero-h">
              Quiet, accurate<br/>
              <em>bond mathematics ·</em><br/>
              in a browser tab.
            </h1>
            <p className="hero-lede">
              Bond settlement, round-trip P&amp;L attribution, portfolio analytics, and a live US Treasury yield curve. One shared math engine, accuracy to a hundredth of a basis point, and a price that respects the individual analyst.
            </p>
            <div className="hero-cta">
              <Link href="/calc" className="btn-fill">Open the App</Link>
              <a href="#method" className="btn-link">Read the methodology →</a>
            </div>
            <div className="hero-foot">
              <div><b>0.0001%</b><span>yield tolerance</span></div>
              <div className="div"></div>
              <div><b>&lt;50ms</b><span>client-side calc</span></div>
              <div className="div"></div>
              <div><b>$100</b><span>per year</span></div>
            </div>
          </div>

          <div className="specimen">
            <div className="spec-label">Specimen · settlement</div>
            <div className="spec-isin">US91282CJM14</div>
            <div className="spec-desc">UST 4.25% 02/15/2035</div>
            <div className="spec-divider"></div>
            <div className="spec-row"><span>Settlement</span><b>Apr 25, 2026 · T+2</b></div>
            <div className="spec-row"><span>Day count</span><b>ACT/ACT</b></div>
            <div className="spec-row"><span>Face value</span><b>1,000,000</b></div>
            <div className="spec-row"><span>Yield (input)</span><b className="hl">4.2510%</b></div>
            <div className="spec-row"><span>Clean price</span><b>99.9912</b></div>
            <div className="spec-row"><span>Accrued · 69 days</span><b>8,047.06</b></div>
            <div className="spec-row"><span>Modified duration</span><b>7.312</b></div>
            <div className="spec-row"><span>DV01</span><b>$731.16</b></div>
            <div className="spec-divider strong"></div>
            <div className="spec-total">
              <span>Total invoice</span>
              <b>$1,007,960.54</b>
            </div>
            <div className="spec-meta">USD · per dirty price 100.7961</div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="modules">
        <div className="sec-inner">
          <div className="sec-head">
            <div className="eyebrow">The Four Modules</div>
            <h2 className="sec-h">One <em>engine.</em> Four workflows.</h2>
            <p className="sec-lede">
              Every module runs on the same pure-JavaScript bond-math library. Price a bond in the Calculator, trade it in Round-Trip, manage it in Portfolio, benchmark it against the Treasury curve · without the number ever drifting between screens.
            </p>
          </div>

          <div className="mods">
            <Link href="/calc" className="mod">
              <div className="mod-route">/calc</div>
              <div className="mod-num">№ 01</div>
              <h3 className="mod-h">The <em>Calculator</em></h3>
              <p className="mod-body">Enter an ISIN, a price, or a yield. The other side solves instantly. Clean and dirty prices, accrued interest down to the day, modified duration, DV01, and an export-ready settlement ticket.</p>
              <div className="mod-tags">
                <span>ISIN lookup</span><span>Newton-Raphson</span><span>ACT/ACT · 30/360</span><span>PDF ticket</span>
              </div>
            </Link>

            <Link href="/revenue" className="mod">
              <div className="mod-route">/revenue</div>
              <div className="mod-num">№ 02</div>
              <h3 className="mod-h">The <em>Round-Trip</em></h3>
              <p className="mod-body">Total return, attributed. Enter a buy, a sell, two settlement dates · receive the gain split between carry and market move. The repriced-entry method, not a naive cash difference.</p>
              <div className="mod-tags">
                <span>Carry decomp</span><span>Market move</span><span>Coupon accounting</span><span>Hold-period return</span>
              </div>
            </Link>

            <Link href="/portfolio" className="mod">
              <div className="mod-route">/portfolio</div>
              <div className="mod-num">№ 03</div>
              <h3 className="mod-h">The <em>Book</em></h3>
              <p className="mod-body">A working portfolio, stored in your browser. Add positions by ticker or ISIN. Weighted yield, weighted duration, aggregate DV01, and a maturity ladder. Import and export as JSON.</p>
              <div className="mod-tags">
                <span>Weighted YTM</span><span>Aggregate DV01</span><span>Maturity ladder</span><span>LocalStorage</span>
              </div>
            </Link>

            <Link href="/curve" className="mod">
              <div className="mod-route">/curve</div>
              <div className="mod-num">№ 04</div>
              <h3 className="mod-h">The <em>Curve</em></h3>
              <p className="mod-body">The US Treasury constant-maturity curve · today, a week ago, a year ago · overlaid and annotated. Plus live charts for the major bond ETFs: TLT, IEF, SHY, LQD, HYG, AGG.</p>
              <div className="mod-tags">
                <span>1M → 30Y</span><span>Historical overlay</span><span>ETF pricing</span><span>Inversion flags</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CURVE PANEL */}
      <section className="curve-sec">
        <div className="sec-inner">
          <div className="sec-head two-col">
            <div>
              <div className="eyebrow">The Curve · Module 04</div>
              <h2 className="sec-h">The shape of money,<br/><em>at a glance.</em></h2>
            </div>
            <p className="sec-lede right">
              Eleven tenors, from one-month bills to thirty-year bonds. Today, a week ago, a year ago · overlaid and annotated. The inversion is marked where it happens; the spreads are computed below.
            </p>
          </div>

          <div className="curve-card">
            <div className="curve-card-hd">
              <div>
                <div className="curve-title">US Treasury Constant-Maturity Curve</div>
                <div className="curve-sub">Apr 23, 2026 · end-of-day · source EODHD</div>
              </div>
              <div className="curve-legend">
                <span><i className="ll solid"/>Today</span>
                <span><i className="ll dashed"/>1 week</span>
                <span><i className="ll dotted"/>1 year</span>
              </div>
            </div>

            <svg className="curve-svg" viewBox="0 0 1100 420" preserveAspectRatio="xMidYMid meet" role="img" aria-label="US Treasury yield curve">
              <defs>
                <linearGradient id="emeraldFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#214B3D" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#214B3D" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g stroke="#DDD5BF" strokeWidth="0.5" fontFamily="Inter" fontSize="10" fill="#8E8A82">
                <line x1="80" y1="30" x2="1060" y2="30"/><text x="70" y="34" textAnchor="end">5.40</text>
                <line x1="80" y1="107.5" x2="1060" y2="107.5" strokeDasharray="2 3"/><text x="70" y="111" textAnchor="end">5.00</text>
                <line x1="80" y1="185" x2="1060" y2="185" strokeDasharray="2 3"/><text x="70" y="189" textAnchor="end">4.60</text>
                <line x1="80" y1="262.5" x2="1060" y2="262.5" strokeDasharray="2 3"/><text x="70" y="266" textAnchor="end">4.20</text>
                <line x1="80" y1="340" x2="1060" y2="340"/><text x="70" y="344" textAnchor="end">3.80</text>
              </g>
              <g fontFamily="JetBrains Mono" fontSize="10.5" fill="#6B6760" textAnchor="middle">
                <text x="80" y="365">1M</text><text x="164" y="365">3M</text><text x="237" y="365">6M</text>
                <text x="325" y="365">1Y</text><text x="437" y="365">2Y</text><text x="513" y="365">3Y</text>
                <text x="619" y="365">5Y</text><text x="706" y="365">7Y</text><text x="801" y="365">10Y</text>
                <text x="945" y="365">20Y</text><text x="1060" y="365">30Y</text>
              </g>
              <text x="30" y="185" fontFamily="Inter" fontSize="10" fill="#8E8A82" transform="rotate(-90, 30, 185)" textAnchor="middle" letterSpacing="1.4">YIELD (%)</text>
              <polyline points="80,66.56 164,89.81 237,120.81 325,144.06 437,173.13 513,198.31 619,225.44 706,231.25 801,221.56 945,186.69 1060,178.94" fill="none" stroke="#8E8A82" strokeWidth="1.4" strokeDasharray="1.5 3" opacity="0.65"/>
              <polyline points="80,20.75 164,47.88 237,92.44 325,140.75 437,187.13 513,218.13 619,245.25 706,233.63 801,225.88 945,183.00 1060,175.25" fill="none" stroke="#9D7E3E" strokeWidth="1.7" strokeDasharray="5 4" opacity="0.85"/>
              <path d="M 80,24.63 L 164,51.75 L 237,96.31 L 325,148.50 L 437,198.81 L 513,226.06 L 619,251.25 L 706,237.69 L 801,231.88 L 945,187.13 L 1060,179.38 L 1060,340 L 80,340 Z" fill="url(#emeraldFill)"/>
              <polyline points="80,24.63 164,51.75 237,96.31 325,148.50 437,198.81 513,226.06 619,251.25 706,237.69 801,231.88 945,187.13 1060,179.38" fill="none" stroke="#214B3D" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/>
              <g fill="#214B3D">
                <circle cx="80" cy="24.63" r="4"/><circle cx="164" cy="51.75" r="4"/><circle cx="237" cy="96.31" r="4"/>
                <circle cx="325" cy="148.50" r="4"/><circle cx="437" cy="198.81" r="4"/><circle cx="513" cy="226.06" r="4"/>
                <circle cx="619" cy="251.25" r="4"/><circle cx="706" cy="237.69" r="4"/><circle cx="801" cy="231.88" r="4"/>
                <circle cx="945" cy="187.13" r="4"/><circle cx="1060" cy="179.38" r="4"/>
              </g>
              <g fill="#F8F4EA" stroke="#214B3D" strokeWidth="1.6">
                <circle cx="619" cy="251.25" r="6"/><circle cx="801" cy="231.88" r="6"/>
              </g>
              <g fontFamily="JetBrains Mono" fontSize="11" fontWeight="600" fill="#1A1815">
                <text x="80" y="13" textAnchor="middle">5.32</text>
                <text x="619" y="268" textAnchor="middle" fill="#214B3D">4.15</text>
                <text x="1060" y="168" textAnchor="middle">4.52</text>
              </g>
              <g>
                <rect x="80" y="30" width="357" height="168.81" fill="#214B3D" opacity="0.04"/>
                <line x1="80" y1="198.81" x2="437" y2="198.81" stroke="#214B3D" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.5"/>
                <text x="258" y="52" fontFamily="Inter" fontSize="10" fontWeight="600" fill="#214B3D" textAnchor="middle" letterSpacing="1.4">INVERSION · SHORT-END ABOVE 2Y</text>
              </g>
              <g fontFamily="Fraunces" fontStyle="italic" fontSize="11" fill="#6B6760">
                <line x1="619" y1="260" x2="619" y2="282" stroke="#8E8A82" strokeWidth="0.6"/>
                <text x="619" y="298" textAnchor="middle">trough · the belly</text>
              </g>
            </svg>

            <div className="curve-stats">
              <div className="cs-item"><div className="cs-l">2s10s Spread</div><div className="cs-v neg">−17 bp</div><div className="cs-m">10Y 4.25 − 2Y 4.42</div></div>
              <div className="cs-item"><div className="cs-l">3m10y Spread</div><div className="cs-v neg">−93 bp</div><div className="cs-m">inverted</div></div>
              <div className="cs-item"><div className="cs-l">Curve Slope</div><div className="cs-v neg">−80 bp</div><div className="cs-m">30Y − 3M</div></div>
              <div className="cs-item"><div className="cs-l">Shape</div><div className="cs-v acc">Inverted</div><div className="cs-m">recession signal</div></div>
            </div>

            <div className="etf-note">
              <span className="etf-tag">Also covered</span>
              <span className="etf-text">Bond ETFs charted the same way · <b>TLT, IEF, SHY, LQD, HYG, AGG</b> · each with price, yield, duration and expense ratio.</span>
            </div>
          </div>
        </div>
      </section>

      {/* METHOD */}
      <section id="method" className="method">
        <div className="sec-inner">
          <div className="method-grid">
            <div className="method-left">
              <div className="eyebrow">The Canonical Example</div>
              <h2 className="sec-h">We do not <em>round.</em><br/>We reconcile.</h2>
              <p className="method-p">
                A six-percent semi-annual bond, thirty-three-sixty day count, bought on 2 January 2025 at a 5% yield, sold one year later at a 4% yield, on $1,000,000 face. Every fixed-income tool in the world should produce the same three numbers. We produce these:
              </p>
              <ul className="method-list">
                <li><span className="ml-n">I.</span><span className="ml-t">Carry P&amp;L</span><span className="ml-v">+$52,091</span></li>
                <li><span className="ml-n">II.</span><span className="ml-t">Market Move P&amp;L</span><span className="ml-v">+$37,399</span></li>
                <li><span className="ml-n">III.</span><span className="ml-t">Total Revenue</span><span className="ml-v">+$89,490</span></li>
              </ul>
              <p className="method-foot">The test suite runs twenty-plus reference trades on every deploy. If any number drifts, the build does not ship.</p>
            </div>

            <div className="formula">
              <div className="formula-tag">Method · §6.1</div>
              <h3 className="formula-h">Attribution, in four lines.</h3>
              <div className="formula-body">
                <div className="fl"><span className="fl-l">Repriced Entry</span><span className="fl-eq">=</span><span className="fl-r">invoice @ buy yield, sale date</span></div>
                <div className="fl"><span className="fl-l">Carry P&amp;L</span><span className="fl-eq">=</span><span className="fl-r">Repriced − Buy + Coupons</span></div>
                <div className="fl"><span className="fl-l">Market Move</span><span className="fl-eq">=</span><span className="fl-r">Sale − Repriced</span></div>
                <div className="fl total"><span className="fl-l">Total</span><span className="fl-eq">=</span><span className="fl-r">Carry + Market Move</span></div>
              </div>
              <p className="formula-note">Algebraically identical to sale minus purchase plus coupons. Intellectually, an answer to the question the cash P&amp;L never asks: <em>why did I make the money?</em></p>
            </div>
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="quote-sec">
        <div className="quote-inner">
          <div className="quote-mark">"</div>
          <p className="quote-text">For settlement math, round-trip attribution and curve context, I want <em>a scalpel</em> that opens in a browser tab · nothing to install, nothing to learn, answers in seconds.</p>
          <div className="quote-attrib">· A Fixed-Income Trader</div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section id="capabilities" className="caps">
        <div className="sec-inner">
          <div className="sec-head center">
            <div className="eyebrow">Platform Capabilities</div>
            <h2 className="sec-h">Every <em>capability</em> that matters<br/>for settlement &amp; analytics.</h2>
          </div>
          <div className="cap-grid">
            {[
              ['01', 'Settlement Math, Reproducible', "Clean price, dirty price, accrued interest, yield to maturity, modified duration and DV01 · computed under the conventions each bond was issued with. Reproducible to the counterparty's ticket."],
              ['02', 'Round-Trip Attribution', "Total return split into Carry and Market-Move using the repriced-entry method. A proper answer to <em>why</em> the trade made money."],
              ['03', 'Portfolio Analytics', "Aggregate yield, weighted duration, portfolio DV01, and a maturity ladder. Positions stored locally; export as JSON or CSV."],
              ['04', 'US Treasury Curve, Live', "Eleven tenors with historical overlays and spread summaries. Inversion flagged automatically. 2s10s and 3m10y computed below the chart."],
              ['05', 'Major Bond ETFs', "Price and context for TLT, IEF, SHY, LQD, HYG and AGG, alongside the government curve. The fastest read of the bond market."],
              ['06', 'Browser-Native', "Opens in any modern browser, with one account working across up to five devices simultaneously. No install, no VPN, no IT ticket."],
              ['07', 'PDF Settlement Tickets', "Every calculation exports to a clean PDF ticket with a unique reference number · for the back office, the audit trail, or your own records."],
              ['08', 'Priced for the Individual', "One subscription, one account, five active sessions. $100 a year or $11.50 a month. No per-seat surcharges."],
            ].map(([n, t, body]) => (
              <div key={n} className="cap">
                <div className="cap-n">{n}</div>
                <h4 className="cap-t">{t}</h4>
                <p className="cap-b" dangerouslySetInnerHTML={{ __html: body }}/>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="price-sec">
        <div className="sec-inner">
          <div className="sec-head center">
            <div className="eyebrow">Subscription</div>
            <h2 className="sec-h">One subscription.<br/><em>Five devices, all at once.</em></h2>
            <p className="sec-lede center-p">
              One account, signed in on up to five devices simultaneously. No tiers, no per-seat surcharges. Cancel anytime.
            </p>
          </div>

          <div className="plan">
            <div className="plan-l">
              <div className="plan-tag">The Account</div>
              <div className="plan-name">Yield <em>Calculator</em></div>
              <div className="plan-toggle">
                <button className={billing === 'yearly' ? 'on' : ''} onClick={() => setBilling('yearly')}>Annual</button>
                <button className={billing === 'monthly' ? 'on' : ''} onClick={() => setBilling('monthly')}>Monthly</button>
              </div>
              <div className="plan-price">
                <span className="cur">$</span>
                <span className="amt">{billing === 'yearly' ? '100' : '11.50'}</span>
                <span className="per">/ {billing === 'yearly' ? 'year' : 'month'}</span>
              </div>
              <p className="plan-note">
                {billing === 'yearly'
                  ? <><b>Annual · $100.</b> That works out to $8.33 per month, with the twelfth effectively free against monthly billing.</>
                  : <><b>Monthly · $11.50.</b> Cancel any month. Annual saves $38 over a full year.</>}
              </p>
              {billing === 'yearly' && <div className="plan-save">Save 28% vs monthly</div>}
            </div>
            <div className="plan-r">
              <div className="plan-feats-h">Everything included</div>
              <ul className="plan-feats">
                <li>All four modules · Calculator, Round-Trip, Portfolio, Curve</li>
                <li><b>Five simultaneous logins</b> on a single account</li>
                <li>Unlimited ISIN lookups and PDF settlement tickets</li>
                <li>Portfolio with live marks, import/export</li>
                <li>US Treasury curve with historical overlays</li>
                <li>Bond ETF pricing · TLT, IEF, LQD, HYG, AGG and more</li>
                <li>Email support, 24-hour reply</li>
              </ul>
              <Link href="/calc" className="plan-cta">Start 14-Day Free Trial</Link>
              <div className="plan-fine">No card required · cancel anytime</div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ft">
        <div className="ft-inner">
          <div className="ft-top">
            <div className="ft-brand-col">
              <div className="ft-brand">Yield <em>Calculator</em></div>
              <p className="ft-tag">Refined fixed-income analytics, in a browser tab. Priced for the analyst rather than the institution.</p>
            </div>
            <div className="ft-col">
              <h5>Modules</h5>
              <Link href="/calc">Calculator</Link>
              <Link href="/revenue">Round-Trip P&amp;L</Link>
              <Link href="/portfolio">Portfolio</Link>
              <Link href="/curve">Yield Curve &amp; ETFs</Link>
            </div>
            <div className="ft-col">
              <h5>Resources</h5>
              <a href="#method">Methodology</a>
              <a href="#capabilities">Capabilities</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="ft-col">
              <h5>Contact</h5>
              <a href="mailto:hello@yieldcalculator.tech">hello@yieldcalculator.tech</a>
            </div>
          </div>
          <div className="ft-bot">
            <div>© 2026 Yield Calculator</div>
            <div>v1.0 · Released April 2026</div>
          </div>
        </div>
      </footer>

      <div className="legal">
        For informational purposes only. Not financial advice. Not a regulated product. Not a book of record.
      </div>

      <style jsx>{`
        /* ── HEADER ── */
        .hd { position: sticky; top: 0; z-index: 100; background: rgba(248, 244, 234, 0.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--rule); }
        .hd-inner { max-width: var(--col); margin: 0 auto; padding: 16px var(--pad); display: flex; align-items: center; gap: 32px; }
        .hd-brand { display: flex; align-items: center; gap: 12px; }
        .hd-mark { width: 32px; height: 32px; background: var(--accent); color: var(--paper); display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 700; font-size: 13px; letter-spacing: -.02em; }
        .hd-name { font-family: var(--display); font-weight: 600; font-size: 18px; letter-spacing: -.015em; line-height: 1; }
        .hd-name :global(i) { font-style: italic; font-weight: 400; color: var(--ink-3); }
        .hd-nav { flex: 1; display: flex; gap: 30px; justify-content: flex-end; padding-right: 8px; }
        .hd-nav a { font-family: var(--sans); font-size: 13.5px; font-weight: 500; color: var(--ink-2); transition: color .15s; }
        .hd-nav a:hover { color: var(--accent); }
        .hd-cta { padding: 9px 18px; background: var(--ink); color: var(--paper); font-family: var(--sans); font-weight: 500; font-size: 13px; letter-spacing: .01em; transition: background .15s; }
        .hd-cta:hover { background: var(--accent); }

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

        /* ── HERO ── */
        .hero { padding: clamp(48px, 8vw, 96px) 0 clamp(48px, 7vw, 80px); }
        .hero-inner { max-width: var(--col); margin: 0 auto; padding: 0 var(--pad); display: grid; grid-template-columns: 1.4fr 1fr; gap: clamp(32px, 5vw, 72px); align-items: start; }
        .eyebrow { font-family: var(--sans); font-weight: 600; font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); margin-bottom: 22px; display: flex; align-items: center; gap: 12px; }
        .eyebrow::before { content: ""; width: 28px; height: 1px; background: var(--accent); }
        .hero-h { font-family: var(--display); font-weight: 500; font-size: clamp(40px, 6.2vw, 80px); line-height: 1.02; letter-spacing: -.025em; color: var(--ink); margin-bottom: 32px; font-variation-settings: "opsz" 96; }
        .hero-h :global(em) { font-style: italic; font-weight: 400; color: var(--accent); font-variation-settings: "opsz" 96; }
        .hero-lede { font-family: var(--sans); font-size: 18px; line-height: 1.6; color: var(--ink-2); max-width: 560px; margin-bottom: 36px; }
        .hero-cta { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; margin-bottom: 48px; }
        .btn-fill { padding: 13px 28px; background: var(--accent); color: var(--paper); font-family: var(--sans); font-weight: 500; font-size: 14px; letter-spacing: .01em; transition: background .15s; }
        .btn-fill:hover { background: var(--accent-2); }
        .btn-link { font-family: var(--sans); font-weight: 500; font-size: 14px; color: var(--ink); border-bottom: 1px solid var(--ink); padding-bottom: 2px; transition: all .15s; }
        .btn-link:hover { color: var(--accent); border-color: var(--accent); }
        .hero-foot { display: flex; gap: 28px; align-items: center; padding-top: 28px; border-top: 1px solid var(--rule); }
        .hero-foot > div:not(.div) { display: flex; flex-direction: column; gap: 2px; }
        .hero-foot b { font-family: var(--display); font-weight: 600; font-size: 22px; letter-spacing: -.015em; color: var(--ink); font-variation-settings: "opsz" 24; }
        .hero-foot span { font-family: var(--sans); font-size: 11px; font-weight: 500; color: var(--ink-3); letter-spacing: .04em; text-transform: uppercase; }
        .hero-foot .div { width: 1px; height: 36px; background: var(--rule); }

        .specimen { background: var(--paper-2); border: 1px solid var(--rule); padding: 32px 30px; box-shadow: 0 1px 0 var(--rule-soft), 0 24px 48px -24px rgba(26, 24, 21, 0.12); }
        .spec-label { font-family: var(--sans); font-size: 10px; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; color: var(--ink-4); margin-bottom: 16px; }
        .spec-isin { font-family: var(--mono); font-weight: 600; font-size: 13px; color: var(--ink); letter-spacing: .04em; }
        .spec-desc { font-family: var(--display); font-style: italic; font-weight: 400; font-size: 16px; color: var(--ink-2); margin-top: 4px; }
        .spec-divider { height: 1px; background: var(--rule); margin: 18px 0 12px; }
        .spec-divider.strong { background: var(--ink); height: 1px; margin: 16px 0 12px; }
        .spec-row { display: flex; justify-content: space-between; align-items: baseline; padding: 6px 0; font-size: 13px; }
        .spec-row span { font-family: var(--sans); color: var(--ink-3); font-weight: 400; }
        .spec-row b { font-family: var(--mono); font-weight: 500; color: var(--ink); font-size: 12.5px; }
        .spec-row b.hl { color: var(--gold); font-weight: 600; }
        .spec-total { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0 4px; }
        .spec-total span { font-family: var(--sans); font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); }
        .spec-total b { font-family: var(--display); font-weight: 600; font-size: 24px; letter-spacing: -.015em; color: var(--accent); font-variation-settings: "opsz" 36; }
        .spec-meta { font-family: var(--mono); font-size: 11px; color: var(--ink-4); margin-top: 4px; }

        /* ── SECTIONS ── */
        .sec-inner { max-width: var(--col); margin: 0 auto; padding: 0 var(--pad); }
        .sec-head { margin-bottom: 56px; }
        .sec-head.center { text-align: center; }
        .sec-head.center .eyebrow { justify-content: center; }
        .sec-head.center .eyebrow::before { display: none; }
        .sec-head.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: end; }
        .sec-h { font-family: var(--display); font-weight: 500; font-size: clamp(34px, 5vw, 60px); line-height: 1.04; letter-spacing: -.022em; color: var(--ink); font-variation-settings: "opsz" 72; }
        .sec-h :global(em) { font-style: italic; font-weight: 400; color: var(--accent); font-variation-settings: "opsz" 72; }
        .sec-lede { font-family: var(--sans); font-size: 17px; line-height: 1.6; color: var(--ink-2); max-width: 560px; margin-top: 20px; }
        .sec-lede.right { margin-top: 0; max-width: 460px; justify-self: end; }
        .sec-lede.center-p { max-width: 600px; margin: 20px auto 0; text-align: center; }

        /* ── MODULES ── */
        .modules { padding: clamp(64px, 8vw, 112px) 0; border-top: 1px solid var(--rule); }
        .mods { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--rule); border: 1px solid var(--rule); }
        .mod { background: var(--paper-2); padding: 40px 36px 44px; position: relative; transition: background .25s, color .25s; min-height: 360px; display: flex; flex-direction: column; }
        .mod:hover { background: var(--accent-soft); }
        .mod-num { font-family: var(--mono); font-size: 11px; letter-spacing: .22em; color: var(--ink-4); margin-bottom: 14px; }
        .mod-h { font-family: var(--display); font-weight: 500; font-size: 32px; line-height: 1.05; letter-spacing: -.02em; color: var(--ink); margin-bottom: 18px; font-variation-settings: "opsz" 36; }
        .mod-h :global(em) { font-style: italic; font-weight: 400; color: var(--accent); font-variation-settings: "opsz" 36; }
        .mod-body { font-family: var(--sans); font-size: 15px; line-height: 1.6; color: var(--ink-2); flex-grow: 1; margin-bottom: 24px; }
        .mod-tags { display: flex; flex-wrap: wrap; gap: 6px 14px; padding-top: 16px; border-top: 1px solid var(--rule); font-family: var(--sans); font-size: 10.5px; color: var(--ink-3); letter-spacing: .08em; text-transform: uppercase; font-weight: 500; }
        .mod-tags span { display: flex; align-items: center; gap: 6px; }
        .mod-tags span::before { content: ""; width: 4px; height: 4px; background: var(--accent); border-radius: 50%; }
        .mod-route { position: absolute; top: 40px; right: 36px; font-family: var(--mono); font-size: 11px; color: var(--ink-4); }

        /* ── CURVE ── */
        .curve-sec { padding: clamp(64px, 8vw, 112px) 0; background: var(--paper-3); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
        .curve-card { background: var(--paper-2); border: 1px solid var(--rule); padding: 28px 32px 32px; }
        .curve-card-hd { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 16px; border-bottom: 1px solid var(--rule); margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .curve-title { font-family: var(--display); font-weight: 500; font-size: 22px; letter-spacing: -.015em; font-variation-settings: "opsz" 24; }
        .curve-sub { font-family: var(--mono); font-size: 11px; color: var(--ink-3); margin-top: 4px; }
        .curve-legend { display: flex; gap: 18px; flex-wrap: wrap; }
        .curve-legend span { display: flex; align-items: center; gap: 8px; font-family: var(--sans); font-size: 12px; color: var(--ink-2); font-weight: 500; }
        .ll { width: 18px; height: 0; }
        .ll.solid { border-top: 2px solid var(--accent); }
        .ll.dashed { border-top: 2px dashed var(--gold); }
        .ll.dotted { border-top: 2px dotted var(--ink-3); }
        .curve-svg { width: 100%; height: auto; display: block; }
        .curve-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--rule); border: 1px solid var(--rule); margin-top: 24px; }
        .cs-item { background: var(--paper-2); padding: 16px 18px; }
        .cs-l { font-family: var(--sans); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; margin-bottom: 6px; }
        .cs-v { font-family: var(--display); font-weight: 600; font-size: 22px; letter-spacing: -.015em; font-variation-settings: "opsz" 28; }
        .cs-v.neg { color: var(--bear); }
        .cs-v.pos { color: var(--bull); }
        .cs-v.acc { color: var(--accent); }
        .cs-m { font-family: var(--mono); font-size: 10.5px; color: var(--ink-3); margin-top: 3px; }
        .etf-note { margin-top: 24px; padding: 16px 20px; background: var(--accent-soft); border-left: 3px solid var(--accent); display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
        .etf-tag { font-family: var(--sans); font-weight: 600; font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); white-space: nowrap; }
        .etf-text { font-family: var(--sans); font-size: 14px; color: var(--ink-2); flex: 1; }
        .etf-text :global(b) { color: var(--accent); font-weight: 600; }

        /* ── METHOD ── */
        .method { padding: clamp(64px, 8vw, 112px) 0; }
        .method-grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(40px, 6vw, 72px); align-items: start; }
        .method-p { font-family: var(--sans); font-size: 17px; line-height: 1.65; color: var(--ink-2); margin: 24px 0 28px; }
        .method-list { list-style: none; }
        .method-list li { padding: 14px 0; border-top: 1px solid var(--rule); display: grid; grid-template-columns: 32px 1fr auto; gap: 16px; align-items: center; }
        .method-list li:last-child { border-bottom: 1px solid var(--rule); }
        .ml-n { font-family: var(--mono); color: var(--ink-4); font-size: 11px; letter-spacing: .12em; }
        .ml-t { font-family: var(--display); font-weight: 500; font-size: 16px; color: var(--ink); }
        .ml-v { font-family: var(--mono); font-size: 13px; color: var(--accent); font-weight: 600; }
        .method-foot { font-family: var(--sans); font-style: italic; font-size: 14px; color: var(--ink-3); margin-top: 24px; line-height: 1.6; }
        .formula { background: var(--paper-2); border: 1px solid var(--rule); padding: 36px 32px; position: relative; }
        .formula-tag { position: absolute; top: -12px; left: 24px; background: var(--paper); padding: 0 12px; font-family: var(--sans); font-size: 10px; color: var(--ink-4); letter-spacing: .2em; text-transform: uppercase; font-weight: 600; }
        .formula-h { font-family: var(--display); font-style: italic; font-weight: 400; font-size: 22px; margin-bottom: 24px; padding-bottom: 14px; border-bottom: 1px solid var(--rule); font-variation-settings: "opsz" 24; }
        .formula-body { display: flex; flex-direction: column; gap: 1px; }
        .fl { display: grid; grid-template-columns: 1fr auto 1.4fr; gap: 16px; align-items: baseline; padding: 10px 0; border-bottom: 1px dashed var(--rule); font-size: 13px; }
        .fl-l { font-family: var(--sans); font-weight: 500; color: var(--ink-2); }
        .fl-eq { font-family: var(--display); font-style: italic; color: var(--ink-4); }
        .fl-r { font-family: var(--mono); font-size: 12.5px; color: var(--ink); text-align: right; }
        .fl.total { border-bottom: none; border-top: 1px solid var(--ink); margin-top: 6px; padding-top: 14px; font-weight: 700; }
        .fl.total .fl-l { color: var(--accent); font-weight: 600; }
        .fl.total .fl-r { color: var(--accent); font-weight: 600; }
        .formula-note { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--rule); font-family: var(--sans); font-style: italic; font-size: 13.5px; color: var(--ink-3); line-height: 1.6; }
        .formula-note :global(em) { color: var(--ink); font-weight: 500; font-style: italic; }

        /* ── QUOTE ── */
        .quote-sec { padding: clamp(64px, 9vw, 120px) 0; background: var(--ink); color: var(--paper); }
        .quote-inner { max-width: 880px; margin: 0 auto; padding: 0 var(--pad); text-align: center; }
        .quote-mark { font-family: var(--display); font-style: italic; font-size: 110px; line-height: .4; color: var(--accent-2); margin-bottom: 14px; font-weight: 600; }
        .quote-text { font-family: var(--display); font-style: italic; font-weight: 300; font-size: clamp(24px, 3.8vw, 42px); line-height: 1.3; margin-bottom: 28px; font-variation-settings: "opsz" 60; }
        .quote-text :global(em) { font-style: normal; color: var(--paper); background: var(--accent); padding: 0 .25em; font-weight: 400; }
        .quote-attrib { font-family: var(--sans); font-size: 11px; letter-spacing: .25em; text-transform: uppercase; color: rgba(248, 244, 234, 0.55); font-weight: 500; }

        /* ── CAPABILITIES ── */
        .caps { padding: clamp(64px, 8vw, 112px) 0; }
        .cap-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--rule); border: 1px solid var(--rule); }
        .cap { background: var(--paper-2); padding: 28px 26px 32px; transition: background .25s; }
        .cap:hover { background: var(--accent-soft); }
        .cap-n { font-family: var(--mono); font-size: 11px; letter-spacing: .22em; color: var(--accent); font-weight: 500; margin-bottom: 12px; }
        .cap-t { font-family: var(--display); font-weight: 500; font-size: 19px; line-height: 1.2; letter-spacing: -.015em; color: var(--ink); margin-bottom: 10px; font-variation-settings: "opsz" 24; }
        .cap-b { font-family: var(--sans); font-size: 14px; line-height: 1.6; color: var(--ink-2); }
        .cap-b :global(em) { font-style: italic; color: var(--accent); }

        /* ── PRICING ── */
        .price-sec { padding: clamp(64px, 8vw, 112px) 0; background: var(--paper-3); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
        .plan { max-width: 760px; margin: 0 auto; background: var(--ink); color: var(--paper); display: grid; grid-template-columns: 1fr 1fr; box-shadow: 0 32px 64px -28px rgba(26, 24, 21, 0.4); }
        .plan-l { padding: 44px 38px; border-right: 1px solid rgba(248, 244, 234, 0.12); position: relative; }
        .plan-r { padding: 44px 38px; }
        .plan-tag { font-family: var(--sans); font-size: 10px; letter-spacing: .25em; text-transform: uppercase; color: rgba(248, 244, 234, 0.5); font-weight: 600; margin-bottom: 14px; }
        .plan-name { font-family: var(--display); font-weight: 500; font-size: 32px; line-height: 1; letter-spacing: -.02em; margin-bottom: 28px; font-variation-settings: "opsz" 36; }
        .plan-name :global(em) { font-style: italic; font-weight: 400; color: var(--accent-2); font-variation-settings: "opsz" 36; }
        .plan-toggle { display: flex; background: rgba(248, 244, 234, 0.06); padding: 4px; margin-bottom: 28px; }
        .plan-toggle button { flex: 1; padding: 9px 14px; font-family: var(--sans); font-size: 12px; font-weight: 500; letter-spacing: .02em; color: rgba(248, 244, 234, 0.55); transition: all .2s; }
        .plan-toggle button.on { background: var(--accent); color: var(--paper); }
        .plan-price { font-family: var(--display); font-weight: 600; letter-spacing: -.04em; line-height: .9; display: flex; align-items: baseline; gap: 4px; margin-bottom: 16px; font-variation-settings: "opsz" 144; }
        .cur { font-size: 28px; font-weight: 400; color: rgba(248, 244, 234, 0.55); }
        .amt { font-size: 76px; }
        .per { font-family: var(--mono); font-size: 13px; font-weight: 400; color: rgba(248, 244, 234, 0.55); margin-left: 8px; letter-spacing: .04em; }
        .plan-note { font-family: var(--sans); font-size: 14px; color: rgba(248, 244, 234, 0.7); font-style: italic; line-height: 1.55; padding-top: 16px; border-top: 1px solid rgba(248, 244, 234, 0.12); }
        .plan-note :global(b) { color: var(--paper); font-style: normal; font-weight: 600; }
        .plan-save { position: absolute; top: 22px; right: -14px; background: var(--accent); color: var(--paper); font-family: var(--sans); font-size: 10px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; padding: 6px 14px; transform: rotate(0); }
        .plan-feats-h { font-family: var(--sans); font-size: 10px; letter-spacing: .25em; text-transform: uppercase; color: rgba(248, 244, 234, 0.55); font-weight: 600; margin-bottom: 18px; }
        .plan-feats { list-style: none; margin-bottom: 30px; }
        .plan-feats li { padding: 10px 0; border-bottom: 1px solid rgba(248, 244, 234, 0.1); font-family: var(--sans); font-size: 14px; line-height: 1.5; display: grid; grid-template-columns: 16px 1fr; gap: 12px; align-items: start; }
        .plan-feats li::before { content: "+"; color: var(--accent-2); font-family: var(--mono); font-weight: 700; font-size: 14px; line-height: 1.4; }
        .plan-feats :global(b) { font-weight: 600; }
        .plan-cta { display: block; width: 100%; padding: 15px; background: var(--accent); color: var(--paper); font-family: var(--sans); font-weight: 500; font-size: 13.5px; letter-spacing: .02em; transition: background .15s; text-align: center; }
        .plan-cta:hover { background: var(--accent-2); }
        .plan-fine { margin-top: 12px; font-family: var(--mono); font-size: 10.5px; color: rgba(248, 244, 234, 0.45); letter-spacing: .05em; text-align: center; }

        /* ── FOOTER ── */
        .ft { background: var(--ink); color: var(--paper); padding: clamp(48px, 6vw, 80px) 0 28px; }
        .ft-inner { max-width: var(--col); margin: 0 auto; padding: 0 var(--pad); }
        .ft-top { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 48px; padding-bottom: 36px; border-bottom: 1px solid rgba(248, 244, 234, 0.12); }
        .ft-brand { font-family: var(--display); font-weight: 600; font-size: 36px; letter-spacing: -.025em; line-height: 1; margin-bottom: 14px; font-variation-settings: "opsz" 72; }
        .ft-brand :global(em) { font-style: italic; font-weight: 400; color: var(--accent-2); }
        .ft-tag { font-family: var(--sans); font-size: 14px; line-height: 1.6; color: rgba(248, 244, 234, 0.6); max-width: 360px; }
        .ft-col h5 { font-family: var(--sans); font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: rgba(248, 244, 234, 0.4); margin-bottom: 14px; font-weight: 600; }
        .ft-col a { display: block; padding: 4px 0; font-family: var(--sans); font-size: 14px; color: rgba(248, 244, 234, 0.85); transition: color .15s; }
        .ft-col a:hover { color: var(--accent-2); }
        .ft-bot { padding-top: 24px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-family: var(--sans); font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: rgba(248, 244, 234, 0.4); font-weight: 500; }
        .legal { background: #0F0E0C; color: rgba(248, 244, 234, 0.5); padding: 18px var(--pad); text-align: center; font-family: var(--sans); font-style: italic; font-size: 13px; }

        /* ── RESPONSIVE ── */
        @media (max-width: 960px) {
          .hd-nav { display: none; }
          .hero-inner { grid-template-columns: 1fr; }
          .sec-head.two-col { grid-template-columns: 1fr; }
          .sec-lede.right { justify-self: start; }
          .mods { grid-template-columns: 1fr; }
          .method-grid { grid-template-columns: 1fr; }
          .cap-grid { grid-template-columns: repeat(2, 1fr); }
          .plan { grid-template-columns: 1fr; }
          .plan-l { border-right: none; border-bottom: 1px solid rgba(248, 244, 234, 0.12); }
          .ft-top { grid-template-columns: 1fr 1fr; gap: 32px; }
        }
        @media (max-width: 560px) {
          .hd-inner { gap: 16px; }
          .hero-foot { flex-wrap: wrap; gap: 16px 28px; }
          .hero-foot .div { display: none; }
          .curve-stats { grid-template-columns: 1fr 1fr; }
          .cap-grid { grid-template-columns: 1fr; }
          .ft-top { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
