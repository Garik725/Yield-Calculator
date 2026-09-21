
import { analyzePortfolioScenario } from '../lib/portfolio/scenarioMath';

export default function ScenarioTest() {
  const holdings = [
    {
      id: '1',
      tkr: 'AAPL',
      type: 'stock',
      qty: 10,
      price: 200
    },
    {
      id: '2',
      tkr: 'US10Y',
      type: 'bond',
      qty: 10000,
      price: 98,
      modifiedDuration: 8
    }
  ];

  const scenario = {
    equityShockPct: -5,
    etfShockPct: -3,
    fxShockPct: -2,
    rateShockBps: 100,
    creditSpreadShockBps: 0
  };

  let result;
  let error = null;

  try {
    result = analyzePortfolioScenario(holdings, scenario);
  } catch (err) {
    error = err.message;
  }

  const expectedLoss = -884;

  const actualLoss = result?.summary?.pnl;

  const passed =
    actualLoss !== undefined &&
    Math.abs(actualLoss - expectedLoss) < 0.01;

  return (
    <main
      style={{
        maxWidth: 760,
        margin: '60px auto',
        padding: 24,
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <h1>Scenario Engine Test</h1>

      {error ? (
        <p style={{ color: 'red' }}>
          Error: {error}
        </p>
      ) : (
        <>
          <h2>
            {passed ? '✅ TEST PASSED' : '❌ TEST FAILED'}
          </h2>

          <p>
            Expected loss: ${expectedLoss}
          </p>

          <p>
            Calculated loss: ${actualLoss}
          </p>

          <h3>Full calculation</h3>

          <pre style={{
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            background: '#f5f5f5',
            padding: 16
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </>
      )}
    </main>
  );
}
