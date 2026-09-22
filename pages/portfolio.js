
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
import BondAnalyticsPanel from '../components/BondAnalyticsPanel';

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
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    tkr: '',
    type: 'stock',
    qty: '',
    price: '',
    purchasePrice: '',
    modifiedDuration: '',
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

        if (!data || !Array.isArray(data.positions)) {
          throw new Error('Saved portfolio has an invalid format');
        }
        setHoldings(data.positions);
      }
    } catch (e) {
      console.error('Failed to restore portfolio:', e);
      setStorageError('Could not read the saved portfolio. Changes are disabled to protect your existing data.');
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady || storageError) return;
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
  }, [holdings.length, didInitialRefresh, storageReady, storageError]);

  useEffect(() => {
    if (!storageReady || storageError) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          positions: holdings
        })
      );
    } catch (e) {
      console.error('Failed to save portfolio:', e);
      setStorageError('Saving failed. Export your holdings before making further changes.');
    }
  }, [holdings, storageReady, storageError]);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  const addPosition = () => {
    if (!storageReady || storageError) return;
    const tkr = form.tkr.trim().toUpperCase();
    const qty = parseFloat(form.qty);
    const price = parseFloat(form.price);
    const purchasePrice = parseFloat(form.purchasePrice);
    const durationText = String(form.modifiedDuration ?? '').trim();
    const modifiedDuration = durationText === '' ? null : Number(durationText);

    if (form.type === 'bond' && modifiedDuration !== null &&
        (!Number.isFinite(modifiedDuration) || modifiedDuration < 0)) {
      showToast('Modified duration must be zero or positive');
      return;
    }

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
      modifiedDuration: form.type === 'bond' ? modifiedDuration : null,
      chg,
    };

    setHoldings([...holdings, newPos]);

    setForm({
      tkr: '',
      type: form.type,
      qty: '',
      price: '',
      purchasePrice: '',
      modifiedDuration: '',
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
    if (!storageReady || storageError) return;
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
    if (!storageReady || storageError) return;
    const h = holdings.find(x => x.id === id);

    if (!h) return;

    if (!confirm(`Remove ${h.tkr}?`)) return;

    setHoldings(
      holdings.filter(x => x.id !== id)
    );

    showToast(`Removed ${h.tkr}`);
  };

  const saveEdit = id => {
    if (!storageReady || storageError) return;
    const row = document.querySelector(
      `[data-row="${id}"]`
    );

    if (!row) return;

    const oldHolding = holdings.find(h => h.id === id);
    const durationInput = row.querySelector('[data-field="modifiedDuration"]');
    const durationText = durationInput ? durationInput.value.trim() : '';
    const modifiedDuration = durationText === '' ? null : Number(durationText);

    if (oldHolding?.type === 'bond' && modifiedDuration !== null &&
        (!Number.isFinite(modifiedDuration) || modifiedDuration < 0)) {
      showToast('Invalid modified duration');
      return;
    }

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

    setHoldings(previous => previous.map(h => {
      if (h.id !== id) return h;
      const isBond = h.type === 'bond';
      const priceChanged = Number(h.price) !== price;
      const quantityChanged = Number(h.qty) !== qty;
      const oldDuration =
        h.modifiedDuration === null || h.modifiedDuration === undefined || h.modifiedDuration === ''
          ? null : Number(h.modifiedDuration);
      const durationChanged = isBond && oldDuration !== modifiedDuration;
      const invalid = isBond && (priceChanged || quantityChanged || durationChanged);

      return {
        ...h,
        qty,
        price,
        purchasePrice:
          !isNaN(purchasePrice) && purchasePrice > 0 ? purchasePrice : null,
        modifiedDuration: isBond
          ? (durationChanged ? modifiedDuration : invalid ? null : modifiedDuration)
          : null,
        chg,
        ...(invalid ? {
          ytm: null,
          dv01: null,
          dirtyPrice: null,
          accruedInterestPer100: null,
          analyticsSource: durationChanged && modifiedDuration !== null ? 'manual' : null,
          analyticsAsOf: null,
          analyticsPrice: null
        } : {})
      };
    }));

    setEditingId(null);
    showToast('Position updated');
  };

  const updateBondAnalytics = (id, analytics) => {
    if (!storageReady || storageError) return;
    setHoldings(previous => previous.map(h =>
      h.id === id && h.type === 'bond' ? { ...h, ...analytics } : h
    ));
    showToast('Bond analytics updated');
  };

  const loadDemo = () => {
    if (!storageReady || storageError) return;
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
    if (!storageReady || storageError) return;
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
      doc.setTextColor(33, 75, 61);
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
    if (!storageReady || storageError) return;
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

            modifiedDuration:
              p.type === 'bond' &&
              p.modifiedDuration !== null &&
              p.modifiedDuration !== undefined &&
              p.modifiedDuration !== '' &&
              Number.isFinite(Number(p.modifiedDuration)) &&
              Number(p.modifiedDuration) >= 0
                ? Number(p.modifiedDuration)
                : null,

            bondCategory:
              p.type === 'bond' && ['government', 'corporate'].includes(p.bondCategory)
                ? p.bondCategory : null,

            bondTerms:
              p.type === 'bond' && p.bondTerms && typeof p.bondTerms === 'object' &&
              !Array.isArray(p.bondTerms)
                ? {
                    coupon: p.bondTerms.coupon,
                    maturity: p.bondTerms.maturity,
                    freq: p.bondTerms.freq,
                    dc: p.bondTerms.dc
                  } : null,

            settlementDate: p.type === 'bond' ? (p.settlementDate || null) : null,
            ytm: p.type === 'bond' && p.ytm !== null && p.ytm !== undefined &&
              Number.isFinite(Number(p.ytm)) ? Number(p.ytm) : null,
            dv01: p.type === 'bond' && p.dv01 !== null && p.dv01 !== undefined &&
              Number.isFinite(Number(p.dv01)) ? Number(p.dv01) : null,
            dirtyPrice: p.type === 'bond' && p.dirtyPrice !== null &&
              p.dirtyPrice !== undefined && Number(p.dirtyPrice) > 0 &&
              Number.isFinite(Number(p.dirtyPrice)) ? Number(p.dirtyPrice) : null,
            accruedInterestPer100: p.type === 'bond' && p.accruedInterestPer100 !== null &&
              p.accruedInterestPer100 !== undefined &&
              Number.isFinite(Number(p.accruedInterestPer100))
                ? Number(p.accruedInterestPer100) : null,
            analyticsSource: p.type === 'bond' ? (p.analyticsSource || null) : null,
            analyticsAsOf: p.type === 'bond' ? (p.analyticsAsOf || null) : null,
            analyticsPrice: p.type === 'bond' && p.analyticsPrice !== null &&
              p.analyticsPrice !== undefined && Number.isFinite(Number(p.analyticsPrice))
                ? Number(p.analyticsPrice) : null,

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

          {!storageReady && (
            <div role="status" style={{ padding: 16, marginBottom: 18, background: '#fff6df' }}>
              Loading your saved portfolio…
            </div>
          )}
          {storageError && (
            <div role="alert" style={{ padding: 16, marginBottom: 18, background: '#fff0ed', color: '#963e33' }}>
              {storageError}
            </div>
          )}

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

              {form.type === 'bond' && (
                <div className="field">
                  <label>Modified Duration (years)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.modifiedDuration}
                    placeholder="e.g. 7.50"
                    onChange={e => setForm(prev => ({
                      ...prev,
                      modifiedDuration: e.target.value
                    }))}
                    onKeyDown={e => e.key === 'Enter' && addPosition()}
                  />
                  <span className="field-note">
                    Optional · enter verified duration
                  </span>
                </div>
              )}

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

                      {h.type === 'bond' && isEditing && (
                        <div style={{ marginTop: 8 }}>
                          <label style={{ display: 'block', fontSize: 10, color: '#77736d', marginBottom: 4 }}>
                            Modified duration
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={h.modifiedDuration ?? ''}
                            data-field="modifiedDuration"
                            className="inline-i"
                            placeholder="e.g. 7.50"
                            style={{ width: 95 }}
                          />
                        </div>
                      )}

                      {h.type === 'bond' && !isEditing &&
                        h.modifiedDuration !== null &&
                        h.modifiedDuration !== undefined &&
                        h.modifiedDuration !== '' &&
                        Number.isFinite(Number(h.modifiedDuration)) && (
                          <div style={{ marginTop: 5, fontSize: 10, color: '#77736d' }}>
                            Dmod: {Number(h.modifiedDuration).toFixed(2)}y
                          </div>
                        )}
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

          {holdings.some(h => h.type === 'bond') && (
            <BondAnalyticsPanel
              holdings={holdings}
              onUpdateHolding={updateBondAnalytics}
            />
          )}

          <div className="page-footer">
            <span>
              Yield Calculator · Portfolio
            </span>
            <span>
              All data stored locally in your browser.
            </span>
          </div>
        </div>
      </main>

      {toast && (
        <div className="toast">
          <span className="toast-dot">●</span>
          {toast}
        </div>
      )}

      <style jsx>{`
        .hd {
          background: #1A1815;
          border-bottom: 1px solid #34312B;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .hd-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 48px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .hd-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .hd-mark {
          width: 34px;
          height: 34px;
          background: #C9A96E;
          display: flex;
          align-items: center;
          justify-content: center;
          font: 700 12px 'JetBrains Mono', monospace;
          color: #1A1815;
        }
        .hd-name {
          font: 500 16px Fraunces, Georgia, serif;
          color: #F7F5EF;
          letter-spacing: -.3px;
        }
        .hd-name i {
          font-weight: 400;
          color: #C9A96E;
        }
        .hd-nav {
          display: flex;
          align-items: center;
          gap: 28px;
          overflow-x: auto;
        }
        .hd-link {
          font: 500 11px Inter, sans-serif;
          color: #9B978F;
          letter-spacing: .1px;
          white-space: nowrap;
          transition: color .2s;
        }
        .hd-link:hover,
        .hd-link.active {
          color: #F7F5EF;
        }
        .hd-link.active {
          border-bottom: 1px solid #C9A96E;
          padding-bottom: 5px;
        }
        .page {
          min-height: 100vh;
          background: #F7F5EF;
          color: #1A1815;
          font-family: Inter, sans-serif;
        }
        .page-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 64px 48px 40px;
        }
        .page-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 28px;
          flex-wrap: wrap;
          margin-bottom: 36px;
        }
        .eyebrow {
          font: 600 10px Inter, sans-serif;
          color: #214B3D;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .page-h {
          margin: 0 0 12px;
          font: 500 clamp(36px, 5vw, 58px) Fraunces, Georgia, serif;
          letter-spacing: -1.5px;
        }
        .page-h em {
          color: #214B3D;
          font-weight: 400;
        }
        .page-lede {
          max-width: 570px;
          margin: 0;
          color: #817C74;
          font: 12px/1.8 Inter, sans-serif;
        }
        .head-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .btn-ghost {
          border: 1px solid #D8D3C8;
          background: #fff;
          color: #45423D;
          border-radius: 5px;
          padding: 10px 13px;
          font: 600 10px Inter, sans-serif;
          transition: .2s;
          white-space: nowrap;
        }
        .btn-ghost:hover {
          background: #EAE6DC;
          border-color: #C0B7A5;
        }
        .btn-ghost.refresh {
          color: #214B3D;
          border-color: #A9C3B2;
        }
        .btn-ghost.danger {
          color: #A33D2E;
          border-color: #E2C5BD;
        }
        .btn-ghost:disabled {
          opacity: .5;
          cursor: not-allowed;
        }
        .add-card {
          border: 1px solid #DED8CB;
          background: #fff;
          border-radius: 8px;
          margin-bottom: 26px;
          overflow: hidden;
        }
        .add-head {
          padding: 16px 22px;
          background: #F3F0E8;
          border-bottom: 1px solid #DED8CB;
          font: 600 10px Inter, sans-serif;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #214B3D;
        }
        .add-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 22px;
          align-items: flex-start;
        }
        .field {
          flex: 1 1 120px;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .field.f-tkr {
          flex: 1.5 1 170px;
        }
        .field label {
          font: 600 9px Inter, sans-serif;
          color: #817C74;
          letter-spacing: .5px;
          text-transform: uppercase;
        }
        .field input,
        .field select {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          height: 39px;
          padding: 0 11px;
          background: #FAF9F6;
          border: 1px solid #DED8CB;
          border-radius: 4px;
          outline: none;
          color: #1A1815;
          font: 12px 'JetBrains Mono', monospace;
          transition: border-color .2s;
        }
        .field input:focus,
        .field select:focus {
          border-color: #214B3D;
        }
        .field input:disabled {
          opacity: .6;
          cursor: not-allowed;
        }
        .field-note {
          font: 9px Inter, sans-serif;
          color: #9B978F;
        }
        .ticker-wrap {
          position: relative;
        }
        .ticker-wrap input {
          padding-right: 55px;
        }
        .lookup-tag {
          position: absolute;
          top: 50%;
          right: 7px;
          transform: translateY(-50%);
          font: 600 9px Inter, sans-serif;
          white-space: nowrap;
        }
        .lookup-tag.loading {
          color: #9B978F;
        }
        .lookup-tag.success {
          color: #214B3D;
        }
        .lookup-tag.error {
          color: #A33D2E;
        }
        .add-actions {
          padding: 13px 22px;
          background: #FAF9F6;
          border-top: 1px solid #EFECE5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .add-hint {
          margin: 0;
          max-width: 760px;
          font: 10px/1.7 Inter, sans-serif;
          color: #817C74;
        }
        .add-hint b {
          color: #45423D;
        }
        .btn-add,
        .btn-fill {
          background: #214B3D;
          border-radius: 4px;
          color: #fff;
          padding: 12px 20px;
          font: 600 11px Inter, sans-serif;
          white-space: nowrap;
          transition: background .2s;
        }
        .btn-add:hover,
        .btn-fill:hover {
          background: #16382D;
        }
        .kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin: 28px 0 22px;
        }
        .kpi {
          min-width: 0;
          padding: 20px 22px;
          border: 1px solid #DED8CB;
          background: #fff;
          border-radius: 6px;
        }
        .kpi.feat {
          background: #214B3D;
          border-color: #214B3D;
        }
        .kpi-l {
          margin-bottom: 14px;
          color: #817C74;
          font: 600 9px Inter, sans-serif;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .feat .kpi-l {
          color: #B3C9BC;
        }
        .kpi-v {
          font: 500 clamp(19px, 2vw, 27px) Fraunces, Georgia, serif;
          color: #1A1815;
          letter-spacing: -.4px;
          overflow-wrap: anywhere;
        }
        .feat .kpi-v {
          color: #fff;
          font-size: clamp(23px, 2.5vw, 33px);
        }
        .kpi-v.top {
          font: 600 24px 'JetBrains Mono', monospace;
        }
        .kpi-c {
          margin-top: 12px;
          font: 600 11px Inter, sans-serif;
        }
        .kpi-c.pos {
          color: #A9D8B6;
        }
        .kpi-c.neg {
          color: #F0AD9D;
        }
        .kpi-c-sub {
          margin-left: 5px;
          font-weight: 400;
          opacity: .75;
        }
        .kpi-s {
          margin-top: 10px;
          color: #817C74;
          font: 10px/1.5 Inter, sans-serif;
        }
        .pos {
          color: #1F7048 !important;
        }
        .neg {
          color: #A33D2E !important;
        }
        .data-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding: 12px 18px;
          border: 1px solid #D7E3D8;
          border-radius: 5px;
          margin-bottom: 20px;
          background: #EDF4ED;
        }
        .ds-line {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .ds-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          background: #2A8C50;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .ds-text {
          font: 10px Inter, sans-serif;
          color: #315A3D;
        }
        .ds-note {
          font: 9px Inter, sans-serif;
          color: #63816D;
        }
        .empty {
          border: 1px dashed #CFC7B7;
          background: #fff;
          border-radius: 8px;
          text-align: center;
          padding: 60px 20px;
          margin: 22px 0;
        }
        .empty-mark {
          color: #C9A96E;
          font: 50px Fraunces, Georgia, serif;
          line-height: 1;
        }
        .empty-h {
          font: 500 25px Fraunces, Georgia, serif;
          margin: 10px 0;
        }
        .empty-p {
          font: 12px/1.7 Inter, sans-serif;
          color: #817C74;
          max-width: 360px;
          margin: 0 auto 25px;
        }
        .table {
          overflow-x: auto;
          border: 1px solid #DED8CB;
          border-radius: 6px;
          background: #fff;
          margin-top: 20px;
        }
        .thead,
        .trow,
        .tfoot {
          display: grid;
          grid-template-columns:
            minmax(100px, 1.2fr)
            minmax(70px, .7fr)
            minmax(85px, 1fr)
            minmax(80px, .9fr)
            minmax(95px, 1fr)
            minmax(75px, .8fr)
            minmax(100px, 1.1fr)
            minmax(100px, 1.1fr)
            minmax(65px, .6fr)
            65px;
          align-items: center;
          gap: 10px;
          padding-left: 18px;
          padding-right: 18px;
          min-width: 1050px;
        }
        .thead {
          min-height: 43px;
          background: #F3F0E8;
          border-bottom: 1px solid #DED8CB;
          font: 600 9px Inter, sans-serif;
          letter-spacing: .5px;
          text-transform: uppercase;
          color: #817C74;
        }
        .trow {
          min-height: 58px;
          border-bottom: 1px solid #EFECE5;
          font: 11px Inter, sans-serif;
        }
        .trow:hover {
          background: #FAF9F6;
        }
        .trow.editing {
          background: #F2F7F2;
        }
        .td-tkr {
          min-width: 0;
          font: 600 11px 'JetBrains Mono', monospace;
          color: #1A1815;
          overflow-wrap: anywhere;
        }
        .pill {
          display: inline-block;
          padding: 5px 7px;
          border-radius: 3px;
          font: 600 9px Inter, sans-serif;
          white-space: nowrap;
        }
        .r {
          text-align: right;
        }
        .c {
          text-align: center;
        }
        .mono {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
        }
        .mv {
          font-weight: 600;
          color: #1A1815;
        }
        .auto-mark {
          display: block;
          margin-top: 4px;
          color: #9B978F;
          font: 600 7px Inter, sans-serif;
          letter-spacing: .5px;
        }
        .inline-i {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          max-width: 105px;
          background: #fff;
          border: 1px solid #B4C9B7;
          border-radius: 3px;
          padding: 7px 5px;
          text-align: right;
          color: #1A1815;
          font: 10px 'JetBrains Mono', monospace;
        }
        .row-actions {
          display: flex;
          justify-content: center;
          gap: 6px;
        }
        .ra {
          padding: 4px;
          font-size: 15px;
          color: #817C74;
        }
        .ra:hover {
          color: #214B3D;
        }
        .ra.del:hover {
          color: #A33D2E;
        }
        .tfoot {
          min-height: 58px;
          background: #F3F0E8;
          border-top: 1px solid #DED8CB;
          font: 600 11px Inter, sans-serif;
        }
        .page-footer {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          flex-wrap: wrap;
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #DED8CB;
          color: #9B978F;
          font: 10px Inter, sans-serif;
        }
        .toast {
          position: fixed;
          bottom: 26px;
          left: 50%;
          transform: translateX(-50%);
          background: #1A1815;
          color: white;
          padding: 13px 22px;
          border-radius: 5px;
          font: 600 11px Inter, sans-serif;
          box-shadow: 0 10px 30px rgba(0,0,0,.18);
          z-index: 999;
          display: flex;
          gap: 9px;
          align-items: center;
        }
        .toast-dot {
          color: #C9A96E;
          font-size: 9px;
        }

        @media (max-width: 1100px) {
          .hd-inner {
            padding: 0 24px;
          }
          .page-inner {
            padding: 45px 24px 30px;
          }
          .hd-nav {
            gap: 16px;
          }
          .kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 650px) {
          .hd-inner {
            padding: 0 14px;
            gap: 14px;
          }
          .hd-name {
            font-size: 13px;
          }
          .hd-nav {
            gap: 12px;
          }
          .hd-link {
            font-size: 10px;
          }
          .page-inner {
            padding: 30px 14px;
          }
          .page-head {
            align-items: flex-start;
          }
          .head-actions {
            width: 100%;
          }
          .btn-ghost {
            flex: 1 1 auto;
          }
          .add-row {
            padding: 14px;
          }
          .add-actions {
            padding: 14px;
          }
          .btn-add {
            width: 100%;
          }
          .kpis {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .kpi {
            padding: 15px;
          }
          .kpi-v {
            font-size: 19px;
          }
          .feat .kpi-v {
            font-size: 22px;
          }
          .page-footer {
            margin-top: 32px;
          }
        }
        @media (max-width: 400px) {
          .kpis {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
