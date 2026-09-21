
// components/PortfolioRiskPanel.js
//
// Portfolio Risk dashboard for Yield Calculator.
//
// Uses the existing /api/risk endpoint in portfolio mode.
// Does not modify holdings or localStorage.
//
// Scope:
// - USD-denominated stocks and ETFs
// - At least 2 distinct eligible instruments
// - Maximum 20 distinct instruments
// - One-year historical lookback
//
// Individual bonds, FX/cash and unsupported currencies are excluded.
// All monetary risk values refer ONLY to the eligible subportfolio.

import { useMemo, useState } from 'react';

import {
  calcMarketValue as calcMV
} from '../lib/portfolio/valuation';

const MAX_TICKERS = 20;

const fmt = (value, digits = 2) => {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return '—';
  }

  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
};

const fmtPct = (value, digits = 2) => {
  return Number.isFinite(value)
    ? `${fmt(value * 100, digits)}%`
    : '—';
};

const fmtUSD = value => {
  return Number.isFinite(value)
    ? '$' + fmt(value, 2)
    : '—';
};

const utcDate = date => {
  return date.toISOString().slice(0, 10);
};

const isEligibleHolding = holding => {
  if (!holding) return false;

  if (
    holding.type !== 'stock' &&
    holding.type !== 'etf'
  ) {
    return false;
  }

  const ticker = String(
    holding.tkr || holding.symbol || ''
  ).trim().toUpperCase();

  if (!ticker) return false;

  // The current portfolio has no reliable per-position
  // currency-conversion metadata. To avoid combining
  // different currencies as though they were USD,
  // restrict this version to unqualified US tickers
  // and explicitly .US tickers.
  //
  // Non-US instruments can be added once the valuation
  // engine supplies verified base-currency values.

  if (
    ticker.includes('.') &&
    !ticker.endsWith('.US')
  ) {
    return false;
  }

  if (!/^[A-Z0-9.\-]{1,20}$/.test(ticker)) {
    return false;
  }

  const marketValue = calcMV(holding);

  return (
    Number.isFinite(marketValue) &&
    marketValue > 0
  );
};

const buildBasket = holdings => {
  const positions = Array.isArray(holdings)
    ? holdings
    : [];

  let totalValue = 0;
  let eligibleValue = 0;

  const excluded = [];
  const valuesByTicker = {};

  for (const holding of positions) {
    const rawValue = calcMV(holding);

    const value =
      Number.isFinite(rawValue) && rawValue > 0
        ? rawValue
        : 0;

    totalValue += value;

    const ticker = String(
      holding?.tkr || holding?.symbol || ''
    ).trim().toUpperCase();

    if (!isEligibleHolding(holding)) {
      excluded.push({
        ticker: ticker || 'Unknown',
        type: holding?.type || 'unknown',
        value
      });

      continue;
    }

    eligibleValue += value;

    // Combine multiple positions of the same security.
    // The risk API expects one price series per ticker.

    valuesByTicker[ticker] =
      (valuesByTicker[ticker] || 0) + value;
  }

  const tickers = Object.keys(valuesByTicker).sort();

  const weights = {};

  if (eligibleValue > 0) {
    for (const ticker of tickers) {
      weights[ticker] =
        valuesByTicker[ticker] / eligibleValue;
    }
  }

  const coverage =
    totalValue > 0
      ? eligibleValue / totalValue
      : 0;

  const key = JSON.stringify({
    tickers,
    values: tickers.map(
      ticker => valuesByTicker[ticker]
    ),
    totalValue
  });

  return {
    tickers,
    weights,
    totalValue,
    eligibleValue,
    coverage,
    excluded,
    key
  };
};

function Metric({
  label,
  value,
  detail
}) {
  return (
    <div className="metric">
      <div className="metric-label">
        {label}
      </div>

      <div className="metric-value">
        {value}
      </div>

      {detail && (
        <div className="metric-detail">
          {detail}
        </div>
      )}

      <style jsx>{`
        .metric {
          min-width: 0;
          padding: 18px;
          border: 1px solid #e6e1d7;
          background: #fff;
          border-radius: 9px;
        }

        .metric-label {
          font-family: Inter, sans-serif;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #77736d;
          margin-bottom: 12px;
        }

        .metric-value {
          font-family: "JetBrains Mono", monospace;
          font-size: clamp(19px, 2vw, 25px);
          font-weight: 500;
          color: #214b3d;
          overflow-wrap: anywhere;
        }

        .metric-detail {
          font-family: Inter, sans-serif;
          font-size: 11px;
          line-height: 1.5;
          color: #817c74;
          margin-top: 7px;
        }
      `}</style>
    </div>
  );
}

export default function PortfolioRiskPanel({
  holdings = []
}) {
  const [loading, setLoading] = useState(false);

  const [report, setReport] = useState(null);

  const [error, setError] = useState('');

  const [warnings, setWarnings] = useState(null);

  const [computedKey, setComputedKey] = useState(null);

  const [computedAt, setComputedAt] = useState(null);

  const basket = useMemo(
    () => buildBasket(holdings),
    [holdings]
  );

  const enoughTickers =
    basket.tickers.length >= 2;

  const withinLimit =
    basket.tickers.length <= MAX_TICKERS;

  const canCompute =
    enoughTickers &&
    withinLimit &&
    basket.eligibleValue > 0 &&
    !loading;

  // A previously calculated report must not be presented
  // as current after holdings or market values change.

  const isCurrent =
    report !== null &&
    computedKey === basket.key;

  const portfolio =
    isCurrent
      ? report.portfolio
      : null;

  const computeRisk = async () => {
    if (!canCompute) return;

    setLoading(true);
    setError('');
    setWarnings(null);
    setReport(null);
    setComputedKey(null);

    const requestBasket = basket;

    try {
      const now = new Date();

      const start = new Date(now);
      start.setUTCFullYear(
        start.getUTCFullYear() - 1
      );

      const response = await fetch('/api/risk', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          mode: 'portfolio',

          tickers: requestBasket.tickers,

          weights: requestBasket.weights,

          portfolioValue:
            requestBasket.eligibleValue,

          annualRiskFreeRate: 0,

          from: utcDate(start),

          to: utcDate(now)
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        const details = Object.entries(
          data.errors || {}
        )
          .map(
            ([ticker, message]) =>
              `${ticker}: ${message}`
          )
          .join('; ');

        throw new Error(
          [data.error, details]
            .filter(Boolean)
            .join(' — ') ||
          `Risk API returned HTTP ${response.status}`
        );
      }

      if (!data.report?.portfolio) {
        throw new Error(
          'Portfolio risk results were not returned by the API'
        );
      }

      setReport(data.report);

      setWarnings(data.warnings || null);

      setComputedKey(requestBasket.key);

      setComputedAt(new Date());
    } catch (err) {
      setError(
        err.message ||
        'Could not calculate portfolio risk'
      );
    } finally {
      setLoading(false);
    }
  };

  const riskRows =
    portfolio?.riskContribution?.rows || [];

  const dollarRisk =
    portfolio?.dollarRisk || null;

  return (
    <section className="risk-panel">
      <div className="risk-heading">
        <div>
          <div className="eyebrow">
            Portfolio analytics
          </div>

          <h2>
            The <em>Risk Profile.</em>
          </h2>

          <p className="intro">
            Historical risk of your eligible stock and
            ETF positions, weighted by their current
            market values.
          </p>
        </div>

        <button
          className="compute-btn"
          onClick={computeRisk}
          disabled={!canCompute}
        >
          {loading
            ? 'Computing…'
            : '↗ Compute Portfolio Risk'}
        </button>
      </div>

      <div className="coverage-grid">
        <div className="coverage-item">
          <span>Eligible positions</span>

          <strong>
            {basket.tickers.length}
          </strong>
        </div>

        <div className="coverage-item">
          <span>Analyzed value</span>

          <strong>
            {fmtUSD(basket.eligibleValue)}
          </strong>
        </div>

        <div className="coverage-item">
          <span>Portfolio coverage</span>

          <strong>
            {fmtPct(basket.coverage, 1)}
          </strong>
        </div>
      </div>

      <p className="scope-note">
        Coverage is based on current market value.
        Only supported USD-denominated stocks and
        ETFs are included. Individual bonds,
        FX/cash and unsupported instruments are
        excluded.
      </p>

      {basket.excluded.length > 0 && (
        <div className="notice">
          <strong>
            Excluded from historical risk:
          </strong>{' '}

          {basket.excluded.map(
            holding => holding.ticker
          ).join(', ')}.
          {' '}The figures below do not represent
          your entire portfolio.
        </div>
      )}

      {!enoughTickers && (
        <div className="notice">
          Add at least two distinct eligible
          stocks or ETFs to calculate portfolio risk.
        </div>
      )}

      {!withinLimit && (
        <div className="notice">
          This version supports up to
          {' '}{MAX_TICKERS} distinct instruments.
          Reduce the basket before computing.
        </div>
      )}

      {error && (
        <div
          className="error"
          role="alert"
        >
          <strong>
            Risk calculation failed.
          </strong>

          <div>{error}</div>
        </div>
      )}

      {warnings && Object.keys(warnings).length > 0 && (
        <div className="notice">
          <strong>Data warnings</strong>

          {Object.entries(warnings).map(
            ([ticker, message]) => (
              <div key={ticker}>
                {ticker}: {message}
              </div>
            )
          )}
        </div>
      )}

      {report && !isCurrent && (
        <div className="notice">
          Holdings or market values have changed.
          Recompute risk to update the results.
        </div>
      )}

      {portfolio && (
        <>
          <div className="results-head">
            <div>
              <h3>Historical risk metrics</h3>

              <span>
                {report.returnDates.length} daily
                return observations
              </span>
            </div>

            {computedAt && (
              <span>
                Calculated at{' '}
                {computedAt.toLocaleTimeString(
                  'en-US',
                  {
                    hour: 'numeric',
                    minute: '2-digit'
                  }
                )}
              </span>
            )}
          </div>

          <div className="metrics">
            <Metric
              label="Annualized volatility"
              value={fmtPct(
                portfolio.annualizedVolatility
              )}
              detail="Historical · 252 trading days"
            />

            <Metric
              label="Sharpe ratio"
              value={fmt(
                portfolio.sharpeRatio
              )}
              detail="Assumes 0% risk-free rate"
            />

            <Metric
              label="Maximum drawdown"
              value={fmtPct(
                portfolio.maxDrawdown
              )}
              detail="Historical fixed-weight approximation"
            />

            <Metric
              label="1-day VaR · 95%"
              value={fmtUSD(
                dollarRisk?.var95
              )}
              detail={
                'Approximate loss · ' +
                fmtPct(portfolio.var95)
              }
            />

            <Metric
              label="Expected shortfall · 95%"
              value={fmtUSD(
                dollarRisk?.expectedShortfall95
              )}
              detail={
                'Approximate tail loss · ' +
                fmtPct(
                  portfolio.expectedShortfall95
                )
              }
            />

            <Metric
              label="Diversification benefit"
              value={fmtPct(
                portfolio.diversificationBenefit
              )}
              detail="Relative to weighted standalone volatility"
            />
          </div>

          <div className="risk-table-section">
            <h3>Risk contribution</h3>

            <p>
              How each instrument contributes to the
              eligible subportfolio's annualized
              volatility.
            </p>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Instrument</th>

                    <th>Weight</th>

                    <th>Risk contribution</th>

                    <th>Share of risk</th>
                  </tr>
                </thead>

                <tbody>
                  {riskRows.map(row => (
                    <tr key={row.ticker}>
                      <td className="ticker">
                        {row.ticker}
                      </td>

                      <td>
                        {fmtPct(row.weight, 1)}
                      </td>

                      <td>
                        {fmtPct(
                          row.riskContribution
                        )}
                      </td>

                      <td>
                        {fmtPct(
                          row.percentContribution,
                          1
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="method-note">
            Calculations use historical adjusted closing
            prices and a fixed-weight log-return
            approximation. VaR and Expected Shortfall
            are one-day historical log-return loss
            approximations, not guaranteed maximum
            losses. Current holdings and prices are
            not a record of actual historical account
            performance. Historical results do not
            predict future performance.
          </div>
        </>
      )}

      <style jsx>{`
        .risk-panel {
          margin-top: 40px;
          margin-bottom: 24px;
          padding: clamp(20px, 3vw, 32px);
          border: 1px solid #ded8cb;
          border-radius: 12px;
          background: #faf9f6;
          color: #262923;
        }

        .risk-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          flex-wrap: wrap;
          padding-bottom: 24px;
          border-bottom: 1px solid #ded8cb;
        }

        .eyebrow {
          font-family: Inter, sans-serif;
          color: #214b3d;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 12px;
        }

        h2 {
          margin: 0;
          font-family: Fraunces, Georgia, serif;
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 500;
          line-height: 1.2;
        }

        h2 em {
          color: #214b3d;
          font-weight: 400;
        }

        h3 {
          margin: 0 0 8px;
          font-family: Fraunces, Georgia, serif;
          font-size: 21px;
          font-weight: 500;
        }

        .intro {
          margin: 12px 0 0;
          max-width: 560px;
          font-family: Inter, sans-serif;
          color: #74716a;
          font-size: 13px;
          line-height: 1.7;
        }

        .compute-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 12px 18px;
          border: none;
          border-radius: 7px;
          background: #214b3d;
          color: #fff;
          font-family: Inter, sans-serif;
          font-weight: 600;
          font-size: 12px;
          white-space: nowrap;
          cursor: pointer;
        }

        .compute-btn:hover:not(:disabled) {
          background: #16382d;
        }

        .compute-btn:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .coverage-grid {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 12px;
          margin-top: 24px;
        }

        .coverage-item {
          display: flex;
          flex-direction: column;
          gap: 9px;
          padding: 15px;
          background: #f0eee8;
          border-radius: 7px;
          min-width: 0;
        }

        .coverage-item span {
          font-family: Inter, sans-serif;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #77736d;
        }

        .coverage-item strong {
          font-family: "JetBrains Mono", monospace;
          font-size: clamp(14px, 2vw, 18px);
          font-weight: 600;
          overflow-wrap: anywhere;
        }

        .scope-note {
          margin: 12px 0 0;
          font-family: Inter, sans-serif;
          font-size: 11px;
          line-height: 1.7;
          color: #817c74;
        }

        .notice,
        .error {
          margin-top: 16px;
          padding: 13px 15px;
          font-family: Inter, sans-serif;
          font-size: 12px;
          line-height: 1.7;
          border-radius: 7px;
          overflow-wrap: anywhere;
        }

        .notice {
          color: #715627;
          background: #fff6df;
          border: 1px solid #e7d6a3;
        }

        .error {
          color: #963e33;
          background: #fff0ed;
          border: 1px solid #efc2b9;
        }

        .results-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 32px;
          margin-bottom: 16px;
        }

        .results-head span {
          font-family: Inter, sans-serif;
          font-size: 11px;
          color: #817c74;
        }

        .metrics {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 12px;
        }

        .risk-table-section {
          margin-top: 30px;
        }

        .risk-table-section p {
          font-family: Inter, sans-serif;
          font-size: 12px;
          line-height: 1.6;
          color: #817c74;
          margin: 0 0 14px;
        }

        .table-scroll {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 560px;
          font-family: Inter, sans-serif;
          font-size: 12px;
        }

        th {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          font-weight: 600;
          color: #817c74;
          padding: 12px 10px;
          border-bottom: 1px solid #ded8cb;
          text-align: right;
        }

        td {
          padding: 13px 10px;
          border-bottom: 1px solid #e9e5dc;
          text-align: right;
          font-family: "JetBrains Mono", monospace;
        }

        th:first-child,
        td:first-child {
          text-align: left;
        }

        .ticker {
          color: #214b3d;
          font-weight: 600;
        }

        .method-note {
          margin-top: 24px;
          padding-top: 17px;
          border-top: 1px solid #ded8cb;
          font-family: Inter, sans-serif;
          font-size: 11px;
          color: #817c74;
          line-height: 1.8;
        }

        @media (max-width: 780px) {
          .metrics {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }
        }

        @media (max-width: 520px) {
          .risk-heading {
            align-items: stretch;
          }

          .compute-btn {
            width: 100%;
          }

          .coverage-grid,
          .metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
