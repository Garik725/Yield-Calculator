// pages/portfolio.js
// Module 03 — The Book — refined portfolio with localStorage
// Self-contained (own header), matches new landing page design.

import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'yc.portfolio.v1';

const TYPE_CONFIG = {
  stock: { name: 'Stock',     bg: '#E5ECE7', fg: '#214B3D' },
  bond:  { name: 'Bond',      bg: '#F0E8D4', fg: '#7A6228' },
  etf:   { name: 'ETF',       bg: '#E0EDF1', fg: '#2D5360' },
  fx:    { name: 'FX / Cash', bg: '#EFE3EB', fg: '#5C3550' },
};

const DEMO_PORTFOLIO = [
  { id: 'd1',  tkr: 'AAPL',    type: 'stock', qty: 250,     price: 195.50,  chg:  1.25 },
  { id: 'd2',  tkr: 'MSFT',    type: 'stock', qty: 120,     price: 412.88,  chg: -2.15 },
  { id: 'd3',  tkr: 'NVDA',    type: 'stock', qty:  80,     price: 875.40,  chg: 15.20 },
  { id: 'd4',  tkr: 'VOO',     type: 'etf',   qty: 200,     price: 485.20,  chg:  2.10 },
  { id: 'd5',  tkr: 'US10Y',   type: 'bond',  qty: 500000,  price:  98.35,  chg:  0.12 },
  { id: 'd6',  tkr: 'AAPL27',  type: 'bond',  qty: 250000,  price:  95.80,  chg: -0.08 },
  { id: 'd7',  tkr: 'BND',     type: 'etf',   qty: 350,     price:  72.50,  chg: -0.15 },
  { id: 'd8',  tkr: 'EUR.USD', type: 'fx',    qty: 45000,   price:   1.085, chg:  0.003 },
  { id: 'd9',  tkr: 'GLD',     type: 'etf',   qty: 100,     price: 215.40,  chg:  1.20 },
  { id: 'd10', tkr: 'JPM28',   type: 'bond',  qty: 150000,  price: 101.25,  chg:  0.05 },
];

const calcMV = h => h.type === 'bond' ? h.qty * h.price / 100 : h.qty * h.price;
const calcMVPrev = h => h.type === 'bond' ? h.qty * (h.price - h.chg) / 100 : h.qty * (h.price - h.chg);

const fmt = (n, dp = 2) => Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const fmtShort = n => {
  const abs = Math.abs(n);
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'k';
  return '$' + fmt(n);
};

export default function Portfolio() {
  const [holdings, setHoldings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ tkr: '', type: 'stock', qty: '', price: '', chg: '0' });
  const [toast, setToast] = useState('');
  const importRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.positions)) setHoldings(data.positions);
      }
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, positions: holdings }));
    } catch (e) { /* ignore */ }
  }, [holdings]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  const addPosition = () => {
    const tkr = form.tkr.trim().toUpperCase();
    const qty = parseFloat(form.qty);
    const price = parseFloat(form.price);
    const chg = parseFloat(form.chg) || 0;

    if (!tkr || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      showToast('Please fill ticker, quantity and price');
      return;
    }

    const newPos = {
      id: 'p' + Date.now() + Math.floor(Math.random() * 1000),
      tkr, type: form.type, qty, price, chg,
    };
    setHoldings([...holdings, newPos]);
    setForm({ tkr: '', type: form.type, qty: '', price: '', chg: '0' });
    showToast(`Added ${tkr}`);
  };

  const deletePosition = (id) => {
    const h = holdings.find(x => x.id === id);
    if (!h) return;
    if (!confirm(`Remove ${h.tkr}?`)) return;
    setHoldings(holdings.filter(x => x.id !== id));
    showToast(`Removed ${h.tkr}`);
  };

  const saveEdit = (id) => {
    const row = document.querySelector(`[data-row="${id}"]`);
    if (!row) return;
    const qty = parseFloat(row.querySelector('[data-field="qty"]').value);
    const price = parseFloat(row.querySelector('[data-field="price"]').value);
    const chg = parseFloat(row.querySelector('[data-field="chg"]').value) || 0;
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      showToast('Invalid values');
      return;
    }
    setHoldings(holdings.map(h => h.id === id ? { ...h, qty, price, chg } : h));
    setEditingId(null);
    showToast('Position updated');
  };

  const loadDemo = () => {
    if (holdings.length && !confirm('Replace current portfolio with demo data?')) return;
    setHoldings(JSON.parse(JSON.stringify(DEMO_PORTFOLIO)));
    showToast('Demo portfolio loaded');
  };

  const clearAll = () => {
    if (!holdings.length) { showToast('Already empty'); return; }
    if (!confirm(`Clear all ${holdings.length} positions?`)) return;
    setHoldings([]);
    showToast('All positions cleared');
  };

  const exportPDF = async () => {
    if (!holdings.length) { showToast('Nothing to export'); return; }
    showToast('Generating PDF...');
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 50;

      const totalVal = holdings.reduce((s, h) => s + calcMV(h), 0);
      const totalPrev = holdings.reduce((s, h) => s + calcMVPrev(h), 0);
      const dayPL = totalVal - totalPrev;
      const dayPct = totalPrev > 0 ? (dayPL / totalPrev) * 100 : 0;
      const top = [...holdings].sort((a, b) => calcMV(b) - calcMV(a))[0];
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // ─── COVER ───────────────────────────────────────
      doc.setDrawColor(33, 75, 61); doc.setLineWidth(2); doc.line(marginX, 80, marginX + 60, 80);
      doc.setTextColor(33, 75, 61); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text('YIELD CALCULATOR', marginX, 100);

      doc.setTextColor(26, 24, 21); doc.setFont('times', 'normal'); doc.setFontSize(38);
      doc.text('Portfolio Statement', marginX, 160);
      doc.setFont('times', 'italic'); doc.setFontSize(14); doc.setTextColor(107, 103, 96);
      doc.text(`as of ${dateStr}`, marginX, 185);

      const cardY = 240;
      doc.setDrawColor(221, 213, 191); doc.setLineWidth(1);
      doc.rect(marginX, cardY, pageWidth - 2 * marginX, 240);

      const statRow = (label, value, y, color) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(107, 103, 96);
        doc.text(label.toUpperCase(), marginX + 25, y);
        doc.setFont('times', 'normal'); doc.setFontSize(22); doc.setTextColor(...(color || [26, 24, 21]));
        doc.text(value, pageWidth - marginX - 25, y, { align: 'right' });
      };
      statRow('Total Portfolio Value', '$' + fmt(totalVal), cardY + 50);
      statRow("Today's P&L", (dayPL >= 0 ? '+' : '−') + '$' + fmt(Math.abs(dayPL)) + ` (${dayPct >= 0 ? '+' : ''}${dayPct.toFixed(2)}%)`, cardY + 110, dayPL >= 0 ? [31, 94, 64] : [163, 61, 46]);
      statRow('Positions', String(holdings.length), cardY + 165);
      statRow('Top Holding', (top?.tkr || '—') + (top ? ` · ${((calcMV(top) / totalVal) * 100).toFixed(1)}%` : ''), cardY + 215);

      doc.setFont('times', 'italic'); doc.setFontSize(9); doc.setTextColor(142, 138, 130);
      doc.text('Generated by Yield Calculator · yieldcalculator.tech', pageWidth / 2, pageHeight - 50, { align: 'center' });
      doc.text('For informational purposes only. Not financial advice.', pageWidth / 2, pageHeight - 35, { align: 'center' });

      // ─── HOLDINGS ────────────────────────────────────
      doc.addPage();
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(142, 138, 130);
      doc.text('YIELD CALCULATOR · PORTFOLIO STATEMENT', marginX, 40);
      doc.text(dateStr, pageWidth - marginX, 40, { align: 'right' });

      doc.setFont('times', 'normal'); doc.setFontSize(24); doc.setTextColor(26, 24, 21);
      doc.text('Holdings', marginX, 85);
      doc.setDrawColor(26, 24, 21); doc.setLineWidth(1); doc.line(marginX, 95, pageWidth - marginX, 95);

      const colTkr = marginX, colType = marginX + 80, colQty = marginX + 195, colPx = marginX + 285, colChg = marginX + 360, colMV = marginX + 460, colWt = pageWidth - marginX;
      let y = 120;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(107, 103, 96);
      doc.text('TICKER', colTkr, y); doc.text('TYPE', colType, y);
      doc.text('QUANTITY', colQty, y, { align: 'right' });
      doc.text('PRICE', colPx, y, { align: 'right' });
      doc.text('DAY CHG', colChg, y, { align: 'right' });
      doc.text('MARKET VALUE', colMV, y, { align: 'right' });
      doc.text('WEIGHT', colWt, y, { align: 'right' });
      y += 8; doc.setDrawColor(221, 213, 191); doc.setLineWidth(0.5); doc.line(marginX, y, pageWidth - marginX, y); y += 18;

      for (const h of holdings) {
        if (y > pageHeight - 80) {
          doc.addPage();
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(142, 138, 130);
          doc.text('YIELD CALCULATOR · PORTFOLIO STATEMENT (continued)', marginX, 40);
          y = 80;
        }
        const mv = calcMV(h);
        const wt = ((mv / totalVal) * 100).toFixed(1);
        doc.setFont('courier', 'bold'); doc.setFontSize(10); doc.setTextColor(26, 24, 21);
        doc.text(h.tkr, colTkr, y);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(107, 103, 96);
        doc.text(TYPE_CONFIG[h.type]?.name || h.type, colType, y);
        doc.setFont('courier', 'normal'); doc.setFontSize(10); doc.setTextColor(26, 24, 21);
        doc.text(fmt(h.qty, 0), colQty, y, { align: 'right' });
        doc.text(fmt(h.price, h.type === 'fx' ? 4 : 2), colPx, y, { align: 'right' });
        doc.setTextColor(...(h.chg >= 0 ? [31, 94, 64] : [163, 61, 46]));
        doc.text((h.chg >= 0 ? '+' : '') + fmt(h.chg, h.type === 'fx' ? 4 : 2), colChg, y, { align: 'right' });
        doc.setTextColor(26, 24, 21);
        doc.text(fmtShort(mv), colMV, y, { align: 'right' });
        doc.text(wt + '%', colWt, y, { align: 'right' });
        y += 18;
      }
      y += 4; doc.setLineWidth(1); doc.setDrawColor(26, 24, 21); doc.line(marginX, y, pageWidth - marginX, y); y += 18;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(107, 103, 96);
      doc.text('TOTAL', colTkr, y);
      doc.setFont('courier', 'bold'); doc.setFontSize(11); doc.setTextColor(26, 24, 21);
      doc.text(fmtShort(totalVal), colMV, y, { align: 'right' });
      doc.text('100.0%', colWt, y, { align: 'right' });

      // ─── DATA RECORD (for re-import) ────────────────
      doc.addPage();
      doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(142, 138, 130);
      doc.text('— DATA RECORD —', pageWidth / 2, 50, { align: 'center' });
      doc.text('This page allows this PDF to be re-imported into Yield Calculator.', pageWidth / 2, 68, { align: 'center' });

      doc.setFont('courier', 'normal'); doc.setFontSize(7); doc.setTextColor(170, 165, 155);
      const json = JSON.stringify({ version: 1, positions: holdings });
      const data = btoa(unescape(encodeURIComponent(json)));
      const chunks = data.match(/.{1,90}/g) || [];
      let dy = 100;
      doc.text('~~YCDATA~~', marginX, dy); dy += 10;
      for (const chunk of chunks) {
        if (dy > pageHeight - 40) {
          doc.addPage();
          dy = 60;
          doc.setFont('courier', 'normal'); doc.setFontSize(7); doc.setTextColor(170, 165, 155);
        }
        doc.text(chunk, marginX, dy);
        dy += 9;
      }
      doc.text('~~ENDDATA~~', marginX, dy);

      doc.save(`portfolio_${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast('Portfolio exported to PDF');
    } catch (err) {
      console.error(err);
      showToast('PDF export failed: ' + err.message);
    }
  };

  const importPDF = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please select a PDF file');
      event.target.value = '';
      return;
    }
    showToast('Reading PDF...');
    try {
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
          };
          script.onerror = () => reject(new Error('Failed to load PDF reader'));
          document.body.appendChild(script);
        });
      }
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let allText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        allText += content.items.map(item => item.str).join(' ');
      }
      const match = allText.match(/~~YCDATA~~([\s\S]+?)~~ENDDATA~~/);
      if (!match) {
        showToast('This PDF was not exported from Yield Calculator');
        event.target.value = '';
        return;
      }
      const cleaned = match[1].replace(/\s/g, '');
      const json = decodeURIComponent(escape(atob(cleaned)));
      const data = JSON.parse(json);
      if (!data.positions || !Array.isArray(data.positions)) throw new Error('Invalid data format');
      if (holdings.length && !confirm(`Replace current portfolio (${holdings.length}) with imported (${data.positions.length})?`)) {
        event.target.value = '';
        return;
      }
      const clean = data.positions.map(p => ({
        id: p.id || ('p' + Date.now() + Math.random()),
        tkr: p.tkr || '',
        type: p.type || 'stock',
        qty: parseFloat(p.qty) || 0,
        price: parseFloat(p.price) || 0,
        chg: parseFloat(p.chg) || 0,
      })).filter(p => p.tkr && p.qty > 0 && p.price > 0);
      setHoldings(clean);
      showToast(`Imported ${clean.length} positions from PDF`);
    } catch (err) {
      console.error(err);
      showToast('Import failed: ' + (err.message || 'Could not read PDF'));
    } finally {
      event.target.value = '';
    }
  };

  const total = holdings.reduce((s, h) => s + calcMV(h), 0);
  const totalPrev = holdings.reduce((s, h) => s + calcMVPrev(h), 0);
  const dayPL = total - totalPrev;
  const dayPct = totalPrev > 0 ? (dayPL / totalPrev) * 100 : 0;
  const byType = holdings.reduce((acc, h) => {
    acc[h.type] = (acc[h.type] || 0) + calcMV(h);
    return acc;
  }, {});
  const topHolding = holdings.length ? [...holdings].sort((a, b) => calcMV(b) - calcMV(a))[0] : null;

  return (
    <>
      <Head>
        <title>Portfolio — Yield Calculator</title>
        <meta name="description" content="A working bond and equity portfolio, stored in your browser." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
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
          --bull: #1F5E40;
          --bear: #A33D2E;
          --display: 'Fraunces', Georgia, serif;
          --sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          --mono: 'JetBrains Mono', ui-monospace, monospace;
          --col: 1240px;
          --pad: clamp(20px, 4vw, 40px);
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        body { background: var(--paper); color: var(--ink); font-family: var(--sans); font-size: 16px; line-height: 1.6; min-height: 100vh; }
        a { color: inherit; text-decoration: none; }
        button { font-family: inherit; border: none; background: none; cursor: pointer; color: inherit; }
        input, select { font-family: var(--sans); }
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
            <Link href="/calc" className="hd-link">Calculator</Link>
            <Link href="/revenue" className="hd-link">Round-Trip</Link>
            <Link href="/portfolio" className="hd-link active">Portfolio</Link>
            <Link href="/curve" className="hd-link">Yield Curve</Link>
          </nav>
          <Link href="/" className="hd-back">← Home</Link>
        </div>
      </header>

      <main className="page">
        <div className="page-inner">
          {/* PAGE HEAD */}
          <div className="page-head">
            <div className="head-text">
              <div className="eyebrow">Module № 03</div>
              <h1 className="page-h">The <em>Book.</em></h1>
              <p className="page-lede">
                A working portfolio, stored in your browser. Add positions by ticker or ISIN, edit and delete inline, export as JSON for backup or import from a saved file. LocalStorage-first, zero server state.
              </p>
            </div>
            <div className="head-actions">
              <button className="btn-ghost" onClick={loadDemo}>Load Demo</button>
              <button className="btn-ghost" onClick={exportPDF}>Export PDF</button>
              <button className="btn-ghost" onClick={() => importRef.current?.click()}>Import PDF</button>
              <input ref={importRef} type="file" accept=".pdf" onChange={importPDF} style={{ display: 'none' }} />
              <button className="btn-ghost danger" onClick={clearAll}>Clear All</button>
            </div>
          </div>

          {/* ADD FORM */}
          <section className="add-card">
            <div className="add-head">Add Position</div>
            <div className="add-row">
              <div className="field f-tkr">
                <label>Ticker / ISIN</label>
                <input type="text" value={form.tkr} placeholder="AAPL" onChange={e => setForm({ ...form, tkr: e.target.value })} onKeyDown={e => e.key === 'Enter' && addPosition()} />
              </div>
              <div className="field">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="stock">Stock</option>
                  <option value="bond">Bond</option>
                  <option value="etf">ETF</option>
                  <option value="fx">FX / Cash</option>
                </select>
              </div>
              <div className="field">
                <label>Quantity</label>
                <input type="number" value={form.qty} placeholder="100" step="any" onChange={e => setForm({ ...form, qty: e.target.value })} onKeyDown={e => e.key === 'Enter' && addPosition()} />
              </div>
              <div className="field">
                <label>Price</label>
                <input type="number" value={form.price} placeholder="195.50" step="0.001" onChange={e => setForm({ ...form, price: e.target.value })} onKeyDown={e => e.key === 'Enter' && addPosition()} />
              </div>
              <div className="field">
                <label>Day Chg</label>
                <input type="number" value={form.chg} step="0.01" onChange={e => setForm({ ...form, chg: e.target.value })} onKeyDown={e => e.key === 'Enter' && addPosition()} />
              </div>
            </div>
            <div className="add-actions">
              <p className="add-hint">
                For <b>bonds</b>: quantity = face value, price = clean price per 100. For <b>stocks</b>/<b>ETFs</b>: shares × price. For <b>FX</b>: cash × rate to USD.
              </p>
              <button className="btn-add" onClick={addPosition}>+ Add Position</button>
            </div>
          </section>

          {/* KPIs */}
          {holdings.length > 0 && (
            <div className="kpis">
              <div className="kpi feat">
                <div className="kpi-l">Total Portfolio Value</div>
                <div className="kpi-v">{fmtShort(total)}</div>
                <div className={`kpi-c ${dayPL >= 0 ? 'pos' : 'neg'}`}>
                  {dayPL >= 0 ? '▲' : '▼'} {fmt(Math.abs(dayPct), 2)}% today
                  <span className="kpi-c-sub">({dayPL >= 0 ? '+' : '−'}{fmtShort(Math.abs(dayPL))})</span>
                </div>
              </div>
              <div className="kpi">
                <div className="kpi-l">Today's P&amp;L</div>
                <div className={`kpi-v ${dayPL >= 0 ? 'pos' : 'neg'}`}>
                  {dayPL >= 0 ? '+' : '−'}{fmtShort(Math.abs(dayPL))}
                </div>
                <div className="kpi-s">Unrealized</div>
              </div>
              <div className="kpi">
                <div className="kpi-l">Positions</div>
                <div className="kpi-v">{holdings.length}</div>
                <div className="kpi-s">
                  {Object.entries(byType).filter(([_, v]) => v > 0).map(([t]) => TYPE_CONFIG[t].name).join(' · ')}
                </div>
              </div>
              <div className="kpi">
                <div className="kpi-l">Top Holding</div>
                <div className="kpi-v top">{topHolding?.tkr || '—'}</div>
                <div className="kpi-s">
                  {topHolding ? `${fmtShort(calcMV(topHolding))} (${((calcMV(topHolding) / total) * 100).toFixed(1)}%)` : '—'}
                </div>
              </div>
            </div>
          )}

          {/* HOLDINGS */}
          {holdings.length === 0 ? (
            <div className="empty">
              <div className="empty-mark">—</div>
              <h3 className="empty-h">Your portfolio is empty</h3>
              <p className="empty-p">Add positions above, or load the demo to see how everything works.</p>
              <button className="btn-fill" onClick={loadDemo}>Load Demo Portfolio</button>
            </div>
          ) : (
            <div className="table">
              <div className="thead">
                <div>Ticker</div>
                <div>Type</div>
                <div className="r">Quantity</div>
                <div className="r">Price</div>
                <div className="r">Day Chg</div>
                <div className="r">Market Value</div>
                <div className="r">Weight</div>
                <div className="c">—</div>
              </div>
              {holdings.map(h => {
                const mv = calcMV(h);
                const wt = ((mv / total) * 100).toFixed(1);
                const isEditing = editingId === h.id;
                const tc = TYPE_CONFIG[h.type] || TYPE_CONFIG.stock;
                return (
                  <div key={h.id} className={`trow ${isEditing ? 'editing' : ''}`} data-row={h.id}>
                    <div className="td-tkr">{h.tkr}</div>
                    <div>
                      <span className="pill" style={{ background: tc.bg, color: tc.fg }}>{tc.name}</span>
                    </div>
                    <div className="r mono">
                      {isEditing
                        ? <input defaultValue={h.qty} data-field="qty" className="inline-i" type="number" step="any" />
                        : fmt(h.qty, 0)}
                    </div>
                    <div className="r mono">
                      {isEditing
                        ? <input defaultValue={h.price} data-field="price" className="inline-i" type="number" step="0.001" />
                        : fmt(h.price, h.type === 'fx' ? 4 : 2)}
                    </div>
                    <div className={`r mono ${h.chg >= 0 ? 'pos' : 'neg'}`}>
                      {isEditing
                        ? <input defaultValue={h.chg} data-field="chg" className="inline-i" type="number" step="0.01" />
                        : <>{h.chg >= 0 ? '+' : ''}{fmt(Math.abs(h.chg), h.type === 'fx' ? 4 : 2)}</>}
                    </div>
                    <div className="r mono mv">{fmtShort(mv)}</div>
                    <div className="r mono">{wt}%</div>
                    <div className="c row-actions">
                      {isEditing ? (
                        <>
                          <button className="ra" onClick={() => saveEdit(h.id)} title="Save">✓</button>
                          <button className="ra" onClick={() => setEditingId(null)} title="Cancel">✕</button>
                        </>
                      ) : (
                        <>
                          <button className="ra" onClick={() => setEditingId(h.id)} title="Edit">✎</button>
                          <button className="ra del" onClick={() => deletePosition(h.id)} title="Delete">✕</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="tfoot">
                <div>Totals</div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div className="r mono"><b>{fmtShort(total)}</b></div>
                <div className="r mono"><b>100.0%</b></div>
                <div></div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="ft">
        <div className="ft-inner">
          <div>© 2026 Yield Calculator · <Link href="/">Home</Link> · <a href="mailto:hello@yieldcalculator.tech">Contact</a></div>
          <div className="ft-disc">Portfolio data stored locally in your browser. For informational purposes only.</div>
        </div>
      </footer>

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        /* ── HEADER ── */
        .hd { position: sticky; top: 0; z-index: 100; background: rgba(248, 244, 234, 0.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--rule); }
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

        /* ── PAGE ── */
        .page { padding: clamp(40px, 6vw, 72px) 0 80px; min-height: calc(100vh - 200px); }
        .page-inner { max-width: var(--col); margin: 0 auto; padding: 0 var(--pad); }

        .page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 32px; flex-wrap: wrap; margin-bottom: 40px; padding-bottom: 28px; border-bottom: 1px solid var(--rule); }
        .head-text { flex: 1; min-width: 320px; }
        .eyebrow { font-family: var(--sans); font-weight: 600; font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; display: flex; align-items: center; gap: 12px; }
        .eyebrow::before { content: ""; width: 28px; height: 1px; background: var(--accent); }
        .page-h { font-family: var(--display); font-weight: 500; font-size: clamp(38px, 5.5vw, 64px); line-height: 1; letter-spacing: -.022em; margin-bottom: 14px; font-variation-settings: "opsz" 72; }
        .page-h :global(em) { font-style: italic; font-weight: 400; color: var(--accent); font-variation-settings: "opsz" 72; }
        .page-lede { font-family: var(--sans); font-size: 16px; line-height: 1.6; color: var(--ink-2); max-width: 620px; }

        .head-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end; }
        .btn-ghost { padding: 9px 16px; border: 1px solid var(--rule); background: var(--paper-2); color: var(--ink-2); font-family: var(--sans); font-size: 12px; font-weight: 500; letter-spacing: .02em; transition: all .15s; }
        .btn-ghost:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
        .btn-ghost.danger:hover { border-color: var(--bear); color: var(--bear); background: #FCEDE9; }

        .btn-fill { display: inline-block; padding: 12px 28px; background: var(--accent); color: var(--paper); font-family: var(--sans); font-weight: 500; font-size: 13.5px; letter-spacing: .01em; transition: background .15s; margin-top: 16px; }
        .btn-fill:hover { background: var(--accent-2); }

        /* ── ADD FORM ── */
        .add-card { background: var(--paper-2); border: 1px solid var(--rule); padding: 24px 28px; margin-bottom: 28px; }
        .add-head { font-family: var(--sans); font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; margin-bottom: 18px; }
        .add-row { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr 0.9fr; gap: 14px; align-items: end; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field label { font-family: var(--sans); font-size: 10.5px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); }
        .field input, .field select { padding: 10px 12px; background: var(--paper); border: 1px solid var(--rule); font-family: var(--mono); font-size: 13.5px; color: var(--ink); outline: none; transition: border-color .15s; }
        .field input:focus, .field select:focus { border-color: var(--accent); }
        .field input::placeholder { color: var(--ink-4); }
        .add-actions { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--rule); flex-wrap: wrap; }
        .add-hint { font-family: var(--sans); font-size: 12.5px; color: var(--ink-3); font-style: italic; line-height: 1.5; flex: 1; min-width: 280px; margin: 0; }
        .add-hint :global(b) { color: var(--ink); font-weight: 600; font-style: normal; }
        .btn-add { padding: 11px 24px; background: var(--accent); color: var(--paper); font-family: var(--sans); font-weight: 500; font-size: 13px; letter-spacing: .02em; white-space: nowrap; transition: background .15s; }
        .btn-add:hover { background: var(--accent-2); }

        /* ── KPIs ── */
        .kpis { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 1px; background: var(--rule); border: 1px solid var(--rule); margin-bottom: 28px; }
        .kpi { background: var(--paper-2); padding: 22px 26px; }
        .kpi.feat { background: var(--ink); color: var(--paper); }
        .kpi-l { font-family: var(--sans); font-size: 10.5px; letter-spacing: .2em; text-transform: uppercase; font-weight: 600; opacity: .6; margin-bottom: 10px; }
        .kpi-v { font-family: var(--display); font-weight: 600; font-size: 28px; letter-spacing: -.02em; line-height: 1.05; font-variation-settings: "opsz" 36; }
        .kpi.feat .kpi-v { font-size: 36px; color: var(--paper); }
        .kpi-v.top { font-family: var(--mono); font-size: 22px; font-weight: 600; }
        .kpi-v.pos { color: var(--bull); }
        .kpi-v.neg { color: var(--bear); }
        .kpi-c { font-family: var(--sans); font-weight: 500; font-size: 13px; margin-top: 8px; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
        .kpi-c.pos { color: #5DD176; }
        .kpi-c.neg { color: #E95B4B; }
        .kpi-c-sub { font-family: var(--mono); font-size: 11.5px; opacity: .7; font-weight: 400; }
        .kpi-s { font-family: var(--mono); font-size: 11.5px; color: var(--ink-3); margin-top: 6px; letter-spacing: .02em; }

        /* ── EMPTY ── */
        .empty { padding: 80px 24px 60px; text-align: center; background: var(--paper-2); border: 1px solid var(--rule); }
        .empty-mark { font-family: var(--display); font-size: 64px; color: var(--ink-4); line-height: 0.4; margin-bottom: 14px; }
        .empty-h { font-family: var(--display); font-weight: 500; font-size: 26px; letter-spacing: -.015em; margin-bottom: 10px; font-variation-settings: "opsz" 36; }
        .empty-p { font-family: var(--sans); font-size: 15px; color: var(--ink-3); font-style: italic; max-width: 440px; margin: 0 auto; }

        /* ── TABLE ── */
        .table { background: var(--paper-2); border: 1px solid var(--rule); overflow-x: auto; }
        .thead, .trow, .tfoot { display: grid; grid-template-columns: 1fr 0.8fr 1fr 1fr 1fr 1fr 0.7fr 0.8fr; padding: 13px 22px; border-bottom: 1px solid var(--rule); align-items: center; min-width: 880px; }
        .trow:last-of-type { border-bottom: none; }
        .thead { font-family: var(--sans); font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; background: var(--paper-3); border-bottom: 2px solid var(--ink); padding-top: 14px; padding-bottom: 14px; }
        .trow { font-size: 13.5px; transition: background .15s; }
        .trow:hover { background: var(--paper-3); }
        .trow.editing { background: var(--accent-soft); }
        .tfoot { background: var(--paper-3); border-top: 1px solid var(--ink); border-bottom: none; font-family: var(--sans); font-size: 12.5px; font-weight: 600; color: var(--ink-3); letter-spacing: .04em; text-transform: uppercase; }
        .tfoot b { font-family: var(--mono); color: var(--ink); font-weight: 600; font-size: 14px; letter-spacing: 0; text-transform: none; }
        .r { text-align: right; }
        .c { text-align: center; }
        .td-tkr { font-family: var(--mono); font-weight: 600; color: var(--ink); font-size: 13.5px; letter-spacing: .03em; }
        .pill { display: inline-block; font-family: var(--mono); font-size: 10px; font-weight: 600; padding: 3px 10px; letter-spacing: .04em; text-transform: uppercase; }
        .mono { font-family: var(--mono); font-weight: 500; color: var(--ink); }
        .mv { font-weight: 600; }
        .pos { color: var(--bull); }
        .neg { color: var(--bear); }
        .row-actions { display: flex; gap: 4px; justify-content: center; }
        .ra { padding: 4px 9px; color: var(--ink-3); font-size: 14px; transition: all .12s; }
        .ra:hover { color: var(--accent); background: var(--accent-soft); }
        .ra.del:hover { color: var(--bear); background: #FCEDE9; }
        .inline-i { width: 100%; padding: 5px 8px; border: 1px solid var(--accent); background: var(--paper); font-family: var(--mono); font-size: 13px; text-align: right; outline: none; color: var(--ink); }

        /* ── FOOTER ── */
        .ft { background: var(--ink); color: var(--paper); padding: 28px var(--pad); }
        .ft-inner { max-width: var(--col); margin: 0 auto; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; font-family: var(--sans); font-size: 12px; color: rgba(248, 244, 234, 0.6); }
        .ft :global(a) { color: rgba(248, 244, 234, 0.85); transition: color .15s; }
        .ft :global(a:hover) { color: var(--accent-2); }
        .ft-disc { font-style: italic; opacity: 0.7; }

        /* ── TOAST ── */
        .toast { position: fixed; bottom: 24px; right: 24px; background: var(--ink); color: var(--paper); padding: 12px 20px; font-family: var(--sans); font-size: 13px; font-weight: 500; z-index: 200; box-shadow: 0 12px 32px rgba(26, 24, 21, 0.25); border-left: 3px solid var(--accent); animation: slideIn .25s ease; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

        /* ── RESPONSIVE ── */
        @media (max-width: 960px) {
          .hd-nav { display: none; }
          .add-row { grid-template-columns: 1fr 1fr; gap: 12px; }
          .kpis { grid-template-columns: 1fr 1fr; }
          .add-actions { flex-direction: column; align-items: stretch; }
          .btn-add { width: 100%; }
        }
        @media (max-width: 560px) {
          .add-row { grid-template-columns: 1fr; }
          .page-head { flex-direction: column; align-items: stretch; }
          .head-actions { justify-content: stretch; }
          .head-actions :global(button) { flex: 1; min-width: 0; }
          .kpis { grid-template-columns: 1fr; }
          .toast { left: 24px; right: 24px; bottom: 16px; }
        }
      `}</style>
    </>
  );
}
