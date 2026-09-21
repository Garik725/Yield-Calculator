// pages/portfolio.js
// Module 03 · The Book · refined portfolio with localStorage

import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

import {
  calcMarketValue as calcMV,
  calcPreviousMarketValue as calcMVPrev,
  analyzePortfolioValuation
} from '../lib/portfolio/valuation';
import PortfolioRiskPanel from '../components/PortfolioRiskPanel';
import PortfolioScenarioPanel from '../components/PortfolioScenarioPanel';

const STORAGE_KEY = 'yc.portfolio.v1';

const TYPE_CONFIG = {
  stock: { name: 'Stock', bg: '#E5ECE7', fg: '#214B3D' },
  bond: { name: 'Bond', bg: '#F0E8D4', fg: '#7A6228' },
  etf: { name: 'ETF', bg: '#E0EDF1', fg: '#2D5360' },
  fx: { name: 'FX / Cash', bg: '#EFE3EB', fg: '#5C3550' },
};

const DEMO_PORTFOLIO = [
  { id: 'd1', tkr: 'AAPL', type: 'stock', qty: 250, price: 195.50, purchasePrice: 172.40, chg: 1.25 },
  { id: 'd2', tkr: 'MSFT', type: 'stock', qty: 120, price: 412.88, purchasePrice: 365.20, chg: -2.15 },
  { id: 'd3', tkr: 'NVDA', type: 'stock', qty: 80, price: 875.40, purchasePrice: 710.00, chg: 15.20 },
  { id: 'd4', tkr: 'VOO', type: 'etf', qty: 200, price: 485.20, purchasePrice: 452.00, chg: 2.10 },
  { id: 'd5', tkr: 'US10Y', type: 'bond', qty: 500000, price: 98.35, purchasePrice: 96.75, chg: 0.12 },
  { id: 'd6', tkr: 'AAPL27', type: 'bond', qty: 250000, price: 95.80, purchasePrice: 97.10, chg: -0.08 },
  { id: 'd7', tkr: 'BND', type: 'etf', qty: 350, price: 72.50, purchasePrice: 70.20, chg: -0.15 },
  { id: 'd8', tkr: 'EUR.USD', type: 'fx', qty: 45000, price: 1.085, purchasePrice: 1.070, chg: 0.003 },
  { id: 'd9', tkr: 'GLD', type: 'etf', qty: 100, price: 215.40, purchasePrice: 198.00, chg: 1.20 },
  { id: 'd10', tkr: 'JPM28', type: 'bond', qty: 150000, price: 101.25, purchasePrice: 99.40, chg: 0.05 },
];

const fmt = (n, dp = 2) =>
  Number(n).toLocaleString('en-US', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp
  });

const fmtShort = n => {
  const abs = Math.abs(n);

  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'k';

  return '$' + fmt(n);
};

export default function Portfolio() {
  const [holdings, setHoldings] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    tkr: '',
    type: 'stock',
    qty: '',
    price: '',
    purchasePrice: '',
    chg: '0'
  });

  const [toast, setToast] = useState('');
  const importRef = useRef(null);

  const [lookupStatus, setLookupStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [didInitialRefresh, setDidInitialRefresh] = useState(false);

  const isAutoDayChange =
    form.type === 'stock' || form.type === 'etf';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const data = JSON.parse(raw);

        if (data && Array.isArray(data.positions)) {
          setHoldings(data.positions);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (didInitialRefresh) return;
    if (holdings.length === 0) return;

    const hasRefreshable = holdings.some(
      h => h.type === 'stock' || h.type === 'etf'
    );

    if (!hasRefreshable) return;

    const timer = setTimeout(() => {
      refreshAllPrices(true);
      setDidInitialRefresh(true);
    }, 500);

    return () => clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings.length, didInitialRefresh]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          positions: holdings
        })
      );
    } catch (e) {
      // ignore
    }
  }, [holdings]);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  const addPosition = () => {
    const tkr = form.tkr.trim().toUpperCase();
    const qty = parseFloat(form.qty);
    const price = parseFloat(form.price);
    const purchasePrice = parseFloat(form.purchasePrice);

    const chg =
      form.type === 'stock' || form.type === 'etf'
        ? parseFloat(form.chg) || 0
        : parseFloat(form.chg) || 0;

    if (
      !tkr ||
      isNaN(qty) ||
      qty <= 0 ||
      isNaN(price) ||
      price <= 0
    ) {
      showToast('Please fill ticker, quantity and price');
      return;
    }

    const newPos = {
      id: 'p' + Date.now() + Math.floor(Math.random() * 1000),
      tkr,
      type: form.type,
      qty,
      price,
      purchasePrice:
        !isNaN(purchasePrice) && purchasePrice > 0
          ? purchasePrice
          : null,
      chg,
    };

    setHoldings([...holdings, newPos]);

    setForm({
      tkr: '',
      type: form.type,
      qty: '',
      price: '',
      purchasePrice: '',
      chg: '0'
    });

    setLookupStatus('');
    showToast(`Added ${tkr}`);
  };

  const lookupPrice = async () => {
    const tkr = form.tkr.trim().toUpperCase();

    if (!tkr) return;

    if (form.type === 'bond' || form.type === 'fx') {
      return;
    }

    setLookupStatus('loading');

    try {
      const r = await fetch(
        `/api/quote?ticker=${encodeURIComponent(tkr)}`
      );

      if (!r.ok) {
        throw new Error(`Lookup failed (${r.status})`);
      }

      const data = await r.json();

      if (data.error || !data.price) {
        throw new Error(data.message || 'Ticker not found');
      }

      setForm(prev => ({
        ...prev,
        price: String(data.price),
        chg: String(data.change || 0),
      }));

      setLookupStatus('success');
    } catch (err) {
      console.error('Lookup error:', err);
      setLookupStatus('error');
    }
  };

  const refreshAllPrices = async (silent = false) => {
    const refreshable = holdings.filter(
      h => h.type === 'stock' || h.type === 'etf'
    );

    if (refreshable.length === 0) {
      if (!silent) showToast('No stocks or ETFs to refresh');
      return;
    }

    setRefreshing(true);

    if (!silent) {
      showToast(
        `Refreshing ${refreshable.length} position${
          refreshable.length === 1 ? '' : 's'
        }...`
      );
    }

    try {
      const tickers = refreshable.map(h => h.tkr).join(',');

      const r = await fetch(
        `/api/quote?ticker=${encodeURIComponent(tickers)}`
      );

      if (!r.ok) {
        throw new Error(`Refresh failed (${r.status})`);
      }

      const data = await r.json();
      const quotes = data.quotes || [data];

      let updated = 0;

      const newHoldings = holdings.map(h => {
        if (h.type !== 'stock' && h.type !== 'etf') {
          return h;
        }

        const live = quotes.find(
          q => q.ticker === h.tkr.toUpperCase()
        );

        if (!live || live.error || !live.price) {
          return h;
        }

        updated++;

        return {
          ...h,
          price: live.price,
          chg: live.change || 0
        };
      });

      setHoldings(newHoldings);
      setLastRefreshed(new Date());

      if (!silent) {
        showToast(
          `Updated ${updated} of ${refreshable.length} position${
            refreshable.length === 1 ? '' : 's'
          }`
        );
      }
    } catch (err) {
      console.error('Refresh error:', err);

      if (!silent) {
        showToast(`Refresh failed: ${err.message}`);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const deletePosition = id => {
    const h = holdings.find(x => x.id === id);

    if (!h) return;

    if (!confirm(`Remove ${h.tkr}?`)) return;

    setHoldings(
      holdings.filter(x => x.id !== id)
    );

    showToast(`Removed ${h.tkr}`);
  };

  const saveEdit = id => {
    const row = document.querySelector(
      `[data-row="${id}"]`
    );

    if (!row) return;

    const oldHolding = holdings.find(h => h.id === id);

    const qty = parseFloat(
      row.querySelector('[data-field="qty"]').value
    );

    const price = parseFloat(
      row.querySelector('[data-field="price"]').value
    );

    const purchasePriceInput =
      row.querySelector('[data-field="purchasePrice"]');

    const purchasePrice = purchasePriceInput
      ? parseFloat(purchasePriceInput.value)
      : null;

    const chgInput =
      row.querySelector('[data-field="chg"]');

    const chg = chgInput
      ? parseFloat(chgInput.value) || 0
      : oldHolding?.chg || 0;

    if (
      isNaN(qty) ||
      qty <= 0 ||
      isNaN(price) ||
      price <= 0
    ) {
      showToast('Invalid values');
      return;
    }

    setHoldings(
      holdings.map(h =>
        h.id === id
          ? {
              ...h,
              qty,
              price,
              purchasePrice:
                !isNaN(purchasePrice) && purchasePrice > 0
                  ? purchasePrice
                  : null,
              chg,
            }
          : h
      )
    );

    setEditingId(null);
    showToast('Position updated');
  };

  const loadDemo = () => {
    if (
      holdings.length &&
      !confirm('Replace current portfolio with demo data?')
    ) {
      return;
    }

    setHoldings(
      JSON.parse(JSON.stringify(DEMO_PORTFOLIO))
    );

    showToast('Demo portfolio loaded');
  };

  const clearAll = () => {
    if (!holdings.length) {
      showToast('Already empty');
      return;
    }

    if (
      !confirm(`Clear all ${holdings.length} positions?`)
    ) {
      return;
    }

    setHoldings([]);
    showToast('All positions cleared');
  };

  const exportPDF = async () => {
    if (!holdings.length) {
      showToast('Nothing to export');
      return;
    }

    showToast('Generating PDF...');

    try {
      const { default: jsPDF } = await import('jspdf');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 50;

      const totalVal = holdings.reduce(
        (s, h) => s + calcMV(h),
        0
      );

      const totalPrev = holdings.reduce(
        (s, h) => s + calcMVPrev(h),
        0
      );

      const dayPL = totalVal - totalPrev;

      const dayPct =
        totalPrev > 0
          ? (dayPL / totalPrev) * 100
          : 0;

      const top = [...holdings].sort(
        (a, b) => calcMV(b) - calcMV(a)
      )[0];

      const dateStr = new Date().toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }
      );

      doc.setDrawColor(33, 75, 61);
      doc.setLineWidth(2);
      doc.line(marginX, 80, marginX + 60, 80);

      doc.setTextColor(33, 75, 61);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('YIELD CALCULATOR', marginX, 100);

      doc.setTextColor(26, 24, 21);
      doc.setFont('times', 'normal');
      doc.setFontSize(38);
      doc.text('Portfolio Statement', marginX, 160);

      doc.setFont('times', 'italic');
      doc.setFontSize(14);
      doc.setTextColor(107, 103, 96);
      doc.text(`as of ${dateStr}`, marginX, 185);

      const cardY = 240;

      doc.setDrawColor(221, 213, 191);
      doc.setLineWidth(1);
      doc.rect(
        marginX,
        cardY,
        pageWidth - 2 * marginX,
        240
      );

      const statRow = (
        label,
        value,
        y,
        color
      ) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(107, 103, 96);
        doc.text(label.toUpperCase(), marginX + 25, y);

        doc.setFont('times', 'normal');
        doc.setFontSize(22);
        doc.setTextColor(
          ...(color || [26, 24, 21])
        );

        doc.text(
          value,
          pageWidth - marginX - 25,
          y,
          { align: 'right' }
        );
      };

      statRow(
        'Total Portfolio Value',
        '$' + fmt(totalVal),
        cardY + 50
      );

      statRow(
        "Today's P&L",
        (dayPL >= 0 ? '+' : '−') +
          '$' +
          fmt(Math.abs(dayPL)) +
          ` (${dayPct >= 0 ? '+' : ''}${dayPct.toFixed(2)}%)`,
        cardY + 110,
        dayPL >= 0
          ? [31, 94, 64]
          : [163, 61, 46]
      );

      statRow(
        'Positions',
        String(holdings.length),
        cardY + 165
      );

      statRow(
        'Top Holding',
        (top?.tkr || '–') +
          (top
            ? ` · ${((calcMV(top) / totalVal) * 100).toFixed(1)}%`
            : ''),
        cardY + 215
      );

      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(142, 138, 130);

      doc.text(
        'Generated by Yield Calculator · yieldcalculator.tech',
        pageWidth / 2,
        pageHeight - 50,
        { align: 'center' }
      );

      doc.text(
        'For informational purposes only. Not financial advice.',
        pageWidth / 2,
        pageHeight - 35,
        { align: 'center' }
      );

      doc.addPage();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(142, 138, 130);

      doc.text(
        'YIELD CALCULATOR · PORTFOLIO STATEMENT',
        marginX,
        40
      );

      doc.text(
        dateStr,
        pageWidth - marginX,
        40,
        { align: 'right' }
      );

      doc.setFont('times', 'normal');
      doc.setFontSize(24);
      doc.setTextColor(26, 24, 21);
      doc.text('Holdings', marginX, 85);

      doc.setDrawColor(26, 24, 21);
      doc.setLineWidth(1);
      doc.line(
        marginX,
        95,
        pageWidth - marginX,
        95
      );

      const colTkr = marginX;
      const colType = marginX + 80;
      const colQty = marginX + 195;
      const colPx = marginX + 285;
      const colChg = marginX + 360;
      const colMV = marginX + 460;
      const colWt = pageWidth - marginX;

      let y = 120;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(107, 103, 96);

      doc.text('TICKER', colTkr, y);
      doc.text('TYPE', colType, y);

      doc.text('QUANTITY', colQty, y, {
        align: 'right'
      });

      doc.text('PRICE', colPx, y, {
        align: 'right'
      });

      doc.text('DAY CHG', colChg, y, {
        align: 'right'
      });

      doc.text('MARKET VALUE', colMV, y, {
        align: 'right'
      });

      doc.text('WEIGHT', colWt, y, {
        align: 'right'
      });

      y += 8;

      doc.setDrawColor(221, 213, 191);
      doc.setLineWidth(0.5);

      doc.line(
        marginX,
        y,
        pageWidth - marginX,
        y
      );

      y += 18;

      for (const h of holdings) {
        if (y > pageHeight - 80) {
          doc.addPage();

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(142, 138, 130);

          doc.text(
            'YIELD CALCULATOR · PORTFOLIO STATEMENT (continued)',
            marginX,
            40
          );

          y = 80;
        }

        const mv = calcMV(h);

        const wt = (
          (mv / totalVal) * 100
        ).toFixed(1);

        doc.setFont('courier', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(26, 24, 21);
        doc.text(h.tkr, colTkr, y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(107, 103, 96);

        doc.text(
          TYPE_CONFIG[h.type]?.name || h.type,
          colType,
          y
        );

        doc.setFont('courier', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(26, 24, 21);

        doc.text(
          fmt(h.qty, 0),
          colQty,
          y,
          { align: 'right' }
        );

        doc.text(
          fmt(
            h.price,
            h.type === 'fx' ? 4 : 2
          ),
          colPx,
          y,
          { align: 'right' }
        );

        doc.setTextColor(
          ...(h.chg >= 0
            ? [31, 94, 64]
            : [163, 61, 46])
        );

        doc.text(
          (h.chg >= 0 ? '+' : '') +
            fmt(
              h.chg,
              h.type === 'fx' ? 4 : 2
            ),
          colChg,
          y,
          { align: 'right' }
        );

        doc.setTextColor(26, 24, 21);

        doc.text(
          fmtShort(mv),
          colMV,
          y,
          { align: 'right' }
        );

        doc.text(
          wt + '%',
          colWt,
          y,
          { align: 'right' }
        );

        y += 18;
      }

      y += 4;

      doc.setLineWidth(1);
      doc.setDrawColor(26, 24, 21);

      doc.line(
        marginX,
        y,
        pageWidth - marginX,
        y
      );

      y += 18;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(107, 103, 96);

      doc.text('TOTAL', colTkr, y);

      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(26, 24, 21);

      doc.text(
        fmtShort(totalVal),
        colMV,
        y,
        { align: 'right' }
      );

      doc.text(
        '100.0%',
        colWt,
        y,
        { align: 'right' }
      );

      doc.addPage();

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(142, 138, 130);

      doc.text(
        '· DATA RECORD ·',
        pageWidth / 2,
        50,
        { align: 'center' }
      );

      doc.text(
        'This page allows this PDF to be re-imported into Yield Calculator.',
        pageWidth / 2,
        68,
        { align: 'center' }
      );

      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(170, 165, 155);

      const json = JSON.stringify({
        version: 1,
        positions: holdings
      });

      const data = btoa(
        unescape(
          encodeURIComponent(json)
        )
      );

      const chunks =
        data.match(/.{1,90}/g) || [];

      let dy = 100;

      doc.text(
        '~~YCDATA~~',
        marginX,
        dy
      );

      dy += 10;

      for (const chunk of chunks) {
        if (dy > pageHeight - 40) {
          doc.addPage();

          dy = 60;

          doc.setFont('courier', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(170, 165, 155);
        }

        doc.text(
          chunk,
          marginX,
          dy
        );

        dy += 9;
      }

      doc.text(
        '~~ENDDATA~~',
        marginX,
        dy
      );

      doc.save(
        `portfolio_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      );

      showToast('Portfolio exported to PDF');
    } catch (err) {
      console.error(err);

      showToast(
        'PDF export failed: ' + err.message
      );
    }
  };

  const importPDF = async event => {
    const file = event.target.files[0];

    if (!file) return;

    if (
      !file.name.toLowerCase().endsWith('.pdf')
    ) {
      showToast('Please select a PDF file');
      event.target.value = '';
      return;
    }

    showToast('Reading PDF...');

    try {
      if (!window.pdfjsLib) {
        await new Promise(
          (resolve, reject) => {
            const script =
              document.createElement('script');

            script.src =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';

            script.onload = () => {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

              resolve();
            };

            script.onerror = () =>
              reject(
                new Error(
                  'Failed to load PDF reader'
                )
              );

            document.body.appendChild(script);
          }
        );
      }

      const arrayBuffer =
        await file.arrayBuffer();

      const pdf =
        await window.pdfjsLib
          .getDocument({
            data: arrayBuffer
          })
          .promise;

      let allText = '';

      for (
        let i = 1;
        i <= pdf.numPages;
        i++
      ) {
        const page =
          await pdf.getPage(i);

        const content =
          await page.getTextContent();

        allText += content.items
          .map(item => item.str)
          .join(' ');
      }

      const match = allText.match(
        /~~YCDATA~~([\s\S]+?)~~ENDDATA~~/
      );

      if (!match) {
        showToast(
          'This PDF was not exported from Yield Calculator'
        );

        event.target.value = '';
        return;
      }

      const cleaned =
        match[1].replace(/\s/g, '');

      const json =
        decodeURIComponent(
          escape(atob(cleaned))
        );

      const data =
        JSON.parse(json);

      if (
        !data.positions ||
        !Array.isArray(data.positions)
      ) {
        throw new Error(
          'Invalid data format'
        );
      }

      if (
        holdings.length &&
        !confirm(
          `Replace current portfolio (${holdings.length}) with imported (${data.positions.length})?`
        )
      ) {
        event.target.value = '';
        return;
      }

      const clean =
        data.positions
          .map(p => ({
            id:
              p.id ||
              'p' +
                Date.now() +
                Math.random(),

            tkr: p.tkr || '',

            type: p.type || 'stock',

            qty:
              parseFloat(p.qty) || 0,

            price:
              parseFloat(p.price) || 0,

            purchasePrice:
              parseFloat(p.purchasePrice) > 0
                ? parseFloat(p.purchasePrice)
                : null,

            chg:
              parseFloat(p.chg) || 0,
          }))
          .filter(
            p =>
              p.tkr &&
              p.qty > 0 &&
              p.price > 0
          );

      setHoldings(clean);

      showToast(
        `Imported ${clean.length} positions from PDF`
      );
    } catch (err) {
      console.error(err);

      showToast(
        'Import failed: ' +
          (err.message ||
            'Could not read PDF')
      );
    } finally {
      event.target.value = '';
    }
  };

  const portfolioAnalytics =
    analyzePortfolioValuation(
      holdings,
      {
        baseCurrency: 'USD',
        useDirtyBondValue: true
      }
    );

  const total =
    portfolioAnalytics.valuation.totalValue;

  const totalPrev =
    portfolioAnalytics.valuation.totalPreviousValue ??
    0;

  const dayPL =
    portfolioAnalytics.valuation.dayPnL ??
    0;

  const dayPct =
    portfolioAnalytics.valuation.dayReturn !== null
      ? portfolioAnalytics.valuation.dayReturn * 100
      : 0;

  const byType =
    Object.fromEntries(
      Object.entries(
        portfolioAnalytics.allocations.byAssetClass
      ).map(([type, data]) => [
        type,
        data.value
      ])
    );

  const topHolding =
    portfolioAnalytics.concentration.largestHolding
      ? holdings.find(
          h =>
            (h.symbol || h.tkr) ===
            portfolioAnalytics.concentration
              .largestHolding.symbol
        )
      : null;

  const totalCostBasis =
    portfolioAnalytics.valuation.totalCostBasis;

  const unrealizedPL =
    portfolioAnalytics.valuation.unrealizedPnL;

  const totalReturnPct =
    portfolioAnalytics.valuation.unrealizedReturn !== null
      ? portfolioAnalytics.valuation.unrealizedReturn * 100
      : null;

  const hasCostBasis =
    portfolioAnalytics.dataQuality.completeCostBasis;

  return (
    <>
      <Head>
        <title>
          Portfolio · Yield Calculator
        </title>

        <meta
          name="description"
          content="A working bond and equity portfolio, stored in your browser."
        />

        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />

        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        a {
          color: inherit;
          text-decoration: none;
        }

        button {
          font-family: inherit;
          border: none;
          background: none;
          cursor: pointer;
          color: inherit;
        }

        input,
        select {
          font-family: var(--sans);
        }

        img,
        svg {
          max-width: 100%;
          display: block;
        }
      `}</style>

      <header className="hd">
        <div className="hd-inner">
          <Link
            href="/"
            className="hd-brand"
          >
            <span className="hd-mark">
              YC
            </span>

            <span className="hd-name">
              Yield <i>Calculator</i>
            </span>
          </Link>

          <nav className="hd-nav">
            <Link
              href="/calc"
              className="hd-link"
            >
              Calculator
            </Link>

            <Link
              href="/revenue"
              className="hd-link"
            >
              P&amp;L
            </Link>

            <Link
              href="/portfolio"
              className="hd-link active"
            >
              Portfolio
            </Link>

            <Link
              href="/curve"
              className="hd-link"
            >
              Yield Curve
            </Link>

            <Link
              href="/fx"
              className="hd-link"
            >
              FX
            </Link>

            <Link
              href="/risk"
              className="hd-link"
            >
              Risk
            </Link>
          </nav>
        </div>
      </header>

      <main className="page">
        <div className="page-inner">
          <div className="page-head">
            <div className="head-text">
              <div className="eyebrow">
                Module № 03
              </div>

              <h1 className="page-h">
                The <em>Book.</em>
              </h1>

              <p className="page-lede">
                A working portfolio, stored in your browser. Add positions by ticker or ISIN, edit and delete inline, export as JSON for backup or import from a saved file. LocalStorage-first, zero server state.
              </p>
            </div>

            <div className="head-actions">
              <button
                className="btn-ghost"
                onClick={loadDemo}
              >
                Load Demo
              </button>

              <button
                className="btn-ghost refresh"
                onClick={refreshAllPrices}
                disabled={refreshing}
              >
                {refreshing
                  ? 'Refreshing…'
                  : '↻ Refresh Prices'}
              </button>

              <button
                className="btn-ghost"
                onClick={exportPDF}
              >
                Export PDF
              </button>

              <button
                className="btn-ghost"
                onClick={() =>
                  importRef.current?.click()
                }
              >
                Import PDF
              </button>

              <input
                ref={importRef}
                type="file"
                accept=".pdf"
                onChange={importPDF}
                style={{
                  display: 'none'
                }}
              />

              <button
                className="btn-ghost danger"
                onClick={clearAll}
              >
                Clear All
              </button>
            </div>
          </div>

          <section className="add-card">
            <div className="add-head">
              Add Position
            </div>

            <div className="add-row">
              <div className="field f-tkr">
                <label>
                  Ticker / ISIN
                </label>

                <div className="ticker-wrap">
                  <input
                    type="text"
                    value={form.tkr}
                    placeholder="AAPL"
                    onChange={e => {
                      setForm({
                        ...form,
                        tkr: e.target.value
                      });

                      setLookupStatus('');
                    }}
                    onBlur={lookupPrice}
                    onKeyDown={e =>
                      e.key === 'Enter' &&
                      (form.price
                        ? addPosition()
                        : lookupPrice())
                    }
                  />

                  {lookupStatus === 'loading' && (
                    <span className="lookup-tag loading">
                      …
                    </span>
                  )}

                  {lookupStatus === 'success' && (
                    <span className="lookup-tag success">
                      ✓ Live
                    </span>
                  )}

                  {lookupStatus === 'error' && (
                    <span className="lookup-tag error">
                      Not found
                    </span>
                  )}
                </div>
              </div>

              <div className="field">
                <label>
                  Type
                </label>

                <select
                  value={form.type}
                  onChange={e => {
                    const newType = e.target.value;

                    setForm({
                      ...form,
                      type: newType,
                      chg:
                        newType === 'stock' ||
                        newType === 'etf'
                          ? '0'
                          : form.chg
                    });

                    setLookupStatus('');
                  }}
                >
                  <option value="stock">
                    Stock
                  </option>

                  <option value="bond">
                    Bond
                  </option>

                  <option value="etf">
                    ETF
                  </option>

                  <option value="fx">
                    FX / Cash
                  </option>
                </select>
              </div>

              <div className="field">
                <label>
                  Quantity
                </label>

                <input
                  type="number"
                  value={form.qty}
                  placeholder="100"
                  step="any"
                  onChange={e =>
                    setForm({
                      ...form,
                      qty: e.target.value
                    })
                  }
                  onKeyDown={e =>
                    e.key === 'Enter' &&
                    addPosition()
                  }
                />
              </div>

              <div className="field">
                <label>
                  Price
                </label>

                <input
                  type="number"
                  value={form.price}
                  placeholder="195.50"
                  step="0.001"
                  onChange={e =>
                    setForm({
                      ...form,
                      price: e.target.value
                    })
                  }
                  onKeyDown={e =>
                    e.key === 'Enter' &&
                    addPosition()
                  }
                />
              </div>

              <div className="field">
                <label>
                  Purchase Price
                </label>

                <input
                  type="number"
                  value={form.purchasePrice}
                  placeholder="170.00"
                  step="0.001"
                  onChange={e =>
                    setForm({
                      ...form,
                      purchasePrice: e.target.value
                    })
                  }
                  onKeyDown={e =>
                    e.key === 'Enter' &&
                    addPosition()
                  }
                />
              </div>

              <div className="field">
                <label>
                  Day Chg
                </label>

                <input
                  type="number"
                  value={form.chg}
                  placeholder={
                    isAutoDayChange
                      ? 'Automatic'
                      : '0.00'
                  }
                  step="0.01"
                  disabled={isAutoDayChange}
                  title={
                    isAutoDayChange
                      ? 'Automatically fetched from market data'
                      : 'Enter the daily price change manually'
                  }
                  onChange={e =>
                    setForm({
                      ...form,
                      chg: e.target.value
                    })
                  }
                  onKeyDown={e =>
                    e.key === 'Enter' &&
                    addPosition()
                  }
                />

                <span className="field-note">
                  {isAutoDayChange
                    ? 'Auto from market data'
                    : 'Manual'}
                </span>
              </div>
            </div>

            <div className="add-actions">
              <p className="add-hint">
                For <b>stocks</b>/<b>ETFs</b>, price and day change can be fetched automatically. For <b>bonds</b>, quantity = face value and price = clean price per 100. For <b>FX</b>, cash × rate to USD.
              </p>

              <button
                className="btn-add"
                onClick={addPosition}
              >
                + Add Position
              </button>
            </div>
          </section>

          {holdings.length > 0 && (
            <div className="kpis">
              <div className="kpi feat">
                <div className="kpi-l">
                  Total Portfolio Value
                </div>

                <div className="kpi-v">
                  {fmtShort(total)}
                </div>

                <div
                  className={`kpi-c ${
                    dayPL >= 0 ? 'pos' : 'neg'
                  }`}
                >
                  {dayPL >= 0 ? '▲' : '▼'}{' '}
                  {fmt(Math.abs(dayPct), 2)}% today

                  <span className="kpi-c-sub">
                    ({dayPL >= 0 ? '+' : '−'}
                    {fmtShort(Math.abs(dayPL))})
                  </span>
                </div>
              </div>

              <div className="kpi">
                <div className="kpi-l">
                  Unrealized P&amp;L
                </div>

                <div
                  className={`kpi-v ${
                    hasCostBasis
                      ? unrealizedPL >= 0
                        ? 'pos'
                        : 'neg'
                      : ''
                  }`}
                >
                  {hasCostBasis &&
                  unrealizedPL !== null
                    ? `${
                        unrealizedPL >= 0
                          ? '+'
                          : '−'
                      }${fmtShort(
                        Math.abs(unrealizedPL)
                      )}`
                    : '–'}
                </div>

                <div className="kpi-s">
                  {hasCostBasis &&
                  totalCostBasis !== null
                    ? `Cost basis: ${fmtShort(
                        totalCostBasis
                      )}`
                    : 'Add purchase price to all positions'}
                </div>
              </div>

              <div className="kpi">
                <div className="kpi-l">
                  Total Return
                </div>

                <div
                  className={`kpi-v ${
                    totalReturnPct !== null
                      ? totalReturnPct >= 0
                        ? 'pos'
                        : 'neg'
                      : ''
                  }`}
                >
                  {totalReturnPct !== null
                    ? `${
                        totalReturnPct >= 0
                          ? '+'
                          : ''
                      }${fmt(
                        totalReturnPct,
                        2
                      )}%`
                    : '–'}
                </div>

                <div className="kpi-s">
                  Since purchase
                </div>
              </div>

              <div className="kpi">
                <div className="kpi-l">
                  Top Holding
                </div>

                <div className="kpi-v top">
                  {topHolding?.tkr || '–'}
                </div>

                <div className="kpi-s">
                  {topHolding
                    ? `${fmtShort(
                        calcMV(topHolding)
                      )} (${(
                        (calcMV(topHolding) /
                          total) *
                        100
                      ).toFixed(1)}%)`
                    : '–'}
                </div>
              </div>
            </div>
          )}

          {holdings.length > 0 &&
            holdings.some(
              h =>
                h.type === 'stock' ||
                h.type === 'etf'
            ) && (
              <div className="data-status">
                <div className="ds-line">
                  <span className="ds-dot" />

                  {refreshing ? (
                    <span className="ds-text">
                      Fetching latest prices…
                    </span>
                  ) : lastRefreshed ? (
                    <span className="ds-text">
                      Stock &amp; ETF prices last refreshed at{' '}
                      <b>
                        {lastRefreshed.toLocaleTimeString(
                          'en-US',
                          {
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit'
                          }
                        )}
                      </b>
                    </span>
                  ) : (
                    <span className="ds-text">
                      Click <b>Refresh Prices</b> to fetch the latest stock &amp; ETF prices
                    </span>
                  )}
                </div>

                <div className="ds-note">
                  Stock &amp; ETF day change is automatic · bonds and FX remain manual
                </div>
              </div>
            )}

          {holdings.length === 0 ? (
            <div className="empty">
              <div className="empty-mark">
                ·
              </div>

              <h3 className="empty-h">
                Your portfolio is empty
              </h3>

              <p className="empty-p">
                Add positions above, or load the demo to see how everything works.
              </p>

              <button
                className="btn-fill"
                onClick={loadDemo}
              >
                Load Demo Portfolio
              </button>
            </div>
          ) : (
            <div className="table">
              <div className="thead">
                <div>Ticker</div>
                <div>Type</div>
                <div className="r">Quantity</div>
                <div className="r">Price</div>
                <div className="r">Purchase Price</div>
                <div className="r">Day Chg</div>
                <div className="r">Market Value</div>
                <div className="r">Unrealized P&amp;L</div>
                <div className="r">Weight</div>
                <div className="c">·</div>
              </div>

              {holdings.map(h => {
                const mv = calcMV(h);

                const wt =
                  total > 0
                    ? (
                        (mv / total) * 100
                      ).toFixed(1)
                    : '0.0';

                const analyzedPosition =
                  portfolioAnalytics.positions.find(
                    p => p.id === h.id
                  );

                const unrealized =
                  analyzedPosition?.unrealizedPnLBase ??
                  null;

                const isEditing =
                  editingId === h.id;

                const tc =
                  TYPE_CONFIG[h.type] ||
                  TYPE_CONFIG.stock;

                const autoRowDayChange =
                  h.type === 'stock' ||
                  h.type === 'etf';

                return (
                  <div
                    key={h.id}
                    className={`trow ${
                      isEditing ? 'editing' : ''
                    }`}
                    data-row={h.id}
                  >
                    <div className="td-tkr">
                      {h.tkr}
                    </div>

                    <div>
                      <span
                        className="pill"
                        style={{
                          background: tc.bg,
                          color: tc.fg
                        }}
                      >
                        {tc.name}
                      </span>
                    </div>

                    <div className="r mono">
                      {isEditing ? (
                        <input
                          defaultValue={h.qty}
                          data-field="qty"
                          className="inline-i"
                          type="number"
                          step="any"
                        />
                      ) : (
                        fmt(h.qty, 0)
                      )}
                    </div>

                    <div className="r mono">
                      {isEditing ? (
                        <input
                          defaultValue={h.price}
                          data-field="price"
                          className="inline-i"
                          type="number"
                          step="0.001"
                        />
                      ) : (
                        fmt(
                          h.price,
                          h.type === 'fx' ? 4 : 2
                        )
                      )}
                    </div>

                    <div className="r mono">
                      {isEditing ? (
                        <input
                          defaultValue={
                            h.purchasePrice ?? ''
                          }
                          data-field="purchasePrice"
                          className="inline-i"
                          type="number"
                          step="0.001"
                          placeholder="–"
                        />
                      ) : h.purchasePrice ? (
                        fmt(
                          h.purchasePrice,
                          h.type === 'fx' ? 4 : 2
                        )
                      ) : (
                        '–'
                      )}
                    </div>

                    <div
                      className={`r mono ${
                        h.chg >= 0 ? 'pos' : 'neg'
                      }`}
                    >
                      {isEditing &&
                      !autoRowDayChange ? (
                        <input
                          defaultValue={h.chg}
                          data-field="chg"
                          className="inline-i"
                          type="number"
                          step="0.01"
                        />
                      ) : (
                        <>
                          {h.chg >= 0 ? '+' : ''}
                          {fmt(
                            Math.abs(h.chg),
                            h.type === 'fx' ? 4 : 2
                          )}

                          {autoRowDayChange && (
                            <span className="auto-mark">
                              AUTO
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <div className="r mono mv">
                      {fmtShort(mv)}
                    </div>

                    <div
                      className={`r mono ${
                        unrealized !== null
                          ? unrealized >= 0
                            ? 'pos'
                            : 'neg'
                          : ''
                      }`}
                    >
                      {unrealized !== null
                        ? `${
                            unrealized >= 0
                              ? '+'
                              : '−'
                          }${fmtShort(
                            Math.abs(unrealized)
                          )}`
                        : '–'}
                    </div>

                    <div className="r mono">
                      {wt}%
                    </div>

                    <div className="c row-actions">
                      {isEditing ? (
                        <>
                          <button
                            className="ra"
                            onClick={() =>
                              saveEdit(h.id)
                            }
                            title="Save"
                          >
                            ✓
                          </button>

                          <button
                            className="ra"
                            onClick={() =>
                              setEditingId(null)
                            }
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="ra"
                            onClick={() =>
                              setEditingId(h.id)
                            }
                            title="Edit"
                          >
                            ✎
                          </button>

                          <button
                            className="ra del"
                            onClick={() =>
                              deletePosition(h.id)
                            }
                            title="Delete"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="tfoot">
                <div>Totals</div>
                <div />
                <div />
                <div />
                <div />
                <div />

                <div className="r mono">
                  <b>{fmtShort(total)}</b>
                </div>

                <div
                  className={`r mono ${
                    hasCostBasis &&
                    unrealizedPL !== null
                      ? unrealizedPL >= 0
                        ? 'pos'
                        : 'neg'
                      : ''
                  }`}
                >
                  <b>
                    {hasCostBasis &&
                    unrealizedPL !== null
                      ? `${
                          unrealizedPL >= 0
                            ? '+'
                            : '−'
                        }${fmtShort(
                          Math.abs(unrealizedPL)
                        )}`
                      : '–'}
                  </b>
                </div>

                <div className="r mono">
                  <b>100.0%</b>
                </div>

                <div />
                       </div>
            </div>
          )}

          {holdings.length > 0 && (
            <PortfolioRiskPanel holdings={holdings} />
          )}
            
{holdings.length > 0 && (
  <PortfolioScenarioPanel holdings={holdings} />
)}

        </div>
      </main>

      <footer className="ft">
        <div className="ft-inner">
          <div>
            © 2026 Yield Calculator ·{' '}
            <Link href="/">Home</Link> ·{' '}
            <a href="mailto:hello@yieldcalculator.tech">
              Contact
            </a>
          </div>

          <div className="ft-disc">
            Portfolio data stored locally in your browser. For informational purposes only.
          </div>
        </div>
      </footer>

      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

      <style jsx>{`
        .hd {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(246, 248, 250, 0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--rule);
        }

        .hd-inner {
          max-width: var(--col);
          margin: 0 auto;
          padding: 16px var(--pad);
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .hd-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .hd-mark {
          width: 32px;
          height: 32px;
          background: var(--accent);
          color: var(--paper);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--display);
          font-weight: 700;
          font-size: 13px;
        }

        .hd-name {
          font-family: var(--display);
          font-weight: 600;
          font-size: 18px;
        }

        .hd-name :global(i) {
          font-style: italic;
          font-weight: 400;
          color: var(--ink-3);
        }

        .hd-nav {
          flex: 1;
          display: flex;
          gap: 24px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .hd-link {
          padding: 8px 4px;
          font-family: var(--sans);
          font-size: 13.5px;
          font-weight: 500;
          color: var(--ink-3);
          border-bottom: 2px solid transparent;
          white-space: nowrap;
        }

        .hd-link:hover {
          color: var(--ink);
        }

        .hd-link.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
        }

        .page {
          padding: clamp(40px, 6vw, 72px) 0 80px;
          min-height: calc(100vh - 200px);
        }

        .page-inner {
          max-width: var(--col);
          margin: 0 auto;
          padding: 0 var(--pad);
        }

        .page-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 32px;
          flex-wrap: wrap;
          margin-bottom: 40px;
          padding-bottom: 28px;
          border-bottom: 1px solid var(--rule);
        }

        .head-text {
          flex: 1;
          min-width: 320px;
        }

        .eyebrow {
          font-family: var(--sans);
          font-weight: 600;
          font-size: 11px;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .eyebrow::before {
          content: "";
          width: 28px;
          height: 1px;
          background: var(--accent);
        }

        .page-h {
          font-family: var(--display);
          font-weight: 500;
          font-size: clamp(38px, 5.5vw, 64px);
          line-height: 1;
          letter-spacing: -.022em;
          margin-bottom: 14px;
        }

        .page-h :global(em) {
          font-style: italic;
          font-weight: 400;
          color: var(--accent);
        }

        .page-lede {
          font-family: var(--sans);
          font-size: 16px;
          line-height: 1.6;
          color: var(--ink-2);
          max-width: 620px;
        }

        .head-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn-ghost {
          padding: 9px 16px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text2);
          font-family: var(--sans);
          font-size: 12px;
          font-weight: 500;
          border-radius: 7px;
        }

        .btn-ghost:hover {
          border-color: var(--blue);
          color: var(--blue);
          background: var(--blue-dim);
        }

        .btn-ghost.danger:hover {
          border-color: var(--red);
          color: var(--red);
          background: var(--red-dim);
        }

        .btn-ghost:disabled {
          opacity: 0.5;
          cursor: wait;
        }

        .ticker-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .ticker-wrap input {
          flex: 1;
          padding-right: 80px;
        }

        .lookup-tag {
          position: absolute;
          right: 8px;
          font-family: var(--sans);
          font-size: 10px;
          font-weight: 600;
          padding: 3px 8px;
          pointer-events: none;
        }

        .lookup-tag.success {
          color: var(--bull);
          background: var(--accent-soft);
        }

        .lookup-tag.error {
          color: var(--bear);
          background: #FCEDE9;
        }

        .btn-fill {
          display: inline-block;
          padding: 12px 28px;
          background: var(--blue);
          color: #fff;
          font-family: var(--sans);
          font-weight: 600;
          font-size: 13.5px;
          border-radius: 9px;
          margin-top: 16px;
        }

        .add-card {
          background: var(--paper-2);
          border: 1px solid var(--rule);
          padding: 24px 28px;
          margin-bottom: 28px;
        }

        .add-head {
          font-family: var(--sans);
          font-size: 11px;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--ink-3);
          font-weight: 600;
          margin-bottom: 18px;
        }

        .add-row {
          display: grid;
          grid-template-columns:
            1.25fr
            0.85fr
            0.9fr
            0.9fr
            0.9fr
            0.8fr;
          gap: 10px;
          align-items: start;
        }

        .add-row .field {
          min-width: 0;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field label {
          font-family: var(--sans);
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--ink-3);
        }

        .field input,
        .field select {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 12px;
          background: var(--bg);
          border: 1.5px solid var(--border2);
          border-radius: 7px;
          font-family: var(--mono);
          font-size: 13.5px;
          color: var(--text);
          outline: none;
        }

        .field input:focus,
        .field select:focus {
          border-color: var(--blue);
          background: var(--surface);
        }

        .field input:disabled {
          background: var(--paper-3);
          color: var(--ink-3);
          cursor: not-allowed;
          opacity: 0.8;
        }

        .field-note {
          font-family: var(--sans);
          font-size: 9.5px;
          color: var(--ink-3);
          font-style: italic;
          min-height: 12px;
        }

        .add-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid var(--rule);
          flex-wrap: wrap;
        }

        .add-hint {
          font-family: var(--sans);
          font-size: 12.5px;
          color: var(--ink-3);
          font-style: italic;
          line-height: 1.5;
          flex: 1;
          margin: 0;
        }

        .btn-add {
          padding: 11px 24px;
          background: var(--blue);
          color: #fff;
          font-family: var(--sans);
          font-weight: 600;
          font-size: 13px;
          border-radius: 9px;
          white-space: nowrap;
        }

        .kpis {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 1px;
          background: var(--rule);
          border: 1px solid var(--rule);
          margin-bottom: 28px;
        }

        .kpi {
          background: var(--paper-2);
          padding: 22px 26px;
        }

        .kpi.feat {
          background: var(--ink);
          color: var(--paper);
        }

        .kpi-l {
          font-family: var(--sans);
          font-size: 10.5px;
          letter-spacing: .2em;
          text-transform: uppercase;
          font-weight: 600;
          opacity: .6;
          margin-bottom: 10px;
        }

        .kpi-v {
          font-family: var(--display);
          font-weight: 600;
          font-size: 28px;
          line-height: 1.05;
        }

        .kpi.feat .kpi-v {
          font-size: 36px;
          color: var(--paper);
        }

        .kpi-v.top {
          font-family: var(--mono);
          font-size: 22px;
        }

        .kpi-v.pos,
        .pos {
          color: var(--bull);
        }

        .kpi-v.neg,
        .neg {
          color: var(--bear);
        }

        .kpi-c {
          font-family: var(--sans);
          font-weight: 500;
          font-size: 13px;
          margin-top: 8px;
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
        }

        .kpi-c.pos {
          color: #5DD176;
        }

        .kpi-c.neg {
          color: #E95B4B;
        }

        .kpi-c-sub {
          font-family: var(--mono);
          font-size: 11.5px;
          opacity: .7;
        }

        .kpi-s {
          font-family: var(--mono);
          font-size: 11.5px;
          color: var(--ink-3);
          margin-top: 6px;
        }

        .data-status {
          background: var(--paper-2);
          border: 1px solid var(--rule);
          border-left: 3px solid var(--accent);
          padding: 12px 18px;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ds-line {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--sans);
          font-size: 13px;
          color: var(--ink-2);
        }

        .ds-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--accent);
        }

        .ds-note {
          font-family: var(--sans);
          font-style: italic;
          font-size: 11.5px;
          color: var(--ink-3);
          padding-left: 17px;
        }

        .auto-mark {
          display: inline-block;
          margin-left: 6px;
          font-family: var(--sans);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .08em;
          color: var(--ink-3);
          opacity: 0.7;
        }

        .empty {
          padding: 80px 24px 60px;
          text-align: center;
          background: var(--paper-2);
          border: 1px solid var(--rule);
        }

        .empty-mark {
          font-family: var(--display);
          font-size: 64px;
          color: var(--ink-4);
        }

        .empty-h {
          font-family: var(--display);
          font-weight: 500;
          font-size: 26px;
          margin-bottom: 10px;
        }

        .empty-p {
          font-family: var(--sans);
          font-size: 15px;
          color: var(--ink-3);
          font-style: italic;
          max-width: 440px;
          margin: 0 auto;
        }

        .table {
          background: var(--paper-2);
          border: 1px solid var(--rule);
          overflow-x: auto;
        }

        .thead,
        .trow,
        .tfoot {
          display: grid;
          grid-template-columns:
            1fr
            0.8fr
            1fr
            1fr
            1fr
            1fr
            1fr
            1fr
            0.7fr
            0.8fr;
          padding: 13px 22px;
          border-bottom: 1px solid var(--rule);
          align-items: center;
          min-width: 1150px;
        }

        .thead {
          font-family: var(--sans);
          font-size: 10.5px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--ink-3);
          font-weight: 600;
          background: var(--paper-3);
          border-bottom: 2px solid var(--ink);
        }

        .trow {
          font-size: 13.5px;
        }

        .trow:hover {
          background: var(--paper-3);
        }

        .trow.editing {
          background: var(--accent-soft);
        }

        .tfoot {
          background: var(--paper-3);
          border-top: 1px solid var(--ink);
          border-bottom: none;
          font-family: var(--sans);
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ink-3);
          text-transform: uppercase;
        }

        .tfoot b {
          font-family: var(--mono);
          color: var(--ink);
          font-size: 14px;
          text-transform: none;
        }

        .r {
          text-align: right;
        }

        .c {
          text-align: center;
        }

        .td-tkr {
          font-family: var(--mono);
          font-weight: 600;
          color: var(--ink);
          font-size: 13.5px;
        }

        .pill {
          display: inline-block;
          font-family: var(--mono);
          font-size: 10px;
          font-weight: 600;
          padding: 3px 10px;
          text-transform: uppercase;
        }

        .mono {
          font-family: var(--mono);
          font-weight: 500;
          color: var(--ink);
        }

        .mv {
          font-weight: 600;
        }

        .row-actions {
          display: flex;
          gap: 4px;
          justify-content: center;
        }

        .ra {
          padding: 4px 9px;
          color: var(--ink-3);
          font-size: 14px;
        }

        .ra:hover {
          color: var(--accent);
          background: var(--accent-soft);
        }

        .ra.del:hover {
          color: var(--bear);
          background: #FCEDE9;
        }

        .inline-i {
          width: 100%;
          padding: 5px 8px;
          border: 1px solid var(--accent);
          background: var(--paper);
          font-family: var(--mono);
          font-size: 13px;
          text-align: right;
          outline: none;
          color: var(--ink);
          box-sizing: border-box;
        }

        .ft {
          background: var(--ink);
          color: var(--paper);
          padding: 28px var(--pad);
        }

        .ft-inner {
          max-width: var(--col);
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          font-family: var(--sans);
          font-size: 12px;
          color: rgba(248, 244, 234, 0.6);
        }

        .ft-disc {
          font-style: italic;
          opacity: 0.7;
        }

        .toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: var(--ink);
          color: var(--paper);
          padding: 12px 20px;
          font-family: var(--sans);
          font-size: 13px;
          font-weight: 500;
          z-index: 200;
          border-left: 3px solid var(--accent);
        }

        @media (max-width: 960px) {
          .hd-inner {
            gap: 16px;
          }

          .hd-nav {
            gap: 18px;
          }

          .add-row {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .kpis {
            grid-template-columns: 1fr 1fr;
          }

          .add-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .btn-add {
            width: 100%;
          }
        }

        @media (max-width: 560px) {
          .add-row {
            grid-template-columns: 1fr;
          }

          .page-head {
            flex-direction: column;
            align-items: stretch;
          }

          .kpis {
            grid-template-columns: 1fr;
          }

          .toast {
            left: 24px;
            right: 24px;
            bottom: 16px;
          }
        }
      `}</style>
    </>
  );
}
