const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeChain, validateWalletAddress, validateTransactionHash,
  parseConversionAmount, convertValue
} = require('../src/crypto-tools');

const rates = {
  crypto: {
    bitcoin: { usd: 50000, inr: 4150000 },
    tether: { usd: 1, inr: 83 },
    'usd-coin': { usd: 1, inr: 83 },
    litecoin: { usd: 100, inr: 8300 }
  },
  fiat: { INR: 83, EUR: 0.92, GBP: 0.78, USD: 1 }
};

test('normalizes supported EVM and Bitcoin chain names', () => {
  assert.equal(normalizeChain('ethereum'), 'eth-mainnet');
  assert.equal(normalizeChain('polygon'), 'matic-mainnet');
  assert.equal(normalizeChain('btc'), 'btc-mainnet');
  assert.throws(() => normalizeChain('unknown-chain'), /Unsupported chain/);
});

test('validates wallet addresses by chain family', () => {
  assert.equal(validateWalletAddress('eth', `0x${'a'.repeat(40)}`), 'eth-mainnet');
  assert.equal(validateWalletAddress('btc', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'), 'btc-mainnet');
  assert.throws(() => validateWalletAddress('eth', 'not-an-address'), /EVM wallet addresses/);
  assert.throws(() => validateWalletAddress('btc', 'not-an-address'), /Bitcoin mainnet/);
});

test('validates transaction hashes and chain names', () => {
  assert.equal(validateTransactionHash('eth', `0x${'b'.repeat(64)}`), 'eth-mainnet');
  assert.equal(validateTransactionHash('btc', 'c'.repeat(64)), 'btc-mainnet');
  assert.throws(() => validateTransactionHash('eth', 'short'), /64 hexadecimal characters/);
});

test('parses positive decimal conversion amounts', () => {
  assert.equal(parseConversionAmount('12.5'), 12.5);
  assert.throws(() => parseConversionAmount('-1'), /positive number/);
  assert.throws(() => parseConversionAmount('0'), /greater than zero/);
});

test('converts between crypto assets and fiat currencies using live quote shapes', () => {
  assert.equal(convertValue(1, 'BTC', 'USD', rates), 50000);
  assert.equal(convertValue(100, 'USD', 'BTC', rates), 0.002);
  assert.equal(convertValue(1000, 'INR', 'USDT', rates), 1000 / 83);
  assert.equal(convertValue(1, 'BTC', 'INR', rates), 4150000);
  assert.equal(convertValue(100, 'EUR', 'GBP', rates), 100 * 0.78 / 0.92);
  assert.throws(() => convertValue(1, 'LTC', 'USD', { ...rates, crypto: {} }), /No live price/);
});
