// __tests__/priceData.test.mjs
//
// Tests for lib/priceData.js using a mock PriceProvider.
// Proves the architecture composes correctly and surfaces all the
// expected failure modes (rate limits, bad tickers, partial successes)
// without ever calling a real API.

import { fetchPriceData } from '../lib/priceData.js';

let passed = 0, failed = 0;
const failures = [];

const test = (name, fn) => {
  return Promise.resolve()
    .then(fn)
    .then(() => { passed++; console.log(`  \u2713 ${name}`); })
    .catch((e) => {
      failed++;
      failures.push({ name, message: e.message });
      console.log(`  \u2717 ${name}`);
      console.log(`      ${e.message}`);
    });
};

const describe = (suite, fn) => {
  console.log(`\n${suite}`);
  console.log('\u2500'.repeat(suite.length));
  return fn();
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock provider builder — returns whatever we tell it to, per ticker.
// ─────────────────────────────────────────────────────────────────────────────

const makeMockProvider = (responses) => ({
  name: 'mock',
  fetchOne: async (ticker, from, to) => {
    if (typeof responses[ticker] === 'function') return responses[ticker](ticker, from, to);
    if (responses[ticker]) return responses[ticker];
    return { error: `mock: no fixture for ${ticker}`, errorCode: 'invalid_ticker' };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

const run = async () => {

  await describe('fetchPriceData input validation', async () => {
    await test('rejects fewer than 2 tickers', async () => {
      const r = await fetchPriceData(['SPY'], '2024-01-01', '2024-12-31', { provider: makeMockProvider({}) });
      assert(r.errors && r.errors._input, 'should have input error');
    });

    await test('rejects malformed dates', async () => {
      const r = await fetchPriceData(['SPY', 'TLT'], '01/01/2024', '2024-12-31', { provider: makeMockProvider({}) });
      assert(r.errors && r.errors._input, 'should have input error');
    });

    await test('rejects from >= to', async () => {
      const r = await fetchPriceData(['SPY', 'TLT'], '2024-12-31', '2024-01-01', { provider: makeMockProvider({}) });
      assert(r.errors && r.errors._input, 'should have input error');
    });

    await test('throws if no provider passed', async () => {
      let threw = false;
      try { await fetchPriceData(['SPY', 'TLT'], '2024-01-01', '2024-12-31', {}); }
      catch (e) { threw = true; }
      assert(threw, 'expected throw on missing provider');
    });
  });

  await describe('fetchPriceData success paths', async () => {
    await test('happy path: all tickers fetch successfully', async () => {
      const provider = makeMockProvider({
        SPY: { prices: [{ date: '2024-01-02', price: 470 }, { date: '2024-01-03', price: 471 }] },
        TLT: { prices: [{ date: '2024-01-02', price: 96 }, { date: '2024-01-03', price: 97 }] },
      });
      const r = await fetchPriceData(['SPY', 'TLT'], '2024-01-01', '2024-12-31', { provider });
      assert(r.priceData, 'should have priceData');
      assert(r.priceData.SPY.length === 2, 'SPY has 2 rows');
      assert(r.priceData.TLT.length === 2, 'TLT has 2 rows');
      assert(!r.errors, 'no errors');
      assert(r.provider === 'mock', 'provider name surfaced');
    });

    await test('de-duplicates tickers case-insensitively', async () => {
      let calls = 0;
      const provider = {
        name: 'mock',
        fetchOne: async (t) => { calls++; return { prices: [{ date: '2024-01-02', price: 100 }] }; },
      };
      await fetchPriceData(['SPY', 'spy', 'TLT', '  TLT  '], '2024-01-01', '2024-12-31', { provider });
      assert(calls === 2, `expected 2 fetches after dedup, got ${calls}`);
    });

    await test('surfaces warnings from provider (e.g., unadjusted fallback)', async () => {
      const provider = makeMockProvider({
        SPY: { prices: [{ date: '2024-01-02', price: 470 }], warning: '3 rows fell back to unadjusted close' },
        TLT: { prices: [{ date: '2024-01-02', price: 96 }] },
      });
      const r = await fetchPriceData(['SPY', 'TLT'], '2024-01-01', '2024-12-31', { provider });
      assert(r.warnings && r.warnings.SPY, 'SPY warning surfaced');
      assert(!r.warnings.TLT, 'TLT has no warning');
    });
  });

  await describe('fetchPriceData failure paths', async () => {
    await test('partial success: one ticker fails, others succeed', async () => {
      const provider = makeMockProvider({
        SPY: { prices: [{ date: '2024-01-02', price: 470 }] },
        BADTICKER: { error: 'ticker not found', errorCode: 'invalid_ticker' },
        TLT: { prices: [{ date: '2024-01-02', price: 96 }] },
      });
      const r = await fetchPriceData(['SPY', 'BADTICKER', 'TLT'], '2024-01-01', '2024-12-31', { provider });
      assert(r.priceData && Object.keys(r.priceData).length === 2, 'two successes');
      assert(r.errors && r.errors.BADTICKER, 'BADTICKER error surfaced');
      assert(!r.errors.SPY && !r.errors.TLT, 'no errors for successful tickers');
    });

    await test('all tickers fail: priceData absent, errors populated', async () => {
      const provider = makeMockProvider({
        FOO: { error: 'rate limit', errorCode: 'rate_limit' },
        BAR: { error: 'not found', errorCode: 'invalid_ticker' },
      });
      const r = await fetchPriceData(['FOO', 'BAR'], '2024-01-01', '2024-12-31', { provider });
      assert(!r.priceData, 'no priceData when all fail');
      assert(r.errors.FOO && r.errors.BAR, 'both errors present');
    });

    await test('provider that throws is not catastrophic (handled in adapter)', async () => {
      // The real EODHD adapter catches network errors. A test provider that
      // doesn't catch errors would propagate them — which would be a bug we'd
      // want to catch. We verify Promise.all propagates rejection so tests
      // around the adapter can be confident in their failure handling.
      const provider = {
        name: 'mock',
        fetchOne: async () => { throw new Error('uncaught provider error'); },
      };
      let threw = false;
      try {
        await fetchPriceData(['A', 'B'], '2024-01-01', '2024-12-31', { provider });
      } catch (e) {
        threw = true;
      }
      assert(threw, 'expected throw — adapter is responsible for catching its own errors');
    });
  });

  // ── Summary ──
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
};

run().catch((e) => { console.error('Test runner crashed:', e); process.exit(2); });
