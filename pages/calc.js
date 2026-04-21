// pages/calc.js
import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import {
  addBusinessDays, isoDate, fmtDate, parseDate, fullCalc, bracket, calcAccrued,
  ytmFromClean, cleanFromYtm
} from '../lib/bondMath';
 
// ── Currency config ────────────────────────────────────────────────────────────
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AMD'];
const CCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', AMD: '֏' };
 
// ── Fallback bond database ─────────────────────────────────────────────────────
const FALLBACK_DB = {
  "US91282CJM14": { name:"US Treasury Note 10Y", issuer:"US Treasury", coupon:4.250, maturity:"2035-02-15", freq:2, dc:"ACT/ACT", rating:"AAA", type:"Government", ccy:"USD" },
  "US91282CKP38": { name:"US Treasury Note 2Y",  issuer:"US Treasury", coupon:4.625, maturity:"2027-03-31", freq:2, dc:"ACT/ACT", rating:"AAA", type:"Government", ccy:"USD" },
  "US912810TW89": { name:"US Treasury Bond 30Y", issuer:"US Treasury", coupon:4.500, maturity:"2055-02-15", freq:2, dc:"ACT/ACT", rating:"AAA", type:"Government", ccy:"USD" },
  "US037833DV97": { name:"Apple 3.000% 2027",    issuer:"Apple Inc.",  coupon:3.000, maturity:"2027-11-13", freq:2, dc:"30/360", rating:"AA+",type:"Corporate",   ccy:"USD" },
  "US594918BW84": { name:"Microsoft 2.921% 2052",issuer:"Microsoft",   coupon:2.921, maturity:"2052-03-17", freq:2, dc:"30/360", rating:"AAA",type:"Corporate",   ccy:"USD" },
  "US88160RAJ13": { name:"Tesla 5.300% 2030",    issuer:"Tesla Inc.",  coupon:5.300, maturity:"2030-08-15", freq:2, dc:"30/360", rating:"BB", type:"Corporate",   ccy:"USD" },
  "US46647PBH22": { name:"JPMorgan 4.493% 2032", issuer:"JPMorgan",   coupon:4.493, maturity:"2032-03-24", freq:2, dc:"30/360", rating:"A+", type:"Corporate",   ccy:"USD" },
 
};
 
// ── Formatters ─────────────────────────────────────────────────────────────────
const fmtMoney = (n, dp = 2) => n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const fmtFace  = n => n.toLocaleString('en-US');
 
export default function Calc() {
  // Bond state
  const [bond, setBond] = useState(null);
  const [isinInput, setIsinInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualForm, setManualForm] = useState({ isin:'', name:'', issuer:'', coupon:'', maturity:'', freq:'2', dc:'30/360', ccy:'USD', rating:'—' });
  const [manualErrors, setManualErrors] = useState({});
 
  // Calc state
  const [side, setSide] = useState('BUY');
  const [settleDate, setSettleDate] = useState('');
  const [faceStr, setFaceStr] = useState('1,000,000');
  const [face, setFace] = useState(1000000);
  const [currency, setCurrency] = useState('USD');
  const [priceInput, setPriceInput] = useState('');
  const [ytmInput, setYtmInput] = useState('');
  const [lastEdited, setLastEdited] = useState('ytm');
  const [result, setResult] = useState(null);
  const [pdfStatus, setPdfStatus] = useState('');
 
  // View state — 'calc' or 'pnl'
  const [view, setView] = useState('calc');
 
  // P&L Simulator state
  const [pnlBuyDate, setPnlBuyDate] = useState('');
  const [pnlSellDate, setPnlSellDate] = useState('');
  const [pnlFace, setPnlFace] = useState('1,000,000');
  const [pnlBuyMode, setPnlBuyMode] = useState('price');
  const [pnlSellMode, setPnlSellMode] = useState('price');
  const [pnlBuyValue, setPnlBuyValue] = useState('');
  const [pnlSellValue, setPnlSellValue] = useState('');
  const [pnlResult, setPnlResult] = useState(null);
  const [pnlError, setPnlError] = useState('');
 
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
 
  // Init settlement date T+2
  useEffect(() => {
    const t2 = addBusinessDays(new Date(), 2);
    setSettleDate(isoDate(t2));
  }, []);
 
  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
 
  // ── Search ──────────────────────────────────────────────────────────────────
  const handleIsinInput = useCallback((val) => {
    setIsinInput(val);
    setShowDrop(true);
    clearTimeout(debounceRef.current);
 
    if (val.length < 2) { setSearchResults([]); return; }
 
    // First check fallback DB
    const q = val.toLowerCase().replace(/\s/g, '');
    const local = Object.entries(FALLBACK_DB).filter(([isin, b]) =>
      isin.toLowerCase().includes(q) ||
      b.name.toLowerCase().replace(/\s/g,'').includes(q) ||
      b.issuer.toLowerCase().replace(/\s/g,'').includes(q)
    ).slice(0, 5).map(([isin, b]) => ({ ...b, isin, source: 'local' }));
 
    if (local.length > 0) setSearchResults(local);
 
    // Then fetch from API
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/bond?isin=${encodeURIComponent(val.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.isin) {
            setSearchResults(prev => {
              const exists = prev.find(r => r.isin === data.isin);
              if (exists) return prev;
              return [{ ...data, source: 'api' }, ...prev].slice(0, 6);
            });
          }
        }
      } catch (e) { /* silent */ }
      setSearching(false);
    }, 400);
  }, []);
 
  // ── Load bond ───────────────────────────────────────────────────────────────
  const loadBond = useCallback((b) => {
    setBond(b);
    setIsinInput(`${b.isin} — ${b.name}`);
    setShowDrop(false);
    setCurrency(b.ccy || 'USD');
    const approx = b.coupon / 100 + 0.005;
    setYtmInput((approx * 100).toFixed(3));
    setPriceInput('');
    setLastEdited('ytm');
    setResult(null);
    setManualMode(false);
  }, []);
 
  // ── Manual entry ────────────────────────────────────────────────────────────
  const submitManual = () => {
    const errs = {};
    if (!manualForm.isin || manualForm.isin.length < 6) errs.isin = 'Required (min 6 chars)';
    if (!manualForm.coupon || isNaN(parseFloat(manualForm.coupon))) errs.coupon = 'Required';
    if (!manualForm.maturity) errs.maturity = 'Required';
    setManualErrors(errs);
    if (Object.keys(errs).length > 0) return;
 
    const b = {
      isin: manualForm.isin.toUpperCase().trim(),
      name: manualForm.name || manualForm.isin,
      issuer: manualForm.issuer || '—',
      coupon: parseFloat(manualForm.coupon),
      maturity: manualForm.maturity,
      freq: parseInt(manualForm.freq),
      dc: manualForm.dc,
      ccy: manualForm.ccy,
      rating: manualForm.rating || '—',
      type: 'Manual Entry',
    };
    loadBond(b);
  };
 
  // ── Recalculate ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bond || !settleDate) return;
    if (lastEdited === 'price' && !priceInput) return;
    if (lastEdited === 'ytm' && !ytmInput) return;
 
    const settle = parseDate(settleDate);
    const res = fullCalc(bond, settle, face, priceInput, ytmInput, lastEdited);
    if (!res) return;
    setResult(res);
 
    // Update the other field
    if (lastEdited === 'price') setYtmInput((res.ytm * 100).toFixed(5));
    else setPriceInput(res.cleanPx.toFixed(5));
  }, [bond, settleDate, face, priceInput, ytmInput, lastEdited]);
 
  // ── PDF Export ──────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    if (!bond || !result) return;
    setPdfStatus('Generating PDF...');
    try {
      // Load jsPDF from CDN if not already loaded
      if (!window.jspdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      const W=210, ML=18, MR=18, CW=174;
      const sym = CCY_SYMBOLS[currency] || '$';
      const settle = parseDate(settleDate);
      const now = new Date();
      const ref = `YC-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000+1000)}`;
 
      // Header
      doc.setFillColor(23,85,204); doc.rect(0,0,W,32,'F');
      doc.setFillColor(13,52,140); doc.rect(W-44,0,44,32,'F');
      doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold');
      doc.text('Yield Calculator', ML, 13);
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(180,200,255);
      doc.text('Bond Settlement Confirmation', ML, 21);
      doc.text(now.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}), ML, 27);
      doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont('helvetica','bold');
      doc.text(`REF: ${ref}`, W-ML, 19, {align:'right'});
 
      let y = 42;
      const row = (label, value, yy) => {
        doc.setTextColor(100,110,125); doc.setFontSize(8.5); doc.setFont('helvetica','normal');
        doc.text(label, ML+3, yy);
        doc.setTextColor(20,20,30); doc.setFont('helvetica','bold');
        doc.text(String(value), W-MR, yy, {align:'right'});
        doc.setDrawColor(220,218,214); doc.setLineWidth(0.15);
        doc.line(ML, yy+2.5, W-MR, yy+2.5);
        return yy+9;
      };
      const secTitle = (title, yy) => {
        doc.setFillColor(235,241,255); doc.rect(ML, yy, CW, 7, 'F');
        doc.setTextColor(23,85,204); doc.setFontSize(7.5); doc.setFont('helvetica','bold');
        doc.text(title, ML+3, yy+5.2);
        return yy+10;
      };
 
      y = secTitle('BOND DETAILS', y);
      y = row('ISIN', bond.isin, y);
      y = row('Name', bond.name, y);
      y = row('Issuer', bond.issuer || '—', y);
      y = row('Coupon Rate', bond.coupon.toFixed(3) + '%', y);
      y = row('Maturity Date', bond.maturity, y);
      y = row('Day Count', bond.dc, y);
      y = row('Currency', currency, y);
      y += 4;
 
      y = secTitle('TRADE DETAILS', y);
      y = row('Side', side, y);
      y = row('Settlement Date', fmtDate(settle), y);
      y = row('Face / Nominal Value', sym + fmtMoney(face), y);
      y = row('Clean Price', result.cleanPx.toFixed(5) + ' per 100 face', y);
      y = row('Yield to Maturity', (result.ytm * 100).toFixed(5) + '%', y);
      y = row('Dirty Price', result.dirtyPx.toFixed(5) + ' per 100 face', y);
      y += 4;
 
      y = secTitle('SETTLEMENT INVOICE', y);
      y = row(`Principal (${result.cleanPx.toFixed(3)} × ${fmtFace(face/100)})`, sym + fmtMoney(result.principalAmt), y);
      y = row(`Accrued Interest (${result.days} days)`, sym + fmtMoney(result.aiAmt), y);
      y += 3;
 
      // Total box
      const isBuy = side === 'BUY';
      doc.setFillColor(...(isBuy ? [10,124,62] : [192,57,43]));
      doc.roundedRect(ML, y, CW, 18, 3, 3, 'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(10); doc.setFont('helvetica','bold');
      doc.text(isBuy ? 'YOU PAY' : 'YOU RECEIVE', ML+5, y+7);
      doc.setFontSize(16); doc.setFont('helvetica','bold');
      doc.text(sym + fmtMoney(result.totalAmt), W-MR-3, y+13, {align:'right'});
      y += 24;
 
      // Footer
      doc.setFillColor(240,238,234); doc.rect(0,272,W,25,'F');
      doc.setTextColor(150,155,165); doc.setFontSize(7); doc.setFont('helvetica','normal');
      doc.text('Yield Calculator — yieldcalculator.tech — hello@yieldcalculator.tech', ML, 279);
      doc.text('For informational purposes only. Not financial advice.', ML, 284);
      doc.text(`Ref: ${ref}`, W-MR, 284, {align:'right'});
 
      doc.save(`Settlement_${bond.isin}_${isoDate(now)}.pdf`);
      setPdfStatus(`✓ Exported — ${ref}`);
    } catch (e) {
      setPdfStatus('PDF error: ' + e.message);
    }
  };
 
  // ── Render ───────────────────────────────────────────────────────────────────
  // ── P&L Simulator ──────────────────────────────────────────────────────────
  const pnlFmt = (n) => {
    const ccy = currency || 'USD';
    try { return n.toLocaleString('en-US', {style:'currency',currency:ccy,minimumFractionDigits:2,maximumFractionDigits:2}); }
    catch { return `${CCY_SYMBOLS[ccy]||'$'}${n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
  };
 
  const pnlAutoDerived = () => {
    if (!bond || !pnlBuyDate || !pnlBuyValue) return '—';
    try {
      const buyD = parseDate(pnlBuyDate);
      const v = parseFloat(pnlBuyValue);
      if (isNaN(v)) return '—';
      if (pnlBuyMode === 'price') {
        const y = ytmFromClean(v, bond, buyD) * 100;
        return y.toFixed(4) + '% YTM';
      } else {
        const px = cleanFromYtm(v/100, bond, buyD);
        return px.toFixed(4) + ' price';
      }
    } catch { return '—'; }
  };
 
  const switchToPnL = () => {
    if (bond) {
      // Pre-fill only on first visit (if fields are empty — preserve user edits)
      if (!pnlBuyDate) {
        const buyDate = settleDate || isoDate(addBusinessDays(new Date(), 2));
        setPnlBuyDate(buyDate);
      }
      if (!pnlSellDate) {
        const bd = parseDate(pnlBuyDate || settleDate || isoDate(addBusinessDays(new Date(), 2)));
        let sd = new Date(bd); sd.setFullYear(sd.getFullYear()+1);
        const md = new Date(bond.maturity+'T12:00:00');
        if (sd >= md) { sd = new Date(md); sd.setDate(sd.getDate()-1); }
        setPnlSellDate(isoDate(sd));
      }
      if (pnlFace === '1,000,000' && face !== 1000000) {
        setPnlFace(fmtFace(face));
      }
      if (!pnlBuyValue) {
        if (lastEdited === 'price' && priceInput) {
          setPnlBuyMode('price');
          setPnlBuyValue(parseFloat(priceInput).toFixed(4));
        } else if (ytmInput) {
          setPnlBuyMode('ytm');
          setPnlBuyValue(parseFloat(ytmInput).toFixed(4));
        } else if (priceInput) {
          setPnlBuyMode('price');
          setPnlBuyValue(parseFloat(priceInput).toFixed(4));
        }
      }
    }
    setView('pnl');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };
 
  const switchToCalc = () => {
    setView('calc');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };
 
  const calculatePnL = () => {
    setPnlError('');
    try {
      if (!bond) throw new Error('Load a bond first.');
      const faceNum = parseFloat(String(pnlFace).replace(/,/g,''));
      if (isNaN(faceNum) || faceNum <= 0) throw new Error('Enter a valid face value.');
      if (!pnlBuyDate || !pnlSellDate) throw new Error('Enter both purchase and sale dates.');
      const buyD = parseDate(pnlBuyDate);
      const sellD = parseDate(pnlSellDate);
      const matD = new Date(bond.maturity + 'T12:00:00');
      if (buyD >= sellD) throw new Error('Sale date must be after purchase date.');
      if (sellD > matD) throw new Error('Sale date must be on or before maturity.');
      if (buyD >= matD) throw new Error('Purchase date must be before maturity.');
      const buyRaw = parseFloat(pnlBuyValue);
      const sellRaw = parseFloat(pnlSellValue);
      if (isNaN(buyRaw) || isNaN(sellRaw)) throw new Error('Enter valid purchase and sale values.');
 
      // Derive yield + clean price for both legs
      let buyY, buyCleanPx;
      if (pnlBuyMode === 'price') {
        buyCleanPx = buyRaw;
        buyY = ytmFromClean(buyCleanPx, bond, buyD);
      } else {
        buyY = buyRaw / 100;
        buyCleanPx = cleanFromYtm(buyY, bond, buyD);
      }
      let sellY, sellCleanPx;
      if (pnlSellMode === 'price') {
        sellCleanPx = sellRaw;
        sellY = ytmFromClean(sellCleanPx, bond, sellD);
      } else {
        sellY = sellRaw / 100;
        sellCleanPx = cleanFromYtm(sellY, bond, sellD);
      }
 
      // Accrued at each leg
      const buyBr = bracket(bond.maturity, bond.freq, buyD);
      const sellBr = bracket(bond.maturity, bond.freq, sellD);
      const buyAcc = calcAccrued(bond, buyBr.last, buyBr.next, buyD).ai;
      const sellAcc = calcAccrued(bond, sellBr.last, sellBr.next, sellD).ai;
 
      const buyInvoice = (buyCleanPx + buyAcc) * faceNum / 100;
      const sellInvoice = (sellCleanPx + sellAcc) * faceNum / 100;
 
      // Coupons received between buy and sell
      const couponsPerPayment = bond.coupon / 100 * faceNum / bond.freq;
      const intervalMonths = 12 / bond.freq;
      let d = new Date(matD);
      let couponCount = 0;
      while (d > buyD) {
        if (d > buyD && d <= sellD) couponCount++;
        d = new Date(d); d.setMonth(d.getMonth() - intervalMonths);
      }
      const couponsReceived = couponCount * couponsPerPayment;
 
      // Repriced entry — at original buy yield, settled on sale date
      const repricedCleanPx = cleanFromYtm(buyY, bond, sellD);
      const repricedInvoice = (repricedCleanPx + sellAcc) * faceNum / 100;
 
      const carryPL = repricedInvoice - buyInvoice + couponsReceived;
      const marketPL = sellInvoice - repricedInvoice;
      const totalRevenue = sellInvoice - buyInvoice + couponsReceived;
      const totalPct = (totalRevenue / buyInvoice) * 100;
      const holdingDays = Math.round((sellD - buyD) / 86400000);
 
      setPnlResult({
        totalRevenue, totalPct, carryPL, marketPL,
        buyInvoice, sellInvoice, couponsReceived, repricedInvoice,
        buyY, buyCleanPx, sellY, sellCleanPx, holdingDays,
      });
    } catch (e) {
      setPnlError(e.message);
      setPnlResult(null);
    }
  };
 
  // ── Render ───────────────────────────────────────────────────────────────────
  const settle = settleDate ? parseDate(settleDate) : null;
  const sym = CCY_SYMBOLS[currency] || '$';
 
  return (
    <>
      <Head>
        <title>Yield Calculator — Bond Settlement</title>
        <meta name="description" content="Professional bond settlement calculator. ISIN search, price/yield, settlement invoice, PDF export."/>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      </Head>
 
      <style>{`
        :root{--bg:#F4F2EE;--surface:#fff;--card:#fff;--border:#E2DDD6;--border2:#D4CFC7;--text:#0F1923;--text2:#4A5568;--text3:#9AA3AF;--blue:#1755CC;--blue-dim:#EBF1FF;--green:#0A7C3E;--green-dim:#E6F5EE;--red:#C0392B;--red-dim:#FDECEA;--gold:#8A6200;--gold-dim:#FEF7E6;--mono:'IBM Plex Mono',monospace;--sans:'IBM Plex Sans',sans-serif;}
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;}
        input,select,button{font-family:var(--sans);}
        .topbar{display:flex;align-items:center;gap:14px;padding:0 22px;height:52px;background:var(--surface);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100;box-shadow:0 1px 4px rgba(0,0,0,.05);}
        .logo{display:flex;align-items:center;gap:8px;}
        .logo-sq{width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#1755CC,#0A3A99);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;font-family:var(--mono);}
        .logo-name{font-size:14px;font-weight:700;}
        .search-wrap{flex:1;max-width:500px;position:relative;}
        .search-input{width:100%;padding:8px 36px 8px 13px;background:#F9F8F6;border:1.5px solid var(--border2);border-radius:7px;color:var(--text);font-size:13px;font-family:var(--mono);outline:none;transition:border-color .14s;}
        .search-input:focus{border-color:var(--blue);}
        .search-input::placeholder{font-family:var(--sans);color:var(--text3);}
        .search-ico{position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:14px;}
        .dropdown{position:absolute;top:calc(100% + 5px);left:0;right:0;background:var(--surface);border:1px solid var(--border2);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.11);z-index:200;overflow:hidden;max-height:280px;overflow-y:auto;}
        .ditem{padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);}
        .ditem:last-child{border-bottom:none;}
        .ditem:hover{background:var(--bg);}
        .ditem-isin{font-size:10px;font-family:var(--mono);color:var(--blue);letter-spacing:.6px;}
        .ditem-name{font-size:13px;font-weight:500;margin:1px 0;}
        .ditem-meta{font-size:11px;color:var(--text3);}
        .ditem-manual{padding:10px 14px;cursor:pointer;background:#F9F8F6;border-top:1px solid var(--border);display:flex;align-items:center;gap:8px;}
        .ditem-manual:hover{background:var(--blue-dim);}
        .ditem-manual-text{font-size:12.5px;font-weight:600;color:var(--blue);}
        .ditem-manual-sub{font-size:11px;color:var(--text3);}
        .clock{margin-left:auto;font-size:11px;font-family:var(--mono);color:var(--text3);}
        .main{max-width:820px;margin:0 auto;padding:24px 18px 60px;}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:14px;}
        .bond-strip{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;}
        .bs-isin{font-size:10px;font-family:var(--mono);color:var(--blue);letter-spacing:.8px;margin-bottom:4px;}
        .bs-name{font-size:18px;font-weight:700;margin-bottom:7px;}
        .bs-pills{display:flex;gap:6px;flex-wrap:wrap;}
        .pill{font-size:10px;padding:2px 9px;border-radius:20px;font-weight:600;}
        .pill-aaa{background:#D1FAE5;color:#065F46;}.pill-aa{background:#D1FAE5;color:#065F46;}.pill-a{background:#FEF3C7;color:#78350F;}.pill-bb{background:#FEE2E2;color:#991B1B;}.pill-govt{background:var(--blue-dim);color:var(--blue);}.pill-corp{background:#EDE9FE;color:#5B21B6;}.pill-hy{background:#FEE2E2;color:#991B1B;}
        .bs-right{display:flex;gap:16px;flex-wrap:wrap;}
        .bsf{text-align:right;}
        .bsf-label{font-size:9.5px;color:var(--text3);letter-spacing:.4px;text-transform:uppercase;}
        .bsf-val{font-size:13px;font-family:var(--mono);font-weight:500;}
        .fl{font-size:10px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:var(--text2);margin-bottom:4px;}
        .fi{width:100%;padding:9px 11px;background:#F9F8F6;border:1.5px solid var(--border2);border-radius:7px;color:var(--text);font-size:14px;font-family:var(--mono);font-weight:500;outline:none;transition:border-color .14s,background .14s;}
        .fi:focus{border-color:var(--blue);background:var(--blue-dim);}
        .fi.active-field{border-color:var(--gold);background:var(--gold-dim);}
        .fi-wrap{position:relative;}
        .fi-suf{position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--text3);pointer-events:none;}
        .row{display:flex;gap:14px;margin-bottom:14px;flex-wrap:wrap;}
        .row:last-child{margin-bottom:0;}
        .field{display:flex;flex-direction:column;gap:4px;flex:1;}
        .or-sep{display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--text3);padding-top:20px;min-width:28px;}
        .bs-toggle{display:flex;gap:8px;margin-bottom:16px;}
        .bs-btn{flex:1;padding:9px;border-radius:8px;font-size:13px;font-weight:700;letter-spacing:.6px;border:1.5px solid var(--border2);background:transparent;color:var(--text2);cursor:pointer;transition:all .15s;}
        .bs-btn.buy.on{border-color:var(--green);color:var(--green);background:var(--green-dim);}
        .bs-btn.sell.on{border-color:var(--red);color:var(--red);background:var(--red-dim);}
        .hdivider{border:none;border-top:1px solid var(--border);margin:16px 0;}
        .info-bar{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;display:flex;margin-bottom:14px;}
        .ib-cell{flex:1;padding:12px 14px;border-right:1px solid var(--border);display:flex;flex-direction:column;gap:3px;}
        .ib-cell:last-child{border-right:none;}
        .ib-label{font-size:9px;color:var(--text3);letter-spacing:.8px;text-transform:uppercase;}
        .ib-val{font-size:15px;font-family:var(--mono);font-weight:600;}
        .ib-val.gold{color:var(--gold);}
        .ib-val.blue{color:var(--blue);}
        .ib-sub{font-size:9.5px;color:var(--text3);}
        .settle-box{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:14px;}
        .sb-hd{padding:12px 18px;background:#F4F2EE;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;}
        .sb-title{font-size:10px;font-weight:700;color:var(--text2);letter-spacing:1.2px;text-transform:uppercase;}
        .sb-meta{font-size:11px;color:var(--text3);font-family:var(--mono);}
        .sb-line{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--border);}
        .sb-line:last-child{border-bottom:none;}
        .sb-line.total{background:#F4F2EE;padding:16px 18px;}
        .sbl-desc{font-size:13.5px;font-weight:500;}
        .sbl-detail{font-size:11px;color:var(--text3);margin-top:2px;font-family:var(--mono);}
        .sbl-ccy{font-size:10px;color:var(--text3);letter-spacing:.4px;margin-bottom:2px;text-align:right;}
        .sbl-amt{font-size:17px;font-family:var(--mono);font-weight:600;text-align:right;}
        .sbl-amt.principal{color:var(--text);}
        .sbl-amt.accrued{color:var(--blue);}
        .sbl-amt.total-buy{color:var(--green);}
        .sbl-amt.total-sell{color:var(--red);}
        .sbl-total-label{font-size:13px;font-weight:700;color:var(--text2);}
        .sbl-total-amt{font-size:24px;font-family:var(--mono);font-weight:800;}
        .btn-export{display:flex;align-items:center;gap:7px;padding:11px 22px;background:var(--blue);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;transition:background .14s;}
        .btn-export:hover{background:#1040AA;}
        .pdf-status{font-size:11.5px;color:var(--green);}
        .empty{text-align:center;padding:60px 20px;}
        .empty-icon{font-size:36px;opacity:.15;margin-bottom:16px;}
        .empty-h{font-size:18px;font-weight:600;color:var(--text2);margin-bottom:8px;}
        .empty-s{font-size:13px;color:var(--text3);margin-bottom:22px;}
        .chips{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;}
        .chip{padding:5px 12px;border:1px solid var(--border2);border-radius:5px;font-size:11.5px;font-family:var(--mono);color:var(--text2);cursor:pointer;background:var(--surface);transition:all .13s;}
        .chip:hover{border-color:var(--blue);color:var(--blue);background:var(--blue-dim);}
        .manual-panel{background:var(--surface);border:1.5px solid var(--border2);border-radius:12px;padding:20px;margin-bottom:14px;}
        .mp-title{font-size:14px;font-weight:700;margin-bottom:4px;}
        .mp-sub{font-size:12px;color:var(--text3);margin-bottom:16px;}
        .mp-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;}
        .mp-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
        .mf{display:flex;flex-direction:column;gap:4px;}
        .mfl{font-size:9.5px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--text2);}
        .mfi{padding:8px 10px;background:#F9F8F6;border:1.5px solid var(--border2);border-radius:7px;color:var(--text);font-size:13.5px;font-family:var(--mono);font-weight:500;outline:none;transition:border-color .14s;}
        .mfi:focus{border-color:var(--blue);}
        .mfi.err{border-color:var(--red);background:var(--red-dim);}
        .err-text{font-size:10px;color:var(--red);margin-top:2px;}
        .btn-load{background:var(--blue);color:#fff;border:none;border-radius:8px;padding:10px 22px;font-size:13px;font-weight:700;cursor:pointer;transition:background .13s;}
        .btn-load:hover{background:#1040AA;}
        .btn-cancel{background:transparent;color:var(--text2);border:1.5px solid var(--border2);border-radius:8px;padding:10px 16px;font-size:13px;font-weight:600;cursor:pointer;margin-left:8px;}
        .btn-cancel:hover{border-color:var(--text2);}
        .ccy-bar{display:flex;gap:6px;margin-left:auto;}
        .ccy-btn{padding:4px 10px;border-radius:5px;border:1px solid var(--border2);font-size:11px;font-weight:600;background:transparent;color:var(--text2);cursor:pointer;transition:all .13s;}
        .ccy-btn.on{background:var(--blue);color:#fff;border-color:var(--blue);}
        @media(max-width:600px){.row{flex-direction:column;}.or-sep{padding:0;}.mp-grid{grid-template-columns:1fr 1fr;}.mp-grid-2{grid-template-columns:1fr;}.info-bar{flex-wrap:wrap;}.ib-cell{min-width:50%;}}
      `}</style>
 
      {/* TOPBAR */}
      <div className="topbar">
        <div className="logo">
          <div className="logo-sq">Y</div>
          <div className="logo-name">Yield Calculator</div>
        </div>
        <div className="search-wrap" ref={searchRef}>
          <input
            className="search-input"
            placeholder="Search ISIN, issuer or name…"
            value={isinInput}
            onChange={e => handleIsinInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') setShowDrop(false);
              if (e.key === 'Enter') {
                const isin = isinInput.trim().toUpperCase().split(' ')[0];
                if (FALLBACK_DB[isin]) loadBond({ ...FALLBACK_DB[isin], isin });
                else setManualMode(true);
                setShowDrop(false);
              }
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="search-ico">{searching ? '⟳' : '⌕'}</span>
          {showDrop && (
            <div className="dropdown">
              {searchResults.map(b => (
                <div key={b.isin} className="ditem" onClick={() => loadBond(b)}>
                  <div className="ditem-isin">{b.isin} {b.source === 'api' && <span style={{color:'var(--green)',fontSize:'9px'}}>● LIVE</span>}</div>
                  <div className="ditem-name">{b.name}</div>
                  <div className="ditem-meta">{b.coupon?.toFixed(3)}% · {b.maturity} · {b.rating} · {b.type}</div>
                </div>
              ))}
              <div className="ditem-manual" onClick={() => { setShowDrop(false); setManualMode(true); const isin = isinInput.trim().toUpperCase().split(' ')[0]; setManualForm(f => ({...f, isin})); }}>
                <div>
                  <div className="ditem-manual-text">✚ Enter bond details manually</div>
                  <div className="ditem-manual-sub">Input coupon, maturity and day count for any bond</div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="ccy-bar">
          {CURRENCIES.map(c => (
            <button key={c} className={`ccy-btn${currency===c?' on':''}`} onClick={() => setCurrency(c)}>{c}</button>
          ))}
        </div>
        {view === 'calc' ? (
          <button onClick={switchToPnL} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 16px',background:'transparent',color:'var(--blue)',border:'1.5px solid var(--blue)',borderRadius:8,fontSize:12.5,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
            <span style={{fontSize:14}}>⇄</span> P&amp;L Simulator
          </button>
        ) : (
          <button onClick={switchToCalc} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 16px',background:'transparent',color:'var(--blue)',border:'1.5px solid var(--blue)',borderRadius:8,fontSize:12.5,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
            <span style={{fontSize:14}}>←</span> Settlement
          </button>
        )}
        <Clock />
      </div>
 
      <div className="main">
 
        {view === 'calc' && (
        <>
 
        {/* MANUAL ENTRY PANEL */}
        {manualMode && (
          <div className="manual-panel">
            <div className="mp-title">Enter Bond Details</div>
            <div className="mp-sub">ISIN not found — fill in the bond terms below</div>
            <div className="mp-grid">
              <div className="mf">
                <div className="mfl">ISIN *</div>
                <input className={`mfi${manualErrors.isin?' err':''}`} value={manualForm.isin} onChange={e => setManualForm(f=>({...f,isin:e.target.value}))} placeholder="e.g. XS1234567890"/>
                {manualErrors.isin && <div className="err-text">{manualErrors.isin}</div>}
              </div>
              <div className="mf">
                <div className="mfl">Bond Name</div>
                <input className="mfi" value={manualForm.name} onChange={e => setManualForm(f=>({...f,name:e.target.value}))} placeholder="e.g. ACME Corp 5% 2030"/>
              </div>
              <div className="mf">
                <div className="mfl">Issuer</div>
                <input className="mfi" value={manualForm.issuer} onChange={e => setManualForm(f=>({...f,issuer:e.target.value}))} placeholder="e.g. ACME Corporation"/>
              </div>
            </div>
            <div className="mp-grid">
              <div className="mf">
                <div className="mfl">Coupon Rate (%) *</div>
                <input className={`mfi${manualErrors.coupon?' err':''}`} type="number" value={manualForm.coupon} onChange={e => setManualForm(f=>({...f,coupon:e.target.value}))} placeholder="e.g. 5.250" step="0.001"/>
                {manualErrors.coupon && <div className="err-text">{manualErrors.coupon}</div>}
              </div>
              <div className="mf">
                <div className="mfl">Maturity Date *</div>
                <input className={`mfi${manualErrors.maturity?' err':''}`} type="date" value={manualForm.maturity} onChange={e => setManualForm(f=>({...f,maturity:e.target.value}))}/>
                {manualErrors.maturity && <div className="err-text">{manualErrors.maturity}</div>}
              </div>
              <div className="mf">
                <div className="mfl">Coupon Frequency</div>
                <select className="mfi" value={manualForm.freq} onChange={e => setManualForm(f=>({...f,freq:e.target.value}))}>
                  <option value="2">Semi-Annual (2×/yr)</option>
                  <option value="1">Annual (1×/yr)</option>
                  <option value="4">Quarterly (4×/yr)</option>
                </select>
              </div>
            </div>
            <div className="mp-grid-2">
              <div className="mf">
                <div className="mfl">Day Count Convention</div>
                <select className="mfi" value={manualForm.dc} onChange={e => setManualForm(f=>({...f,dc:e.target.value}))}>
                  <option value="30/360">30/360 (Corporate)</option>
                  <option value="ACT/ACT">ACT/ACT (Government)</option>
                </select>
              </div>
              <div className="mf">
                <div className="mfl">Currency</div>
                <select className="mfi" value={manualForm.ccy} onChange={e => setManualForm(f=>({...f,ccy:e.target.value}))}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-load" onClick={submitManual}>Load Bond</button>
            <button className="btn-cancel" onClick={() => setManualMode(false)}>Cancel</button>
          </div>
        )}
 
        {/* EMPTY STATE */}
        {!bond && !manualMode && (
          <div className="empty">
            <div className="empty-icon">◈</div>
            <div className="empty-h">Enter an ISIN to calculate settlement</div>
            <div className="empty-s">Search any bond — or type an ISIN and press Enter to input details manually</div>
            <div className="chips">
              {Object.entries(FALLBACK_DB).map(([isin, b]) => (
                <div key={isin} className="chip" onClick={() => loadBond({...b, isin})}>{isin}</div>
              ))}
            </div>
          </div>
        )}
 
        {/* CALCULATOR */}
        {bond && !manualMode && (
          <>
            {/* Bond Strip */}
            <div className="card">
              <div className="bond-strip">
                <div>
                  <div className="bs-isin">{bond.isin}</div>
                  <div className="bs-name">{bond.name}</div>
                  <div className="bs-pills">
                    <span className={`pill ${bond.rating?.startsWith('AAA')?'pill-aaa':bond.rating?.startsWith('AA')?'pill-aa':bond.rating?.startsWith('A')?'pill-a':'pill-bb'}`}>{bond.rating}</span>
                    <span className={`pill ${bond.type==='Government'?'pill-govt':bond.type==='High Yield'?'pill-hy':'pill-corp'}`}>{bond.type}</span>
                    <span className="pill" style={{background:'#F0EFF8',color:'#5B21B6'}}>{bond.dc}</span>
                  </div>
                </div>
                <div className="bs-right">
                  <div className="bsf"><div className="bsf-label">Coupon</div><div className="bsf-val">{bond.coupon?.toFixed(3)}%</div></div>
                  <div className="bsf"><div className="bsf-label">Maturity</div><div className="bsf-val">{bond.maturity}</div></div>
                  <div className="bsf"><div className="bsf-label">Freq.</div><div className="bsf-val">{bond.freq===2?'Semi-ann.':'Annual'}</div></div>
                  <div className="bsf"><div className="bsf-label">Currency</div><div className="bsf-val">{currency}</div></div>
                </div>
              </div>
            </div>
 
            {/* Inputs */}
            <div className="card">
              <div className="bs-toggle">
                <button className={`bs-btn buy${side==='BUY'?' on':''}`} onClick={() => setSide('BUY')}>BUY</button>
                <button className={`bs-btn sell${side==='SELL'?' on':''}`} onClick={() => setSide('SELL')}>SELL</button>
              </div>
              <div className="row">
                <div className="field">
                  <div className="fl">Settlement Date</div>
                  <input type="date" className="fi" value={settleDate} onChange={e => setSettleDate(e.target.value)}/>
                  <div style={{fontSize:'10px',color:'var(--text3)',marginTop:'3px'}}>
                    {settleDate ? `T+2 = ${fmtDate(parseDate(settleDate))}` : ''}
                  </div>
                </div>
                <div className="field">
                  <div className="fl">Face / Nominal Value ({currency})</div>
                  <input type="text" className="fi" value={faceStr}
                    onChange={e => {
                      setFaceStr(e.target.value);
                      const n = parseFloat(e.target.value.replace(/,/g,''));
                      if (!isNaN(n) && n >= 1) setFace(n);
                    }}
                    onBlur={() => setFaceStr(fmtFace(face))}
                    placeholder="1,000,000"
                  />
                </div>
              </div>
              <div className="hdivider"/>
              <div className="row" style={{alignItems:'flex-start'}}>
                <div className="field">
                  <div className="fl">Clean Price (per 100 face)</div>
                  <input type="number" className={`fi${lastEdited==='price'?' active-field':''}`} value={priceInput}
                    onChange={e => { setPriceInput(e.target.value); setLastEdited('price'); }}
                    placeholder="e.g. 104.458" step="0.001"
                  />
                  <div style={{fontSize:'10px',color:'var(--text3)',marginTop:'3px'}}>Enter price → yield calculated</div>
                </div>
                <div className="or-sep">OR</div>
                <div className="field">
                  <div className="fl">Yield to Maturity</div>
                  <div className="fi-wrap">
                    <input type="number" className={`fi${lastEdited==='ytm'?' active-field':''}`} value={ytmInput}
                      onChange={e => { setYtmInput(e.target.value); setLastEdited('ytm'); }}
                      placeholder="e.g. 6.092" step="0.001"
                    />
                    <span className="fi-suf">%</span>
                  </div>
                  <div style={{fontSize:'10px',color:'var(--text3)',marginTop:'3px'}}>Enter yield → price calculated</div>
                </div>
              </div>
            </div>
 
            {/* Info Bar */}
            {result && (
              <div className="info-bar">
                <div className="ib-cell">
                  <div className="ib-label">Yield to Maturity</div>
                  <div className="ib-val gold">{(result.ytm*100).toFixed(5)}%</div>
                  <div className="ib-sub">{bond.freq}× / year</div>
                </div>
                <div className="ib-cell">
                  <div className="ib-label">Clean Price</div>
                  <div className="ib-val">{result.cleanPx.toFixed(5)}</div>
                  <div className="ib-sub">per 100 face</div>
                </div>
                <div className="ib-cell">
                  <div className="ib-label">Dirty Price</div>
                  <div className="ib-val">{result.dirtyPx.toFixed(5)}</div>
                  <div className="ib-sub">clean + accrued</div>
                </div>
                <div className="ib-cell">
                  <div className="ib-label">Mod. Duration</div>
                  <div className="ib-val blue">{result.modDur.toFixed(4)}</div>
                  <div className="ib-sub">% Δ per 1% yield</div>
                </div>
                <div className="ib-cell">
                  <div className="ib-label">DV01</div>
                  <div className="ib-val blue">{sym}{fmtMoney(result.dv01)}</div>
                  <div className="ib-sub">per basis point</div>
                </div>
              </div>
            )}
 
            {/* Settlement Invoice */}
            {result && settle && (
              <div className="settle-box">
                <div className="sb-hd">
                  <div className="sb-title">Settlement Invoice — {side==='BUY'?'YOU PAY':'YOU RECEIVE'}</div>
                  <div className="sb-meta">{currency} · {fmtDate(settle)} · {bond.dc}</div>
                </div>
                <div className="sb-line">
                  <div>
                    <div className="sbl-desc">Principal</div>
                    <div className="sbl-detail">Clean price {result.cleanPx.toFixed(5)} × {fmtFace(face/100)} = {sym}{fmtMoney(result.principalAmt)}</div>
                  </div>
                  <div>
                    <div className="sbl-ccy">{currency}</div>
                    <div className="sbl-amt principal">{fmtMoney(result.principalAmt)}</div>
                  </div>
                </div>
                <div className="sb-line">
                  <div>
                    <div className="sbl-desc">Accrued Interest</div>
                    <div className="sbl-detail">( {result.days} days ) {result.last ? `Last coupon: ${fmtDate(result.last)}` : ''}</div>
                  </div>
                  <div>
                    <div className="sbl-ccy">{currency}</div>
                    <div className="sbl-amt accrued">{fmtMoney(result.aiAmt)}</div>
                  </div>
                </div>
                <div className="sb-line total">
                  <div>
                    <div className="sbl-total-label">{side==='BUY'?'YOU PAY':'YOU RECEIVE'}</div>
                    <div className="sbl-detail">Dirty price {result.dirtyPx.toFixed(5)} × {fmtFace(face/100)}</div>
                  </div>
                  <div>
                    <div className="sbl-ccy">{currency}</div>
                    <div className={`sbl-total-amt ${side==='BUY'?'total-buy':'total-sell'}`}>{fmtMoney(result.totalAmt)}</div>
                  </div>
                </div>
              </div>
            )}
 
            {/* Export */}
            {result && (
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
                <button className="btn-export" onClick={exportPDF}>
                  <span>↓</span> Export Settlement Ticket PDF
                </button>
                {pdfStatus && <div className="pdf-status">{pdfStatus}</div>}
              </div>
            )}
          </>
        )}
 
        </>
        )}
 
        {/* P&L PAGE VIEW - empty state */}
        {view === 'pnl' && !bond && (
          <div style={{textAlign:'center',padding:'80px 20px'}}>
            <div style={{fontSize:40,opacity:0.15,marginBottom:14}}>⇄</div>
            <div style={{fontSize:18,fontWeight:600,color:'var(--text2)',marginBottom:8}}>Round-Trip P&amp;L Simulator</div>
            <div style={{fontSize:13,color:'var(--text3)',marginBottom:24,maxWidth:440,marginLeft:'auto',marginRight:'auto',lineHeight:1.65}}>
              Calculate total revenue on a bond trade — split into Carry P&amp;L (income from holding) and Market Move P&amp;L (gain/loss from yield changes).
            </div>
            <div style={{fontSize:13,color:'var(--text2)'}}>Load a bond first, then return to this page.</div>
            <button onClick={switchToCalc} style={{marginTop:18,padding:'10px 22px',background:'var(--blue)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'}}>Go to Settlement Calculator</button>
          </div>
        )}
 
        {/* P&L PAGE VIEW - active */}
        {view === 'pnl' && bond && (
          <>
            {/* Bond info strip */}
            <div className="card" style={{marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
                <div>
                  <div style={{fontSize:10,fontFamily:'var(--mono)',color:'var(--blue)',letterSpacing:'.8px',marginBottom:3}}>{bond.isin}</div>
                  <div style={{fontSize:17,fontWeight:700}}>{bond.name}</div>
                </div>
                <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                  <div style={{textAlign:'right'}}><div style={{fontSize:9.5,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.4px'}}>Coupon</div><div style={{fontSize:13,fontFamily:'var(--mono)',fontWeight:500}}>{bond.coupon?.toFixed(3)}%</div></div>
                  <div style={{textAlign:'right'}}><div style={{fontSize:9.5,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.4px'}}>Maturity</div><div style={{fontSize:13,fontFamily:'var(--mono)',fontWeight:500}}>{bond.maturity}</div></div>
                  <div style={{textAlign:'right'}}><div style={{fontSize:9.5,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.4px'}}>Day Count</div><div style={{fontSize:13,fontFamily:'var(--mono)',fontWeight:500}}>{bond.dc}</div></div>
                </div>
              </div>
            </div>
            <div className="card">
              <div>
 
                {/* PURCHASE LEG */}
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:10.5,fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:'var(--blue)',marginBottom:10}}>1. When You Bought It</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div>
                      <div className="fl">Purchase Date</div>
                      <input type="date" className="fi" value={pnlBuyDate} onChange={e => setPnlBuyDate(e.target.value)}/>
                    </div>
                    <div>
                      <div className="fl">Face Value</div>
                      <input type="text" className="fi" value={pnlFace} onChange={e => setPnlFace(e.target.value)}/>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:10}}>
                    <div>
                      <div className="fl" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span>Purchase</span>
                        <div style={{display:'flex',gap:2,background:'#F2F0EC',borderRadius:5,padding:2}}>
                          <button onClick={() => setPnlBuyMode('price')} style={{padding:'3px 9px',border:'none',background:pnlBuyMode==='price'?'var(--surface)':'transparent',color:pnlBuyMode==='price'?'var(--blue)':'var(--text3)',fontSize:10,fontWeight:pnlBuyMode==='price'?700:600,borderRadius:3,cursor:'pointer',boxShadow:pnlBuyMode==='price'?'0 1px 2px rgba(0,0,0,.08)':'none'}}>PRICE</button>
                          <button onClick={() => setPnlBuyMode('ytm')} style={{padding:'3px 9px',border:'none',background:pnlBuyMode==='ytm'?'var(--surface)':'transparent',color:pnlBuyMode==='ytm'?'var(--blue)':'var(--text3)',fontSize:10,fontWeight:pnlBuyMode==='ytm'?700:600,borderRadius:3,cursor:'pointer',boxShadow:pnlBuyMode==='ytm'?'0 1px 2px rgba(0,0,0,.08)':'none'}}>YIELD</button>
                        </div>
                      </div>
                      <input type="number" className="fi" value={pnlBuyValue} onChange={e => setPnlBuyValue(e.target.value)} step="0.001" placeholder={pnlBuyMode==='price'?'e.g. 98.50':'e.g. 5.00'}/>
                      <div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>{pnlBuyMode==='price'?'Clean price per 100 face':'Yield to maturity (%)'}</div>
                    </div>
                    <div>
                      <div className="fl">Auto-derived</div>
                      <div style={{padding:'9px 11px',background:'var(--gold-dim)',border:'1.5px solid var(--gold)',borderRadius:7,fontSize:13,fontFamily:'var(--mono)',color:'var(--gold)'}}>{pnlAutoDerived()}</div>
                      <div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>Other side of purchase</div>
                    </div>
                  </div>
                </div>
 
                {/* SALE LEG */}
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:10.5,fontWeight:700,letterSpacing:'1.2px',textTransform:'uppercase',color:'var(--green)',marginBottom:10}}>2. When You Sell It (Simulated)</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div>
                      <div className="fl">Sale Date</div>
                      <input type="date" className="fi" value={pnlSellDate} onChange={e => setPnlSellDate(e.target.value)}/>
                    </div>
                    <div>
                      <div className="fl" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span>Sale</span>
                        <div style={{display:'flex',gap:2,background:'#F2F0EC',borderRadius:5,padding:2}}>
                          <button onClick={() => setPnlSellMode('price')} style={{padding:'3px 9px',border:'none',background:pnlSellMode==='price'?'var(--surface)':'transparent',color:pnlSellMode==='price'?'var(--blue)':'var(--text3)',fontSize:10,fontWeight:pnlSellMode==='price'?700:600,borderRadius:3,cursor:'pointer',boxShadow:pnlSellMode==='price'?'0 1px 2px rgba(0,0,0,.08)':'none'}}>PRICE</button>
                          <button onClick={() => setPnlSellMode('ytm')} style={{padding:'3px 9px',border:'none',background:pnlSellMode==='ytm'?'var(--surface)':'transparent',color:pnlSellMode==='ytm'?'var(--blue)':'var(--text3)',fontSize:10,fontWeight:pnlSellMode==='ytm'?700:600,borderRadius:3,cursor:'pointer',boxShadow:pnlSellMode==='ytm'?'0 1px 2px rgba(0,0,0,.08)':'none'}}>YIELD</button>
                        </div>
                      </div>
                      <input type="number" className="fi" value={pnlSellValue} onChange={e => setPnlSellValue(e.target.value)} step="0.001" placeholder={pnlSellMode==='price'?'e.g. 101.25':'e.g. 4.00'}/>
                      <div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>{pnlSellMode==='price'?'Clean price per 100 face':'Yield to maturity (%)'}</div>
                    </div>
                  </div>
                </div>
 
                <button onClick={calculatePnL} style={{width:'100%',padding:13,background:'var(--blue)',color:'#fff',border:'none',borderRadius:9,fontSize:14,fontWeight:700,cursor:'pointer',marginBottom:16}}>Calculate Total Revenue</button>
 
                {pnlError && <div style={{background:'var(--red-dim)',color:'var(--red)',padding:'11px 13px',borderRadius:7,fontSize:12.5,marginBottom:12}}>{pnlError}</div>}
 
                {pnlResult && (
                  <div>
                    <div style={{background:'linear-gradient(135deg,#F0F9FF,#E0F2FE)',border:'1px solid #BAE6FD',borderRadius:10,padding:20}}>
                      <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'1.2px',color:'var(--text2)',fontWeight:700}}>Total Revenue</div>
                      <div style={{fontSize:32,fontWeight:800,letterSpacing:'-.5px',margin:'4px 0 2px',fontFamily:'var(--mono)',color:pnlResult.totalRevenue>0.005?'var(--green)':(pnlResult.totalRevenue<-0.005?'var(--red)':'var(--text)')}}>
                        {pnlResult.totalRevenue>=0?'+':''}{pnlFmt(pnlResult.totalRevenue)}
                      </div>
                      <div style={{fontSize:12,color:'var(--text2)'}}>Return on invested capital: {pnlResult.totalPct>=0?'+':''}{pnlResult.totalPct.toFixed(3)}% over {pnlResult.holdingDays} days</div>
 
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:18}}>
                        <div style={{background:'var(--surface)',padding:'13px 15px',borderRadius:8,borderLeft:'4px solid var(--blue)'}}>
                          <div style={{fontSize:9.5,textTransform:'uppercase',color:'var(--text3)',fontWeight:700,letterSpacing:'.5px'}}>Carry P&amp;L</div>
                          <div style={{fontSize:17,fontWeight:700,marginTop:3,fontFamily:'var(--mono)',color:pnlResult.carryPL>0.005?'var(--green)':(pnlResult.carryPL<-0.005?'var(--red)':'var(--text)')}}>
                            {pnlResult.carryPL>=0?'+':''}{pnlFmt(pnlResult.carryPL)}
                          </div>
                          <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>Income from holding</div>
                        </div>
                        <div style={{background:'var(--surface)',padding:'13px 15px',borderRadius:8,borderLeft:'4px solid #D97706'}}>
                          <div style={{fontSize:9.5,textTransform:'uppercase',color:'var(--text3)',fontWeight:700,letterSpacing:'.5px'}}>Market Move P&amp;L</div>
                          <div style={{fontSize:17,fontWeight:700,marginTop:3,fontFamily:'var(--mono)',color:pnlResult.marketPL>0.005?'var(--green)':(pnlResult.marketPL<-0.005?'var(--red)':'var(--text)')}}>
                            {pnlResult.marketPL>=0?'+':''}{pnlFmt(pnlResult.marketPL)}
                          </div>
                          <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>Gain / loss from yields</div>
                        </div>
                      </div>
 
                      <details style={{marginTop:14,background:'var(--surface)',borderRadius:7,border:'1px solid var(--border)'}}>
                        <summary style={{padding:'10px 14px',cursor:'pointer',fontWeight:600,fontSize:12,color:'var(--text2)'}}>Show detailed breakdown</summary>
                        <div style={{padding:'10px 14px',fontSize:12}}>
                          {[
                            ['Purchase Invoice (clean + accrued)', pnlFmt(pnlResult.buyInvoice)],
                            ['Sale Invoice (clean + accrued)', pnlFmt(pnlResult.sellInvoice)],
                            ['Coupons received during holding', pnlFmt(pnlResult.couponsReceived), 'var(--green)'],
                            ['Repriced entry (at original yield, to sale date)', pnlFmt(pnlResult.repricedInvoice)],
                            null,
                            ['Purchase yield (YTM)', (pnlResult.buyY*100).toFixed(4)+'%'],
                            ['Purchase clean price', pnlResult.buyCleanPx.toFixed(4)],
                            ['Sale yield (YTM)', (pnlResult.sellY*100).toFixed(4)+'%'],
                            ['Sale clean price', pnlResult.sellCleanPx.toFixed(4)],
                            ['Holding period', pnlResult.holdingDays+' days'],
                          ].map((row, i) => row===null ? <div key={i} style={{height:6}}/> : (
                            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
                              <span style={{color:'var(--text2)'}}>{row[0]}</span>
                              <span style={{fontFamily:'var(--mono)',fontWeight:600,color:row[2]||'inherit'}}>{row[1]}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                    <div style={{marginTop:10,fontSize:11,color:'var(--text3)',textAlign:'center',fontStyle:'italic'}}>Revenue is gross. Financing costs, taxes, brokerage, and FX hedging not included.</div>
                  </div>
                )}
 
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
 
function Clock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'}));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <div className="clock">{time}</div>;
}
