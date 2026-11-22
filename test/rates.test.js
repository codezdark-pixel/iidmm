const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const {
  parseAmount, getC2iRateTier, applyPercentageFee, inrToCrypto, cryptoToInr
} = require('../src/rates');

test('parseAmount accepts plain and currency amounts', () => {
  assert.equal(parseAmount('1000'), 1000);
  assert.equal(parseAmount('10$'), 10);
  assert.equal(parseAmount('1,000.50'), 1000.5);
});

test('parseAmount rejects invalid amounts', () => {
  assert.throws(() => parseAmount('hello'), /valid amount/);
  assert.throws(() => parseAmount('-5'), /zero or greater/);
});

test('C2I rate tier is selected by USD value and exactly $100 uses the upper tier', () => {
  assert.equal(getC2iRateTier(99, 1), 'below100');
  assert.equal(getC2iRateTier(100, 1), 'above100');
  assert.equal(getC2iRateTier(0.002, 50000), 'above100');
});

test('percentage fee is deducted from the converted amount', () => {
  assert.ok(Math.abs(applyPercentageFee(6 * 101, 18) - 496.92) < 1e-9);
  assert.equal(applyPercentageFee(100, 0), 100);
  assert.throws(() => applyPercentageFee(100, 101), /between 0 and 100/);
});

test('custom I2C rate is used for INR and crypto conversions', async t => {
  const originalGet = axios.get;
  axios.get = async url => url.includes('coingecko')
    ? { data: { bitcoin: { usd: 50000, inr: 4000000 } } }
    : { data: { rates: { INR: 80 } } };
  t.after(() => { axios.get = originalGet; });

  const inrQuote = await inrToCrypto(1000, 'BTC', 100);
  const cryptoQuote = await cryptoToInr(0.001, 'BTC', 100);

  assert.equal(inrQuote.result, 0.0002);
  assert.equal(inrQuote.i2cRate, 100);
  assert.equal(cryptoQuote.result, 5000);
  assert.equal(cryptoQuote.i2cRate, 100);
});
