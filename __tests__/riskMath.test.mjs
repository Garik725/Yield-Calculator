// __tests__/riskMath.test.mjs
//
// Test suite for lib/riskMath.js — runs as a plain Node script, no Jest.
// Run: node __tests__/riskMath.test.mjs
//
// To wire into the build, in package.json:
//   "build": "node __tests__/bondMath.test.mjs && node __tests__/riskMath.test.mjs && next build"

import {
  validatePriceData,
  alignSeries,
  computeLogReturns,
  computeVolatility,
  computeCorrelationMatrix,
  analyzeRisk,
  _stats,
  TRADING_DAYS_PER_YEAR,
} from '../lib/riskMath.js';

let passed = 0, failed = 0;
const failures = [];

const test = (name, fn) => {
  try {
    fn();
    passed++;
    console.log(`  \u2713 ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, message: e.message });
    console.log(`  \u2717 ${name}`);
    console.log(`      ${e.message}`);
  }
};

const describe = (suite, fn) => {
  console.log(`\n${suite}`);
  console.log('\u2500'.repeat(suite.length));
  fn();
};

const expectClose = (actual, expected, tol, label) => {
  if (typeof actual !== 'number' || isNaN(actual)) {
    throw new Error(`${label}: got ${actual}, expected ~${expected}`);
  }
  const diff = Math.abs(actual - expected);
  if (diff > tol) {
    throw new Error(`${label}: got ${actual.toFixed(8)}, expected ${expected} (diff ${diff.toFixed(8)} > tol ${tol})`);
  }
};

const expectEqual = (actual, expected, label) => {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
};

const expectArrayEqual = (actual, expected, label) => {
  if (!Array.isArray(actual)) throw new Error(`${label}: got non-array ${typeof actual}`);
  if (actual.length !== expected.length) throw new Error(`${label}: length ${actual.length} vs expected ${expected.length}`);
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) throw new Error(`${label}: index ${i}: got ${actual[i]}, expected ${expected[i]}`);
  }
};

const origWarn = console.warn;
const silent = (fn) => {
  console.warn = () => {};
  try { return fn(); } finally { console.warn = origWarn; }
};

// ─────────────────────────────────────────────────────────────────────────────
// Statistical primitives
// ─────────────────────────────────────────────────────────────────────────────

describe('Statistical primitives', () => {
  test('mean of empty array is 0', () => {
    expectEqual(_stats.mean([]), 0, 'mean([])');
  });

  test('mean of [1,2,3,4,5] is 3', () => {
    expectClose(_stats.mean([1, 2, 3, 4, 5]), 3, 1e-10, 'mean');
  });

  test('sample stdev of [2,4,4,4,5,5,7,9] uses n-1 denominator', () => {
    // Classic dataset: population variance is 4, population stdev is 2.
    // Sample stdev uses n-1: variance = 32/7 = 4.571, stdev = 2.138.
    // We use sample stdev throughout (appropriate for a return sample).
    expectClose(_stats.sampleStdev([2, 4, 4, 4, 5, 5, 7, 9]), Math.sqrt(32 / 7), 1e-10, 'sample stdev');
  });

  test('correlation of identical series is 1', () => {
    const a = [1, 2, 3, 4, 5];
    expectClose(_stats.pearsonCorrelation(a, a), 1, 1e-10, 'corr(a,a)');
  });

  test('correlation of perfectly opposite series is -1', () => {
    expectClose(_stats.pearsonCorrelation([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]), -1, 1e-10, 'corr(a,-a)');
  });

  test('correlation of [1,2,3] and [2,4,6] is 1 (linear scaling)', () => {
    expectClose(_stats.pearsonCorrelation([1, 2, 3], [2, 4, 6]), 1, 1e-10, 'linear scale');
  });

  test('correlation with constant series is 0 (zero variance)', () => {
    expectClose(_stats.pearsonCorrelation([1, 1, 1, 1], [1, 2, 3, 4]), 0, 1e-10, 'constant series');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Input validation
// ─────────────────────────────────────────────────────────────────────────────

describe('Input validation', () => {
  test('rejects null', () => {
    if (!validatePriceData(null)) throw new Error('expected error on null');
  });

  test('rejects single ticker (correlation needs >=2)', () => {
    const e = validatePriceData({ SPY: [{ date: '2024-01-02', price: 100 }] });
    if (!e) throw new Error('expected error');
  });

  test('rejects ticker with fewer than 3 observations', () => {
    const e = validatePriceData({
      SPY: [{ date: '2024-01-02', price: 100 }, { date: '2024-01-03', price: 101 }],
      QQQ: [{ date: '2024-01-02', price: 200 }, { date: '2024-01-03', price: 201 }],
    });
    if (!e) throw new Error('expected error');
  });

  test('rejects malformed date', () => {
    const e = validatePriceData({
      SPY: [{ date: 'Jan 2 2024', price: 100 }, { date: '2024-01-03', price: 101 }, { date: '2024-01-04', price: 102 }],
      QQQ: [{ date: '2024-01-02', price: 200 }, { date: '2024-01-03', price: 201 }, { date: '2024-01-04', price: 202 }],
    });
    if (!e) throw new Error('expected error');
  });

  test('rejects negative or zero price', () => {
    const e = validatePriceData({
      SPY: [{ date: '2024-01-02', price: 100 }, { date: '2024-01-03', price: 0 }, { date: '2024-01-04', price: 102 }],
      QQQ: [{ date: '2024-01-02', price: 200 }, { date: '2024-01-03', price: 201 }, { date: '2024-01-04', price: 202 }],
    });
    if (!e) throw new Error('expected error');
  });

  test('accepts well-formed input', () => {
    const e = validatePriceData({
      SPY: [{ date: '2024-01-02', price: 100 }, { date: '2024-01-03', price: 101 }, { date: '2024-01-04', price: 102 }],
      QQQ: [{ date: '2024-01-02', price: 200 }, { date: '2024-01-03', price: 201 }, { date: '2024-01-04', price: 202 }],
    });
    if (e) throw new Error(`expected null, got ${e}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Date alignment — the most important behavior
// ─────────────────────────────────────────────────────────────────────────────

describe('Date alignment', () => {
  test('perfect alignment: identical date grids', () => {
    const data = {
      A: [{ date: '2024-01-02', price: 100 }, { date: '2024-01-03', price: 101 }, { date: '2024-01-04', price: 102 }],
      B: [{ date: '2024-01-02', price: 50 }, { date: '2024-01-03', price: 51 }, { date: '2024-01-04', price: 52 }],
    };
    const r = alignSeries(data);
    expectArrayEqual(r.dates, ['2024-01-02', '2024-01-03', '2024-01-04'], 'dates');
    expectArrayEqual(r.prices.A, [100, 101, 102], 'A prices');
    expectArrayEqual(r.prices.B, [50, 51, 52], 'B prices');
    expectEqual(r.dropped.A.length, 0, 'A dropped');
    expectEqual(r.dropped.B.length, 0, 'B dropped');
    expectClose(r.coverage, 1.0, 1e-10, 'coverage');
  });

  test('inner-join: A has a date B is missing — that date drops', () => {
    const data = {
      A: [{ date: '2024-01-02', price: 100 }, { date: '2024-01-03', price: 101 }, { date: '2024-01-04', price: 102 }],
      B: [{ date: '2024-01-02', price: 50 }, { date: '2024-01-04', price: 52 }],
      // B has no 2024-01-03 — that date must drop for both
    };
    const r = alignSeries(data);
    expectArrayEqual(r.dates, ['2024-01-02', '2024-01-04'], 'dates');
    expectArrayEqual(r.prices.A, [100, 102], 'A aligned');
    expectArrayEqual(r.prices.B, [50, 52], 'B aligned');
    expectEqual(r.dropped.B.length, 1, 'B had 1 missing date');
    expectEqual(r.dropped.B[0].date, '2024-01-03', 'B missing on Jan 3');
  });

  test('no forward-fill: missing day stays missing', () => {
    // If forward-fill were happening, we'd see the previous price repeated.
    // The output must drop the date entirely.
    const data = {
      A: [{ date: '2024-01-02', price: 100 }, { date: '2024-01-03', price: 999 }, { date: '2024-01-04', price: 102 }],
      B: [{ date: '2024-01-02', price: 50 }, { date: '2024-01-04', price: 52 }],
    };
    const r = alignSeries(data);
    // A's price 999 on 2024-01-03 must not appear in the aligned output
    expectArrayEqual(r.prices.A, [100, 102], 'A excludes the unaligned 999');
  });

  test('out-of-order input dates get sorted ascending', () => {
    const data = {
      A: [{ date: '2024-01-04', price: 102 }, { date: '2024-01-02', price: 100 }, { date: '2024-01-03', price: 101 }],
      B: [{ date: '2024-01-03', price: 51 }, { date: '2024-01-02', price: 50 }, { date: '2024-01-04', price: 52 }],
    };
    const r = alignSeries(data);
    expectArrayEqual(r.dates, ['2024-01-02', '2024-01-03', '2024-01-04'], 'sorted ascending');
    expectArrayEqual(r.prices.A, [100, 101, 102], 'A in date order');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Log returns
// ─────────────────────────────────────────────────────────────────────────────

describe('Log returns', () => {
  test('log return of 100 -> 110 is ln(1.10)', () => {
    const aligned = { tickers: ['A'], dates: ['d1', 'd2'], prices: { A: [100, 110] } };
    const r = computeLogReturns(aligned);
    expectEqual(r.returns.A.length, 1, 'one return');
    expectClose(r.returns.A[0], Math.log(1.1), 1e-10, 'ln(1.1)');
  });

  test('n prices produce n-1 returns', () => {
    const aligned = { tickers: ['A'], dates: ['d1', 'd2', 'd3', 'd4', 'd5'], prices: { A: [100, 102, 104, 103, 105] } };
    const r = computeLogReturns(aligned);
    expectEqual(r.returns.A.length, 4, 'n-1 returns');
    expectEqual(r.dates.length, 4, 'return dates length');
  });

  test('flat price series produces zero returns', () => {
    const aligned = { tickers: ['A'], dates: ['d1', 'd2', 'd3'], prices: { A: [100, 100, 100] } };
    const r = computeLogReturns(aligned);
    expectClose(r.returns.A[0], 0, 1e-10, 'return 1');
    expectClose(r.returns.A[1], 0, 1e-10, 'return 2');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Volatility
// ─────────────────────────────────────────────────────────────────────────────

describe('Realized volatility', () => {
  test('flat series has zero volatility', () => {
    const returns = { A: [0, 0, 0, 0, 0] };
    const v = computeVolatility(returns);
    expectClose(v.A.annualizedVol, 0, 1e-10, 'flat -> 0 vol');
  });

  test('annualization factor is sqrt(252)', () => {
    // If daily stdev is exactly 0.01 (1%), annualized must be 0.01 * sqrt(252)
    // Construct returns with exactly that stdev: [-0.01, 0.01] has stdev sqrt(2*0.01^2 / 1) = 0.01*sqrt(2)
    // Use a simpler case: returns = [0.01, -0.01] has sample stdev = sqrt((0.01^2 + 0.01^2)/1) = 0.01*sqrt(2)
    // Hand-design returns whose sample stdev is exactly 0.01:
    //   With n=3, mean=0, want sum((r_i)^2) / (n-1) = 0.0001 → sum = 0.0002 → returns = [0.01, 0, -0.01] gives stdev = sqrt(0.0002/2) = 0.01
    const returns = { A: [0.01, 0, -0.01] };
    const v = computeVolatility(returns);
    expectClose(v.A.dailyStdev, 0.01, 1e-10, 'daily stdev');
    expectClose(v.A.annualizedVol, 0.01 * Math.sqrt(252), 1e-10, 'annualized vol');
  });

  test('uses sample stdev (n-1), not population', () => {
    // returns = [1, -1] → mean = 0, sum_sq = 2 → sample variance = 2/1 = 2, stdev = sqrt(2)
    // (Population variance would be 2/2 = 1, stdev = 1 — that would be WRONG)
    const v = computeVolatility({ A: [1, -1] });
    expectClose(v.A.dailyStdev, Math.sqrt(2), 1e-10, 'sample stdev');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Correlation matrix
// ─────────────────────────────────────────────────────────────────────────────

describe('Correlation matrix', () => {
  test('matrix is symmetric with 1s on the diagonal', () => {
    const returns = {
      A: [0.01, -0.02, 0.03, 0.005, -0.01],
      B: [0.02, -0.01, 0.04, 0.01, -0.02],
      C: [-0.01, 0.02, -0.03, -0.005, 0.01],
    };
    const c = computeCorrelationMatrix(returns);
    const n = c.tickers.length;
    for (let i = 0; i < n; i++) {
      expectClose(c.matrix[i][i], 1, 1e-10, `diag[${i}]`);
      for (let j = 0; j < n; j++) {
        expectClose(c.matrix[i][j], c.matrix[j][i], 1e-12, `symmetric [${i}][${j}]`);
      }
    }
  });

  test('inverse-correlated series have corr near -1', () => {
    // C in the prior test is the negative of A — should give corr(A,C) = -1
    const returns = {
      A: [0.01, -0.02, 0.03, 0.005, -0.01],
      C: [-0.01, 0.02, -0.03, -0.005, 0.01],
    };
    const c = computeCorrelationMatrix(returns);
    expectClose(c.matrix[0][1], -1, 1e-10, 'corr(A,-A)');
  });

  test('correlation values are in [-1, 1]', () => {
    const returns = {
      A: [0.01, -0.02, 0.03, 0.005, -0.01, 0.02, -0.01, 0.015, -0.005, 0.01],
      B: [0.005, 0.01, -0.02, 0.025, -0.015, 0.01, -0.02, 0.03, -0.01, 0.005],
    };
    const c = computeCorrelationMatrix(returns);
    const v = c.matrix[0][1];
    if (v < -1.000001 || v > 1.000001) throw new Error(`corr out of range: ${v}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// End-to-end: analyzeRisk
// ─────────────────────────────────────────────────────────────────────────────

describe('Full pipeline (analyzeRisk)', () => {
  test('handles a realistic 30-row 3-ticker dataset', () => {
    // Synthesize a small dataset with known properties:
    //  - A: trends up at ~0.1% per day with low noise
    //  - B: perfectly correlated with A (B = 0.5 * A's daily change)
    //  - C: anticorrelated with A
    const dates = [];
    const today = new Date('2024-01-02');
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() + i);
      // Skip weekends to mimic trading days
      if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
      dates.push(d.toISOString().slice(0, 10));
    }
    const seed = (n) => {
      // Deterministic small "noise" so the test is reproducible
      const x = Math.sin(n * 12.9898) * 43758.5453;
      return (x - Math.floor(x)) * 0.004 - 0.002;
    };
    const A = [100];
    const B = [200];
    const C = [50];
    for (let i = 1; i < dates.length; i++) {
      const noiseA = seed(i);
      A.push(A[i - 1] * (1 + 0.001 + noiseA));
      B.push(B[i - 1] * (1 + 0.001 + noiseA));   // perfectly correlated with A
      C.push(C[i - 1] * (1 - 0.001 - noiseA));   // perfectly anti-correlated
    }
    const priceData = {
      A: dates.map((d, i) => ({ date: d, price: A[i] })),
      B: dates.map((d, i) => ({ date: d, price: B[i] })),
      C: dates.map((d, i) => ({ date: d, price: C[i] })),
    };

    const report = analyzeRisk(priceData);
    if (!report) throw new Error('expected a report, got null');
    expectEqual(report.tickers.length, 3, 'tickers');
    expectEqual(report.coverage, 1, 'perfect alignment expected');

    const m = report.correlation.matrix;
    expectClose(m[0][1], 1, 0.001, 'A vs B should be ~1');
    expectClose(m[0][2], -1, 0.001, 'A vs C should be ~-1');
  });

  test('returns null on validation failure', () => {
    const result = silent(() => analyzeRisk({ ONLY_ONE: [{ date: '2024-01-02', price: 100 }] }));
    expectEqual(result, null, 'returns null');
  });

  test('returns null when not enough dates survive alignment', () => {
    const result = silent(() => analyzeRisk({
      A: [
        { date: '2024-01-02', price: 100 }, { date: '2024-01-03', price: 101 },
        { date: '2024-01-04', price: 102 }, { date: '2024-01-05', price: 103 },
      ],
      B: [
        { date: '2024-02-02', price: 200 }, { date: '2024-02-03', price: 201 },
        { date: '2024-02-04', price: 202 }, { date: '2024-02-05', price: 203 },
      ],
    }));
    expectEqual(result, null, 'no overlap -> null');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log(`${passed} passed \u00b7 ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(`  \u2022 ${f.name}\n    ${f.message}`);
  process.exit(1);
} else {
  console.log('All tests passed.');
  process.exit(0);
}
