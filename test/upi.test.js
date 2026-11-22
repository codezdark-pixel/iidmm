const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidUpiId, buildUpiPaymentUri, parseUpiAmount } = require('../src/upi');

test('validates common UPI virtual payment addresses', () => {
  assert.equal(isValidUpiId('name@bank'), true);
  assert.equal(isValidUpiId('user.name-1@ok.bank'), true);
  assert.equal(isValidUpiId('not-a-vpa'), false);
  assert.equal(isValidUpiId('x@bank'), false);
});

test('builds a UPI payment URI with optional amount', () => {
  const uri = new URL(buildUpiPaymentUri('name@bank', 'A Person', 12.5));
  assert.equal(uri.protocol, 'upi:');
  assert.equal(uri.hostname, 'pay');
  assert.equal(uri.searchParams.get('pa'), 'name@bank');
  assert.equal(uri.searchParams.get('pn'), 'A Person');
  assert.equal(uri.searchParams.get('am'), '12.50');
  assert.equal(uri.searchParams.get('cu'), 'INR');
  assert.equal(new URL(buildUpiPaymentUri('name@bank', 'A Person')).searchParams.has('am'), false);
});

test('parses only positive UPI payment amounts', () => {
  assert.equal(parseUpiAmount('10'), 10);
  assert.equal(parseUpiAmount('10.25'), 10.25);
  assert.throws(() => parseUpiAmount('0'), /greater than zero/);
  assert.throws(() => parseUpiAmount('1.234'), /up to 2 decimal places/);
});
