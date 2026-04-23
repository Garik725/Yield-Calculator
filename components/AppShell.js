// components/AppShell.js
// Shared masthead + nav for all product pages (/calc, /revenue, /portfolio, /curve)
// Landing page (/) has its own full masthead and does NOT use this shell.
 
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
 
const NAV = [
  { href: '/calc',      label: 'Calculator',  short: 'CALC' },
  { href: '/revenue',   label: 'Round-Trip',  short: 'P&L' },
  { href: '/portfolio', label: 'Portfolio',   short: 'BOOK' },
  { href: '/curve',     label: 'Yield Curve', short: 'CURVE' },
];
 
export default function AppShell({ children, title = 'Yield Calculator' }) {
  const router = useRouter();
 
  return (
    <>
      <Head>
        <title>{title} — Yield Calculator</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;0,8..60,700;1,8..60,400&family=Libre+Franklin:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>
 
      <style jsx global>{`
        :root {
          --paper: #F7F5EF;
          --paper-2: #F0EDE4;
          --paper-dim: #E8E4D9;
          --ink: #121212;
          --ink-2: #333333;
          --ink-3: #555555;
          --ink-4: #767676;
          --muted: #8D8A80;
          --rule: #CFC9BC;
          --rule-soft: #DDD6C5;
          --accent: #A11E22;
          --accent-dim: #F3E1E1;
          --bull: #0A7A3C;
          --bull-dim: #E1ECDE;
          --gold: #946B0F;
          --gold-dim: #F1E8CE;
          --display: 'Playfair Display', Georgia, serif;
          --body: 'Source Serif 4', Georgia, serif;
          --sans: 'Libre Franklin', 'Helvetica Neue', sans-serif;
          --mono: 'JetBrains Mono', ui-monospace, monospace;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        body {
          background: var(--paper); color: var(--ink);
          font-family: var(--body); font-size: 16px; line-height: 1.55;
          font-feature-settings: "kern", "liga", "onum";
        }
        a { color: inherit; text-decoration: none; }
        button { font-family: inherit; border: none; background: none; cursor: pointer; color: inherit; }
        input, select, textarea { font-family: var(--body); font-size: 15px; }
      `}</style>
 
      <header className="app-shell">
        <div className="shell-top">
          <Link href="/" className="shell-brand">
            <div className="brand-mark">Y</div>
            <div className="brand-text">
              <div className="brand-name">Yield <i>Calculator</i></div>
              <div className="brand-tag">Fixed-Income Analytics</div>
            </div>
          </Link>
 
          <nav className="shell-nav">
            {NAV.map(item => {
              const active = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shell-nav-link${active ? ' active' : ''}`}
                >
                  <span className="nav-short">{item.short}</span>
                  <span className="nav-full">{item.label}</span>
                </Link>
              );
            })}
          </nav>
 
          <div className="shell-right">
            <Clock />
          </div>
        </div>
      </header>
 
      <main className="shell-main">{children}</main>
 
      <footer className="shell-footer">
        <div className="shell-footer-inner">
          <div>
            © 2026 Yield Calculator ·{' '}
            <Link href="/">Home</Link> ·{' '}
            <a href="mailto:hello@yieldcalculator.tech">Contact</a>
          </div>
          <div className="shell-disclaimer">
            For informational purposes only. Not financial advice. Not a regulated product.
          </div>
        </div>
      </footer>
 
      <style jsx>{`
        .app-shell {
          background: var(--paper);
          border-bottom: 2px solid var(--ink);
          position: sticky; top: 0; z-index: 100;
        }
        .shell-top {
          max-width: 1280px; margin: 0 auto;
          padding: 12px 24px;
          display: flex; align-items: center; gap: 28px;
        }
        .shell-brand {
          display: flex; align-items: center; gap: 12px;
          padding-right: 20px; border-right: 1px solid var(--rule);
          transition: opacity .15s;
        }
        .shell-brand:hover { opacity: .7; }
        .brand-mark {
          width: 36px; height: 36px;
          background: var(--ink); color: var(--paper);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--display); font-weight: 800; font-size: 20px;
          letter-spacing: -0.02em;
        }
        .brand-name {
          font-family: var(--display); font-weight: 700;
          font-size: 18px; letter-spacing: -0.015em; line-height: 1; color: var(--ink);
        }
        .brand-name :global(i) { font-style: italic; font-weight: 500; color: var(--ink-2); }
        .brand-tag {
          font-family: var(--sans); font-weight: 600;
          font-size: 9.5px; letter-spacing: .18em; text-transform: uppercase;
          color: var(--ink-3); margin-top: 3px;
        }
        .shell-nav {
          display: flex; gap: 4px; flex: 1;
        }
        .shell-nav-link {
          padding: 10px 16px;
          font-family: var(--sans); font-weight: 600; font-size: 12.5px;
          letter-spacing: .02em; color: var(--ink-3);
          border-bottom: 2px solid transparent;
          transition: color .15s, border-color .15s;
          display: flex; align-items: center;
        }
        .shell-nav-link:hover { color: var(--ink); }
        .shell-nav-link.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
        }
        .nav-short { display: none; font-family: var(--mono); letter-spacing: .05em; }
        .nav-full { display: inline; }
        .shell-right {
          display: flex; align-items: center; gap: 14px;
          font-family: var(--mono); font-size: 11px; color: var(--ink-3); letter-spacing: .04em;
        }
 
        .shell-main { min-height: calc(100vh - 120px); }
 
        .shell-footer {
          border-top: 1px solid var(--rule);
          padding: 24px; background: var(--paper);
          margin-top: 48px;
        }
        .shell-footer-inner {
          max-width: 1280px; margin: 0 auto;
          display: flex; justify-content: space-between; align-items: center;
          gap: 16px; flex-wrap: wrap;
          font-family: var(--sans); font-size: 11.5px; color: var(--ink-3);
        }
        .shell-footer :global(a) { color: var(--ink-2); transition: color .15s; }
        .shell-footer :global(a:hover) { color: var(--accent); }
        .shell-disclaimer {
          font-family: var(--body); font-style: italic;
          font-size: 11.5px; color: var(--ink-4);
        }
 
        @media (max-width: 780px) {
          .shell-top { padding: 10px 16px; gap: 14px; }
          .brand-text { display: none; }
          .shell-brand { padding-right: 12px; }
          .shell-nav { gap: 0; }
          .shell-nav-link { padding: 10px 10px; font-size: 11px; }
          .nav-short { display: inline; }
          .nav-full { display: none; }
          .shell-right { display: none; }
        }
      `}</style>
    </>
  );
}
 
function Clock() {
  const [t, setT] = useClientClock();
  return <span>{t}</span>;
}
 
// Client-only clock hook (avoids hydration mismatch)
function useClientClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    }));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);
  return [time];
}
 
