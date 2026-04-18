// pages/index.js
import Head from 'next/head';
import Link from 'next/link';

const GUMROAD_URL = "https://YOUR_USERNAME.gumroad.com/l/yield-calculator";

export default function Home() {
  return (
    <>
      <Head>
        <title>Yield Calculator — Bond Settlement Tool</title>
        <meta name="description" content="Professional bond settlement calculator. Enter an ISIN, type a price or yield, get the full settlement invoice. PDF export included. $19 one-time."/>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      </Head>
      <style>{`
        :root{--bg:#F7F6F3;--surface:#fff;--border:#E4E0D8;--border2:#D4CEC6;--text:#0A0F1A;--text2:#4A5568;--text3:#9AA3AF;--blue:#1755CC;--blue-dim:#EBF1FF;--green:#0A7C3E;--green-dim:#E6F5EE;--mono:'IBM Plex Mono',monospace;--sans:'Inter',sans-serif;}
        *{box-sizing:border-box;margin:0;padding:0;}body{background:var(--bg);color:var(--text);font-family:var(--sans);}a{text-decoration:none;color:inherit;}
        nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);padding:0 28px;height:54px;display:flex;align-items:center;gap:14px;}
        .logo{display:flex;align-items:center;gap:8px;}.logo-sq{width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#1755CC,#0A3A99);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;font-family:var(--mono);}.logo-name{font-size:14px;font-weight:700;}
        .nav-r{margin-left:auto;display:flex;gap:10px;align-items:center;}
        .btn-demo{padding:7px 16px;border:1.5px solid var(--border2);border-radius:7px;font-size:12.5px;font-weight:600;color:var(--text2);background:transparent;cursor:pointer;transition:all .13s;}.btn-demo:hover{border-color:var(--blue);color:var(--blue);}
        .btn-buy-sm{padding:7px 18px;background:var(--blue);color:#fff;border:none;border-radius:7px;font-size:12.5px;font-weight:700;cursor:pointer;transition:background .13s;}.btn-buy-sm:hover{background:#1040AA;}
        #hero{padding:68px 28px 60px;text-align:center;background:linear-gradient(180deg,#fff 0%,var(--bg) 100%);border-bottom:1px solid var(--border);}
        .pill{display:inline-flex;align-items:center;gap:6px;background:var(--blue-dim);color:var(--blue);padding:4px 13px;border-radius:20px;font-size:11.5px;font-weight:700;letter-spacing:.3px;margin-bottom:20px;border:1px solid rgba(23,85,204,.14);}
        h1{font-size:46px;font-weight:800;line-height:1.13;letter-spacing:-1.5px;margin-bottom:16px;max-width:720px;margin-left:auto;margin-right:auto;}
        .hero-sub{font-size:17px;color:var(--text2);max-width:480px;margin:0 auto 30px;line-height:1.65;}
        .hero-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:13px;}
        .btn-big{padding:13px 30px;background:var(--blue);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;transition:all .14s;box-shadow:0 4px 14px rgba(23,85,204,.28);}.btn-big:hover{background:#1040AA;transform:translateY(-1px);}
        .btn-big-out{padding:13px 22px;background:transparent;color:var(--blue);border:1.5px solid var(--blue);border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;transition:all .13s;}.btn-big-out:hover{background:var(--blue-dim);}
        .hero-note{font-size:12px;color:var(--text3);}
        .mockup{max-width:700px;margin:44px auto 0;background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:0 6px 36px rgba(0,0,0,.09);overflow:hidden;}
        .mkbar{background:#F2F0EC;border-bottom:1px solid var(--border);padding:10px 16px;display:flex;align-items:center;gap:7px;}
        .mkdot{width:10px;height:10px;border-radius:50%;}
        .mkurl{flex:1;background:#fff;border:1px solid var(--border);border-radius:5px;padding:3px 11px;font-size:11px;font-family:var(--mono);color:var(--text3);margin:0 10px;}
        .mkbody{padding:20px 22px;}
        .mk-isin{padding:9px 12px;background:#F9F8F6;border:1.5px solid var(--border2);border-radius:7px;font-size:13px;font-family:var(--mono);margin-bottom:13px;}
        .mk-bs{display:flex;gap:7px;margin-bottom:12px;}
        .mk-buy{padding:7px 22px;background:var(--green-dim);border:1.5px solid var(--green);border-radius:6px;font-size:12px;font-weight:700;color:var(--green);}
        .mk-sell{padding:7px 22px;background:#F9F8F6;border:1.5px solid var(--border2);border-radius:6px;font-size:12px;font-weight:600;color:var(--text3);}
        .mk-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:13px;}
        .mk-fl{font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--text3);margin-bottom:3px;}
        .mk-fv{padding:8px 10px;background:#F9F8F6;border:1.5px solid var(--border2);border-radius:6px;font-size:13px;font-family:var(--mono);font-weight:500;}
        .mk-fv.lit{border-color:#8A6200;background:#FEF7E6;color:#8A6200;}
        .mk-div{border:none;border-top:1px solid var(--border);margin:13px 0;}
        .mk-inv{background:#F9F8F6;border:1px solid var(--border);border-radius:8px;overflow:hidden;}
        .mk-inv-row{display:flex;justify-content:space-between;align-items:center;padding:10px 13px;border-bottom:1px solid var(--border);}
        .mk-inv-row:last-child{border-bottom:none;background:var(--blue-dim);}
        .mk-inv-label{font-size:12.5px;font-weight:500;}.mk-inv-sub{font-size:10px;color:var(--text3);margin-top:1px;font-family:var(--mono);}
        .mk-inv-val{font-size:14px;font-family:var(--mono);font-weight:700;}
        .mk-total-label{font-size:13px;font-weight:700;color:var(--blue);}.mk-total-val{font-size:20px;font-family:var(--mono);font-weight:800;color:var(--green);}
        #features{padding:68px 28px;max-width:1040px;margin:0 auto;}
        .sec-label{font-size:10.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--blue);margin-bottom:9px;}
        .sec-title{font-size:30px;font-weight:800;letter-spacing:-.8px;margin-bottom:36px;}
        .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
        .feat{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px 22px;}
        .feat-icon{font-size:20px;margin-bottom:11px;}.feat-title{font-size:14.5px;font-weight:700;margin-bottom:6px;}.feat-desc{font-size:13px;color:var(--text2);line-height:1.6;}
        #pricing{padding:68px 28px;text-align:center;}
        .price-box{max-width:500px;margin:36px auto 0;background:var(--surface);border:2px solid var(--blue);border-radius:18px;overflow:hidden;box-shadow:0 6px 30px rgba(23,85,204,.11);}
        .price-top{background:var(--blue);padding:10px 24px;display:flex;justify-content:space-between;align-items:center;}
        .price-top-label{color:#fff;font-size:10.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;}
        .price-top-badge{background:rgba(255,255,255,.18);color:#fff;font-size:10.5px;font-weight:700;padding:2px 10px;border-radius:20px;}
        .price-body{padding:30px 34px;}
        .price-amt{display:flex;align-items:flex-end;gap:8px;justify-content:center;margin-bottom:4px;}
        .price-num{font-size:58px;font-weight:800;letter-spacing:-2px;line-height:1;}
        .price-was{font-size:15px;color:var(--text3);text-decoration:line-through;padding-bottom:7px;}
        .price-once{color:var(--green);font-size:13px;font-weight:700;margin-bottom:22px;}
        .price-feats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:26px;text-align:left;}
        .pf{display:flex;gap:8px;font-size:12.5px;color:var(--text2);}.pfc{color:var(--green);font-weight:700;}
        .btn-buy-big{width:100%;padding:14px;background:var(--blue);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:800;cursor:pointer;transition:all .14s;box-shadow:0 4px 13px rgba(23,85,204,.24);}.btn-buy-big:hover{background:#1040AA;transform:translateY(-1px);}
        .price-note{font-size:11px;color:var(--text3);margin-top:11px;}
        #cta{padding:68px 28px;text-align:center;background:linear-gradient(135deg,#0A2A6E,#1755CC);}
        #cta h2{font-size:34px;font-weight:800;color:#fff;letter-spacing:-.8px;margin-bottom:11px;}
        #cta p{font-size:15.5px;color:rgba(255,255,255,.68);max-width:440px;margin:0 auto 28px;}
        .btn-cta{padding:14px 34px;background:#fff;color:var(--blue);border:none;border-radius:10px;font-size:15px;font-weight:800;cursor:pointer;transition:all .14s;box-shadow:0 4px 16px rgba(0,0,0,.16);}.btn-cta:hover{transform:translateY(-2px);}
        .cta-note{font-size:12px;color:rgba(255,255,255,.4);margin-top:11px;}
        footer{background:#0A0F1A;color:rgba(255,255,255,.38);padding:28px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;align-items:center;}
        .footer-logo{display:flex;align-items:center;gap:8px;color:rgba(255,255,255,.72);font-weight:700;font-size:13px;}
        .footer-links{display:flex;gap:16px;}.footer-links a{font-size:12px;color:rgba(255,255,255,.32);transition:color .13s;}.footer-links a:hover{color:rgba(255,255,255,.72);}
        .footer-copy{font-size:11px;width:100%;margin-top:4px;}
        @media(max-width:820px){h1{font-size:32px;}.feat-grid{grid-template-columns:1fr 1fr;}.mk-grid{grid-template-columns:1fr;}}
        @media(max-width:520px){h1{font-size:26px;}.feat-grid{grid-template-columns:1fr;}.price-feats{grid-template-columns:1fr;}}
      `}</style>

      <nav>
        <div className="logo"><div className="logo-sq">Y</div><div className="logo-name">Yield Calculator</div></div>
        <div className="nav-r">
          <Link href="/calc"><button className="btn-demo">Live Demo</button></Link>
          <button className="btn-buy-sm" onClick={() => window.open(GUMROAD_URL,'_blank')}>Buy — $19</button>
        </div>
      </nav>

      <section id="hero">
        <div className="pill">⚡ For Fixed Income Professionals</div>
        <h1>Bond settlement calculations.<br/>Fast, accurate, professional.</h1>
        <p className="hero-sub">Enter an ISIN, type a price or yield, set a settlement date — get the full invoice instantly. Export as PDF.</p>
        <div className="hero-btns">
          <button className="btn-big" onClick={() => window.open(GUMROAD_URL,'_blank')}>Buy Now — $19</button>
          <Link href="/calc"><button className="btn-big-out">Try Free Demo →</button></Link>
        </div>
        <div className="hero-note">One-time payment · Instant download · No subscription · No installation</div>
        <div className="mockup">
          <div className="mkbar">
            <div className="mkdot" style={{background:'#FF5F57'}}/>
            <div className="mkdot" style={{background:'#FFBD2E'}}/>
            <div className="mkdot" style={{background:'#28C840'}}/>
            <div className="mkurl">yieldcalculator.tech/calc</div>
          </div>
          <div className="mkbody">
            <div className="mk-isin">XS0225685742 — ARMEN 6¾ 03/12/35</div>
            <div className="mk-bs"><div className="mk-buy">BUY</div><div className="mk-sell">SELL</div></div>
            <div className="mk-grid">
              <div><div className="mk-fl">Settlement Date</div><div className="mk-fv">Apr 21, 2026 (T+2)</div></div>
              <div><div className="mk-fl">Face Value</div><div className="mk-fv">1,000,000</div></div>
              <div><div className="mk-fl">Clean Price</div><div className="mk-fv lit">104.45800</div></div>
              <div><div className="mk-fl">Yield to Maturity</div><div className="mk-fv">6.09196%</div></div>
            </div>
            <div className="mk-div"/>
            <div className="mk-inv">
              <div className="mk-inv-row"><div><div className="mk-inv-label">Principal</div><div className="mk-inv-sub">104.458 × 10,000</div></div><div className="mk-inv-val">1,044,580.00</div></div>
              <div className="mk-inv-row"><div><div className="mk-inv-label">Accrued Interest</div><div className="mk-inv-sub">( 39 days )</div></div><div className="mk-inv-val" style={{color:'var(--blue)'}}>7,312.50</div></div>
              <div className="mk-inv-row"><div><div className="mk-total-label">YOU PAY</div></div><div className="mk-total-val">1,051,892.50</div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="features">
        <div className="sec-label">Features</div>
        <div className="sec-title">Everything in one tool</div>
        <div className="feat-grid">
          {[
            ['⇄','Price ↔ Yield Bidirectional','Type a clean price — yield calculates instantly. Or type a yield — price calculates. Whichever you have.'],
            ['📋','Full Settlement Invoice','Principal + Accrued Interest with exact days count = Total settlement amount. BUY or SELL clearly labelled.'],
            ['📄','One-Click PDF Export','Clean A4 settlement ticket with all trade details, bond terms, and a unique reference number per ticket.'],
            ['📅','T+2 Auto Settlement','Defaults to T+2 business days. Editable for any date — forward settlement, repo trades, custom schedules.'],
            ['🔍','Any Bond, Any ISIN','Live ISIN search powered by real bond data. Manual entry for any bond not in the database.'],
            ['📐','Correct Day Count Math','ACT/ACT for government bonds. 30/360 for corporates. Proper coupon schedule generation.'],
          ].map(([icon,title,desc]) => (
            <div key={title} className="feat"><div className="feat-icon">{icon}</div><div className="feat-title">{title}</div><div className="feat-desc">{desc}</div></div>
          ))}
        </div>
      </section>

      <section id="pricing">
        <div className="sec-label">Pricing</div>
        <div className="sec-title" style={{marginBottom:0}}>One price. Everything included.</div>
        <div className="price-box">
          <div className="price-top">
            <span className="price-top-label">Complete Package</span>
            <span className="price-top-badge">One-Time Payment</span>
          </div>
          <div className="price-body">
            <div className="price-amt"><div className="price-num">$19</div><div className="price-was">$49</div></div>
            <div className="price-once">Pay once. Use forever. No subscription.</div>
            <div className="price-feats">
              {['Full settlement calculator','PDF ticket export','Price ↔ Yield bidirectional','T+2 auto settlement','Any bond, any ISIN','ACT/ACT + 30/360','Works in any browser','Full source code','Unlimited users','Duration & DV01'].map(f => (
                <div key={f} className="pf"><span className="pfc">✓</span>{f}</div>
              ))}
            </div>
            <button className="btn-buy-big" onClick={() => window.open(GUMROAD_URL,'_blank')}>Buy Now — $19 →</button>
            <div className="price-note">Instant download via Gumroad · Secure payment · 7-day refund policy</div>
          </div>
        </div>
      </section>

      <section id="cta">
        <h2>Get instant access</h2>
        <p>Download once. Open in any browser. Share with your whole team.</p>
        <button className="btn-cta" onClick={() => window.open(GUMROAD_URL,'_blank')}>Buy Now — $19</button>
        <div className="cta-note">One-time · Instant download · No subscription</div>
      </section>

      <footer>
        <div className="footer-logo"><div className="logo-sq">Y</div>Yield Calculator</div>
        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="mailto:hello@yieldcalculator.tech">Contact</a>
        </div>
        <div className="footer-copy">© 2026 Yield Calculator. For informational purposes only. Not financial advice.</div>
      </footer>
    </>
  );
}
