
import { useState } from 'react';

import {
  fullCalc,
  validateInputs,
  SUPPORTED_FREQUENCIES,
  SUPPORTED_DAY_COUNTS
} from '../lib/bondMath';

const todayUTC = () => new Date().toISOString().slice(0, 10);

const money = value =>
  Number.isFinite(value)
    ? '$' + value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : '—';

const number = (value, dp = 4) =>
  Number.isFinite(value)
    ? value.toLocaleString('en-US', {
        minimumFractionDigits: dp,
        maximumFractionDigits: dp
      })
    : '—';


const emptyForm = () => ({
  bondCategory: '',
  coupon: '',
  maturity: '',
  freq: '2',
  dc: 'ACT/ACT',
  settlement: todayUTC()
});
export default function BondAnalyticsPanel({
  holdings = [],
  onUpdateHolding
}) {
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const bonds = holdings.filter(h => h.type === 'bond');

  const selected = bonds.find(
    bond => String(bond.id) === selectedId
  );

  const selectBond = id => {
    setSelectedId(id);
    setResult(null);
    setError('');
    setSavedMessage('');

    const bond = bonds.find(
      item => String(item.id) === id
    );

    if (!bond) {
      setForm(emptyForm());
      return;
    }

    const terms = bond.bondTerms || {};

    
    setForm({
      bondCategory: bond.bondCategory || '',
      coupon:
        terms.coupon !== undefined && terms.coupon !== null
          ? String(terms.coupon)
          : '',
      maturity: terms.maturity || '',
      freq: String(terms.freq ?? 2),
      dc: terms.dc || 'ACT/ACT',
      settlement: bond.settlementDate || todayUTC()
    });

  const updateField = (key, value) => {
    setForm(previous => ({
      ...previous,
      [key]: value
    }));

    // Never display an old calculation alongside new inputs.
    setResult(null);
    setError('');
    setSavedMessage('');
  };

  const calculate = () => {
    setError('');
    setSavedMessage('');
    setResult(null);

    if (!selected) {
      setError('Select a bond first.');
      return;
    }

    if (form.coupon.trim() === '') {
      setError('Enter the annual coupon rate.');
      return;
    }

    const coupon = Number(form.coupon);
    const freq = Number(form.freq);

    const cleanPrice = Number(selected.price);
    const face = Number(selected.qty);

    if (
      !Number.isFinite(cleanPrice) ||
      cleanPrice <= 0 ||
      !Number.isFinite(face) ||
      face <= 0
    ) {
      setError('The selected bond needs a valid price and face value.');
      return;
    }

    const bondTerms = {
      coupon,
      maturity: form.maturity,
      freq,
      dc: form.dc
    };

    const validationError = validateInputs(
      bondTerms,
      form.settlement
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const analytics = fullCalc(
        bondTerms,
        form.settlement,
        face,
        String(cleanPrice),
        '',
        'price'
      );

      if (
        !analytics ||
        !Number.isFinite(analytics.ytm) ||
        !Number.isFinite(analytics.modDur) ||
        !Number.isFinite(analytics.dv01)
      ) {
        throw new Error('The bond calculation did not return valid results.');
      }

      setResult({
        ...analytics,
        bondTerms,
        settlement: form.settlement,
        calculatedFromPrice: cleanPrice,
        calculatedFromFace: face
      });
    } catch (err) {
      setError(err.message || 'Bond calculation failed.');
    }
  };

  const saveToPortfolio = () => {
    if (!selected || !result) {
      setError('Calculate the bond analytics before saving.');
      return;
    }

    // Guard against saving analytics for an old price or face value.
    if (
      Number(selected.price) !== result.calculatedFromPrice ||
      Number(selected.qty) !== result.calculatedFromFace
    ) {
      setResult(null);
      setError(
        'The bond price or face value changed. Calculate again before saving.'
      );
      return;
    }

    if (typeof onUpdateHolding !== 'function') {
      setError('Portfolio update handler is unavailable.');
      return;
    }

    onUpdateHolding(selected.id, {
      bondTerms: result.bondTerms,
      settlementDate: result.settlement,

      // Fields already supported by the Scenario Lab.
      modifiedDuration: result.modDur,

      // Analytics for future bond-risk features.
      ytm: result.ytm,
      dv01: result.dv01,
      dirtyPrice: result.dirtyPx,
      accruedInterestPer100: result.ai,

      analyticsSource: 'calculated',
      analyticsAsOf: result.settlement,
      analyticsPrice: result.calculatedFromPrice
    });

    setSavedMessage(
      'Bond analytics saved. Run the Scenario Lab to use the calculated duration.'
    );
  };

  return (
    <section className="bond-panel">
      <div className="heading">
        <div className="eyebrow">Fixed-income analytics</div>
        <h2>Bond <em>Analytics.</em></h2>
        <p>
          Calculate yield, modified duration and DV01
          using your bond's clean price and contractual terms.
        </p>
      </div>

      {bonds.length === 0 ? (
        <div className="notice">
          Add an individual bond to The Book to calculate its analytics.
        </div>
      ) : (
        <>
          <div className="form-grid">
            <label>
              <span>Select bond</span>
              <select
                value={selectedId}
                onChange={e => selectBond(e.target.value)}
              >
                <option value="">Choose a holding</option>
                
                {bonds.map(bond => (
                  <option key={bond.id} value={String(bond.id)}>
                    {bond.tkr} · {money(Number(bond.qty) * Number(bond.price) / 100)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Bond category</span>

              <select
                value={form.bondCategory}
                onChange={e =>
                  updateField('bondCategory', e.target.value)
                }
              >
                <option value="">Select category</option>
                <option value="government">Government</option>
                <option value="corporate">Corporate</option>
              </select>
            </label>

            <label>
              <span>Annual coupon (%)</span>
              <input
                type="number"
                step="any"
                min="0"
                value={form.coupon}
                placeholder="4.00"
                onChange={e => updateField('coupon', e.target.value)}
              />
            </label>

            <label>
              <span>Maturity date</span>
              <input
                type="date"
                value={form.maturity}
                onChange={e => updateField('maturity', e.target.value)}
              />
            </label>

            <label>
              <span>Coupon payments per year</span>
              <select
                value={form.freq}
                onChange={e => updateField('freq', e.target.value)}
              >
                {SUPPORTED_FREQUENCIES.map(freq => (
                  <option key={freq} value={String(freq)}>
                    {freq}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Day-count convention</span>
              <select
                value={form.dc}
                onChange={e => updateField('dc', e.target.value)}
              >
                {SUPPORTED_DAY_COUNTS.map(dc => (
                  <option key={dc} value={dc}>
                    {dc}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Settlement date</span>
              <input
                type="date"
                value={form.settlement}
                onChange={e => updateField('settlement', e.target.value)}
              />
            </label>
          </div>

          {selected && (
            <div className="selected">
              <strong>{selected.tkr}</strong>
              <span>Face: {money(Number(selected.qty))}</span>
              <span>Clean price: {number(Number(selected.price), 3)} per 100</span>
            </div>
          )}

          <button
            type="button"
            className="primary"
            disabled={!selected}
            onClick={calculate}
          >
            Calculate Bond Analytics
          </button>

          {error && <div className="error" role="alert">{error}</div>}
          {savedMessage && <div className="success">{savedMessage}</div>}

          {result && (
            <div className="results">
              <h3>Calculated results</h3>

              <div className="metrics">
                <div>
                  <span>Yield to maturity</span>
                  <strong>{number(result.ytm * 100, 3)}%</strong>
                </div>

                <div>
                  <span>Modified duration</span>
                  <strong>{number(result.modDur, 4)} years</strong>
                </div>

                <div>
                  <span>DV01</span>
                  <strong>{money(result.dv01)} / bp</strong>
                </div>

                <div>
                  <span>Accrued interest</span>
                  <strong>{number(result.ai, 4)} per 100</strong>
                </div>

                <div>
                  <span>Dirty price</span>
                  <strong>{number(result.dirtyPx, 4)}</strong>
                </div>

                <div>
                  <span>Dirty market value</span>
                  <strong>{money(result.totalAmt)}</strong>
                </div>
              </div>

              <button
                type="button"
                className="primary"
                onClick={saveToPortfolio}
              >
                Save Analytics to Portfolio
              </button>
            </div>
          )}
        </>
      )}

      <p className="method">
        For conventional fixed-coupon bonds. Results use the
        supplied terms and your current entered clean price;
        they do not retrieve live bond prices. DV01 is
        calculated for the entered face value. Recalculate
        after changing the price, settlement date or bond terms.
        A saved duration is a point-in-time estimate.
      </p>

      <style jsx>{`
        .bond-panel {
          margin: 38px 0 24px;
          padding: clamp(20px, 3vw, 32px);
          border: 1px solid #ded8cb;
          border-radius: 12px;
          background: #faf9f6;
          color: #262923;
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
          margin: 0 0 14px;
        }

        .heading p,
        .method {
          font: 12px/1.7 Inter, sans-serif;
          color: #817c74;
          max-width: 700px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin: 26px 0 20px;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        label span,
        .metrics span {
          font: 600 10px Inter, sans-serif;
          text-transform: uppercase;
          letter-spacing: .5px;
          color: #77736d;
        }

        input,
        select {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          min-height: 42px;
          padding: 10px;
          border: 1px solid #d8d3c8;
          border-radius: 6px;
          background: #fff;
          color: #262923;
          font: 13px Inter, sans-serif;
        }

        .selected {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          padding: 13px 0;
          font: 12px Inter, sans-serif;
        }

        .selected strong {
          color: #214b3d;
        }

        .primary {
          padding: 13px 18px;
          border: none;
          border-radius: 7px;
          background: #214b3d;
          color: white;
          font: 600 12px Inter, sans-serif;
          cursor: pointer;
        }

        .primary:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .error,
        .success,
        .notice {
          margin: 16px 0;
          padding: 13px;
          border-radius: 6px;
          font: 12px/1.6 Inter, sans-serif;
        }

        .error {
          background: #fff0ed;
          color: #963e33;
        }

        .success {
          background: #e5ece7;
          color: #214b3d;
        }

        .notice {
          background: #fff6df;
          color: #715627;
        }

        .results {
          margin-top: 25px;
          padding-top: 22px;
          border-top: 1px solid #ded8cb;
        }

        .metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 22px;
        }

        .metrics > div {
          padding: 16px;
          border: 1px solid #e4e0d7;
          border-radius: 8px;
          background: #fff;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }

        .metrics strong {
          font: 500 20px "JetBrains Mono", monospace;
          color: #214b3d;
          overflow-wrap: anywhere;
        }

        .method {
          border-top: 1px solid #ded8cb;
          padding-top: 17px;
          margin: 24px 0 0;
        }

        @media (max-width: 800px) {
          .form-grid,
          .metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 530px) {
          .form-grid,
          .metrics {
            grid-template-columns: 1fr;
          }

          .primary {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
