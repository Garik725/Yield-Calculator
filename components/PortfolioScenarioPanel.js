
// components/PortfolioScenarioPanel.js
//
// Offline Portfolio Scenario Lab.
// Uses the existing scenarioMath.js calculation engine.
// Does not fetch market data, modify holdings, or write to localStorage.

import { useMemo, useState } from 'react';

import {
  analyzePortfolioScenario,
  DEFAULT_SCENARIO
} from '../lib/portfolio/scenarioMath';

const INPUTS = [
  {
    key: 'equityShockPct',
    label: 'Stock price shock',
    unit: '%',
    description: 'Applied to individual stocks.'
  },
  {
    key: 'etfShockPct',
    label: 'ETF price shock',
    unit: '%',
    description: 'Applied directly to ETF prices, including bond ETFs.'
  },
  {
    key: 'fxShockPct',
    label: 'FX value shock',
    unit: '%',
    description: 'Applied to positions classified as FX.'
  },
  {
    key: 'rateShockBps',
    label: 'Interest-rate shock',
    unit: 'bps',
    description: 'Added to the yield shock for modeled individual bonds.'
  },
  {
    key: 'creditSpreadShockBps',
    label: 'Credit-spread shock',
    unit: 'bps',
    description: 'Added to the yield shock for modeled individual bonds.'
  }
];

const PRESETS = [
  {
    label: 'Market selloff',
    scenario: {
      equityShockPct: -10,
      etfShockPct: -5,
      fxShockPct: -2,
      rateShockBps: 50,
      creditSpreadShockBps: 100
    }
  },
  {
    label: 'Rates rise',
    scenario: {
      equityShockPct: -3,
      etfShockPct: -2,
      fxShockPct: 0,
      rateShockBps: 100,
      creditSpreadShockBps: 0
    }
  },
  {
    label: 'Market rally',
    scenario: {
      equityShockPct: 8,
      etfShockPct: 4,
      fxShockPct: 2,
      rateShockBps: -50,
      creditSpreadShockBps: -25
    }
  }
];

const formatNumber = (value, digits = 2) => {
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

const formatMoney = value => {
  if (!Number.isFinite(value)) return '—';

  const sign = value < 0 ? '−' : '';

  return `${sign}$${formatNumber(Math.abs(value))}`;
};

const formatSignedMoney = value => {
  if (!Number.isFinite(value)) return '—';

  const sign = value > 0 ? '+' : '';

  return `${sign}${formatMoney(value)}`;
};

const formatPercent = (value, digits = 2) => {
  return Number.isFinite(value)
    ? `${formatNumber(value, digits)}%`
    : '—';
};

const formatSignedPercent = value => {
  if (!Number.isFinite(value)) return '—';

  return `${value > 0 ? '+' : ''}${formatPercent(value)}`;
};

function SummaryCard({ label, value, detail, tone = '' }) {
  return (
    <div className={`summary-card ${tone}`}>
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
      <div className="summary-detail">{detail}</div>

      <style jsx>{`
        .summary-card {
          background: #fff;
          border: 1px solid #e4e0d7;
          border-radius: 9px;
          padding: 18px;
          min-width: 0;
        }

        .summary-label {
          color: #77736d;
          font: 700 10px Inter, sans-serif;
          text-transform: uppercase;
          letter-spacing: .7px;
          margin-bottom: 12px;
        }

        .summary-value {
          font: 500 clamp(19px, 2.5vw, 25px)
            "JetBrains Mono", monospace;
          overflow-wrap: anywhere;
          color: #292b26;
        }

        .summary-card.negative .summary-value {
          color: #a33d2e;
        }

        .summary-card.positive .summary-value {
          color: #214b3d;
        }

        .summary-detail {
          font: 11px/1.6 Inter, sans-serif;
          color: #817c74;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
}

export default function PortfolioScenarioPanel({
  holdings = []
}) {
  const [scenario, setScenario] = useState({
    ...DEFAULT_SCENARIO
  });

  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [calculatedAt, setCalculatedAt] = useState(null);

  const [showExcluded, setShowExcluded] = useState(true);

  // The calculation is intentionally performed only when
  // the user clicks Run Scenario.

  const inputSignature = useMemo(
    () => JSON.stringify({ holdings, scenario }),
    [holdings, scenario]
  );

  const [calculatedSignature, setCalculatedSignature] =
    useState(null);

  const isCurrent =
    result !== null &&
    calculatedSignature === inputSignature;

  const displayed = isCurrent ? result : null;

  const updateInput = (key, value) => {
    setScenario(previous => ({
      ...previous,
      [key]: value
    }));

    setError('');
  };

  const applyPreset = preset => {
    setScenario({ ...preset });
    setError('');
  };

  const resetInputs = () => {
    setScenario({ ...DEFAULT_SCENARIO });
    setError('');
  };

  const runScenario = () => {
    setError('');

    if (!holdings.length) {
      setError('Add at least one holding before running a scenario.');
      return;
    }

    const parsedScenario = {};

    for (const field of INPUTS) {
      const raw = scenario[field.key];

      if (
        raw === '' ||
        raw === null ||
        raw === undefined
      ) {
        setError(`Enter a value for ${field.label}.`);
        return;
      }

      const parsed = Number(raw);

      if (!Number.isFinite(parsed)) {
        setError(`${field.label} must be a valid number.`);
        return;
      }

      // A direct price shock below -100% implies
      // a negative instrument value.

      if (
        [
          'equityShockPct',
          'etfShockPct',
          'fxShockPct'
        ].includes(field.key) &&
        parsed < -100
      ) {
        setError(
          `${field.label} cannot be below -100%.`
        );
        return;
      }

      parsedScenario[field.key] = parsed;
    }

    try {
      const calculation = analyzePortfolioScenario(
        holdings,
        parsedScenario
      );

      setResult(calculation);
      setCalculatedSignature(inputSignature);
      setCalculatedAt(new Date());
    } catch (err) {
      setResult(null);
      setCalculatedSignature(null);

      setError(
        err.message || 'Scenario calculation failed.'
      );
    }
  };

  const summary = displayed?.summary;

  const tone =
    summary?.pnl > 0
      ? 'positive'
      : summary?.pnl < 0
        ? 'negative'
        : '';

  return (
    <section className="scenario-panel">
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            Portfolio analytics · Offline
          </div>

          <h2>
            The <em>Scenario Lab.</em>
          </h2>

          <p className="intro">
            Apply hypothetical market shocks to your
            current holdings and inspect the estimated
            change in value. No market-data subscription
            required.
          </p>
        </div>

        <span className="offline-badge">
          ● No API required
        </span>
      </div>

      <div className="scenario-controls">
        <div className="controls-header">
          <h3>Market assumptions</h3>

          <p>
            Negative price shocks represent declines.
            Positive basis-point shocks represent
            higher yields or wider spreads.
          </p>
        </div>

        <div className="presets">
          <span>Quick scenarios</span>

          {PRESETS.map(preset => (
            <button
              key={preset.label}
              type="button"
              className="preset"
              onClick={() => applyPreset(preset.scenario)}
            >
              {preset.label}
            </button>
          ))}

          <button
            type="button"
            className="preset reset"
            onClick={resetInputs}
          >
            Reset
          </button>
        </div>

        <div className="inputs">
          {INPUTS.map(field => (
            <label className="input-card" key={field.key}>
              <span className="input-label">
                {field.label}
              </span>

              <span className="input-wrap">
                <input
                  type="number"
                  step="any"
                  value={scenario[field.key]}
                  onChange={event =>
                    updateInput(
                      field.key,
                      event.target.value
                    )
                  }
                />

                <span className="unit">
                  {field.unit}
                </span>
              </span>

              <span className="input-description">
                {field.description}
              </span>
            </label>
          ))}
        </div>

        <div className="run-row">
          <p>
            Results use the holdings currently shown in
            The Book.
          </p>

          <button
            type="button"
            className="run-button"
            onClick={runScenario}
            disabled={!holdings.length}
          >
            ↗ Run Scenario
          </button>
        </div>
      </div>

      {error && (
        <div className="error" role="alert">
          <strong>Calculation error</strong>
          <div>{error}</div>
        </div>
      )}

      {result && !isCurrent && (
        <div className="notice">
          Your holdings or assumptions have changed.
          Click <strong>Run Scenario</strong> to update
          the results.
        </div>
      )}

      {!result && !error && (
        <div className="empty-results">
          Enter your assumptions, then click
          <strong> Run Scenario </strong>
          to calculate an illustrative portfolio impact.
        </div>
      )}

      {displayed && (
        <>
          <div className="results-heading">
            <div>
              <h3>Scenario results</h3>

              <p>
                {summary.modeledCount} of{' '}
                {summary.positionCount} positions modeled
              </p>
            </div>

            {calculatedAt && (
              <span>
                Calculated at{' '}
                {calculatedAt.toLocaleTimeString(
                  'en-US',
                  {
                    hour: 'numeric',
                    minute: '2-digit'
                  }
                )}
              </span>
            )}
          </div>

          <div className="summary-grid">
            <SummaryCard
              label="Analyzed value"
              value={formatMoney(summary.analyzedValue)}
              detail="Current value of modeled positions"
            />

            <SummaryCard
              label="Estimated P&L"
              value={formatSignedMoney(summary.pnl)}
              detail="Modeled positions only"
              tone={tone}
            />

            <SummaryCard
              label="Estimated return"
              value={formatSignedPercent(
                summary.returnPct
              )}
              detail="Return on analyzed value"
              tone={tone}
            />

            <SummaryCard
              label="Portfolio coverage"
              value={formatPercent(
                summary.coverage * 100,
                1
              )}
              detail="Share of portfolio value modeled"
            />
          </div>

          <div className="before-after">
            <div>
              <span>Before scenario</span>
              <strong>
                {formatMoney(summary.analyzedValue)}
              </strong>
            </div>

            <div className="arrow">→</div>

            <div>
              <span>After scenario</span>
              <strong>
                {formatMoney(
                  summary.projectedAnalyzedValue
                )}
              </strong>
            </div>
          </div>

          {!summary.allModeled && (
            <div className="notice">
              <strong>Partial portfolio coverage.</strong>{' '}
              {summary.excludedCount} position(s) could
              not be modeled. The P&L and before/after
              amounts apply only to the analyzed positions,
              not your entire portfolio.
            </div>
          )}

          <div className="position-heading">
            <div>
              <h3>Position-level impact</h3>

              <p>
                Estimated change in value for each
                modeled holding.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Instrument</th>
                  <th>Type</th>
                  <th>Current value</th>
                  <th>Scenario P&L</th>
                  <th>After scenario</th>
                  <th>Return</th>
                </tr>
              </thead>

              <tbody>
                {displayed.positions
                  .filter(position => position.modeled)
                  .map((position, index) => (
                    <tr
                      key={`${position.id || position.ticker}-${index}`}
                    >
                      <td className="ticker">
                        {position.ticker}
                      </td>

                      <td>{position.type}</td>

                      <td>
                        {formatMoney(
                          position.currentValue
                        )}
                      </td>

                      <td
                        className={
                          position.pnl >= 0
                            ? 'positive'
                            : 'negative'
                        }
                      >
                        {formatSignedMoney(position.pnl)}
                      </td>

                      <td>
                        {formatMoney(
                          position.projectedValue
                        )}
                      </td>

                      <td
                        className={
                          position.returnPct >= 0
                            ? 'positive'
                            : 'negative'
                        }
                      >
                        {formatSignedPercent(
                          position.returnPct
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {summary.excludedCount > 0 && (
            <div className="excluded-section">
              <button
                type="button"
                className="excluded-toggle"
                onClick={() =>
                  setShowExcluded(previous => !previous)
                }
              >
                {showExcluded ? '▾' : '▸'}{' '}
                Excluded positions ({summary.excludedCount})
              </button>

              {showExcluded && (
                <div className="excluded-list">
                  {displayed.excluded.map((position, index) => (
                    <div
                      className="excluded-row"
                      key={`${position.id || position.ticker}-${index}`}
                    >
                      <strong>{position.ticker}</strong>

                      <span>{position.warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="methodology">
            <strong>Methodology and limitations.</strong>{' '}
            Stock, ETF, and FX shocks are direct percentage
            changes. For individual bonds, the engine uses
            modified duration and optional supplied
            convexity. Interest-rate and credit-spread
            shocks are added together for each modeled
            individual bond; they are not yet calibrated
            to its issuer or maturity. Bonds without
            duration or complete contractual inputs are
            excluded. This is a static hypothetical
            scenario, not a forecast of actual returns.
          </div>
        </>
      )}

      <style jsx>{`
        .scenario-panel {
          margin: 38px 0 24px;
          padding: clamp(20px, 3vw, 32px);
          border: 1px solid #ded8cb;
          border-radius: 12px;
          background: #faf9f6;
          color: #262923;
        }

        .section-heading,
        .run-row,
        .results-heading,
        .position-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 18px;
        }

        .section-heading {
          padding-bottom: 24px;
          border-bottom: 1px solid #ded8cb;
        }

        .eyebrow {
          font: 700 10px Inter, sans-serif;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #214b3d;
          margin-bottom: 12px;
        }

        h2 {
          font: 500 clamp(28px, 4vw, 40px)
            Fraunces, Georgia, serif;
          margin: 0;
        }

        h2 em {
          color: #214b3d;
          font-weight: 400;
        }

        h3 {
          font: 500 21px Fraunces, Georgia, serif;
          margin: 0 0 8px;
        }

        .intro,
        .controls-header p,
        .run-row p,
        .results-heading p,
        .position-heading p {
          font: 12px/1.7 Inter, sans-serif;
          color: #817c74;
          margin: 0;
        }

        .intro {
          margin-top: 12px;
          max-width: 600px;
        }

        .offline-badge {
          font: 600 11px Inter, sans-serif;
          background: #e5ece7;
          color: #214b3d;
          border-radius: 24px;
          padding: 9px 13px;
          white-space: nowrap;
        }

        .scenario-controls {
          margin-top: 28px;
        }

        .presets {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 9px;
          margin: 21px 0;
        }

        .presets > span {
          font: 600 11px Inter, sans-serif;
          color: #817c74;
          margin-right: 5px;
        }

        .preset {
          padding: 9px 12px;
          border: 1px solid #d8d3c8;
          border-radius: 6px;
          background: #fff;
          color: #214b3d;
          font: 600 11px Inter, sans-serif;
          cursor: pointer;
        }

        .preset:hover {
          background: #e5ece7;
        }

        .preset.reset {
          color: #77736d;
        }

        .inputs {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 12px;
        }

        .input-card {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
          border: 1px solid #e4e0d7;
          border-radius: 8px;
          background: #fff;
        }

        .input-label {
          font: 600 11px Inter, sans-serif;
          color: #55534e;
        }

        .input-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        input {
          min-width: 0;
          width: 100%;
          border: 0;
          border-bottom: 1px solid #d8d3c8;
          outline: none;
          padding: 8px 0;
          font: 500 23px "JetBrains Mono", monospace;
          background: transparent;
          color: #262923;
        }

        input:focus {
          border-bottom-color: #214b3d;
        }

        .unit {
          font: 600 12px Inter, sans-serif;
          color: #77736d;
        }

        .input-description {
          font: 10px/1.5 Inter, sans-serif;
          color: #817c74;
        }

        .run-row {
          margin-top: 22px;
        }

        .run-button {
          background: #214b3d;
          color: #fff;
          border: 0;
          border-radius: 7px;
          padding: 14px 21px;
          font: 600 12px Inter, sans-serif;
          cursor: pointer;
        }

        .run-button:hover:not(:disabled) {
          background: #16382d;
        }

        .run-button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .error,
        .notice,
        .empty-results {
          margin-top: 19px;
          padding: 15px;
          border-radius: 7px;
          font: 12px/1.7 Inter, sans-serif;
        }

        .error {
          color: #963e33;
          background: #fff0ed;
          border: 1px solid #efc2b9;
        }

        .notice {
          color: #715627;
          background: #fff6df;
          border: 1px solid #e7d6a3;
        }

        .empty-results {
          color: #817c74;
          background: #f0eee8;
          text-align: center;
          padding: 32px 15px;
        }

        .results-heading {
          margin: 32px 0 16px;
        }

        .results-heading > span {
          font: 11px Inter, sans-serif;
          color: #817c74;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          gap: 12px;
        }

        .before-after {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 14px;
          align-items: center;
          margin-top: 16px;
          padding: 20px;
          background: #e5ece7;
          border-radius: 9px;
        }

        .before-after > div:not(.arrow) {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        .before-after span {
          font: 600 10px Inter, sans-serif;
          text-transform: uppercase;
          color: #52705e;
        }

        .before-after strong {
          font: 500 clamp(17px, 2.5vw, 25px)
            "JetBrains Mono", monospace;
          overflow-wrap: anywhere;
          color: #214b3d;
        }

        .arrow {
          color: #52705e;
          font-size: 23px;
        }

        .position-heading {
          margin: 32px 0 15px;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 670px;
          border-collapse: collapse;
          font: 12px Inter, sans-serif;
        }

        th,
        td {
          padding: 13px 10px;
          border-bottom: 1px solid #e9e5dc;
          text-align: right;
        }

        th {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .5px;
          font-weight: 600;
          color: #817c74;
        }

        td {
          font-family: "JetBrains Mono", monospace;
        }

        th:first-child,
        td:first-child,
        th:nth-child(2),
        td:nth-child(2) {
          text-align: left;
        }

        .ticker,
        .positive {
          color: #214b3d;
        }

        .negative {
          color: #a33d2e;
        }

        .excluded-section {
          margin-top: 25px;
        }

        .excluded-toggle {
          font: 600 12px Inter, sans-serif;
          color: #715627;
          padding: 10px 0;
          cursor: pointer;
        }

        .excluded-list {
          border-top: 1px solid #e4e0d7;
        }

        .excluded-row {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          padding: 12px 0;
          border-bottom: 1px solid #e4e0d7;
          font: 11px/1.6 Inter, sans-serif;
        }

        .excluded-row strong {
          color: #262923;
        }

        .excluded-row span {
          color: #817c74;
          text-align: right;
        }

        .methodology {
          margin-top: 26px;
          padding-top: 18px;
          border-top: 1px solid #ded8cb;
          font: 11px/1.8 Inter, sans-serif;
          color: #817c74;
        }

        @media (max-width: 850px) {
          .summary-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }

          .inputs {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }
        }

        @media (max-width: 530px) {
          .inputs,
          .summary-grid {
            grid-template-columns: 1fr;
          }

          .before-after {
            grid-template-columns: 1fr;
          }

          .arrow {
            transform: rotate(90deg);
            text-align: center;
          }

          .run-button {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
