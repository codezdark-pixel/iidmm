const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAmount } = require('../src/rates');

test('parseAmount accepts plain and currency amounts', () => {
  assert.equal(parseAmount('1000'), 1000);
  assert.equal(parseAmount('10$'), 10);
  assert.equal(parseAmount('1,000.50'), 1000.5);
});

test('parseAmount rejects invalid amounts', () => {
  assert.throws(() => parseAmount('hello'), /valid amount/);
  assert.throws(() => parseAmount('-5'), /zero or greater/);
});
