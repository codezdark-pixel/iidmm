function isValidUpiId(upiId) {
  return typeof upiId === 'string'
    && upiId.length <= 255
    && /^[A-Za-z0-9._-]{2,128}@[A-Za-z0-9.-]{2,64}$/.test(upiId);
}

function buildUpiPaymentUri(upiId, payeeName, amount) {
  if (!isValidUpiId(upiId)) throw new Error('The saved UPI ID is invalid.');
  const params = new URLSearchParams({
    pa: upiId,
    pn: String(payeeName).slice(0, 80),
    cu: 'INR'
  });
  if (amount !== undefined) params.set('am', amount.toFixed(2));
  return `upi://pay?${params.toString()}`;
}

function parseUpiAmount(value) {
  if (value === undefined) return undefined;
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(value)) {
    throw new Error('Amount must be a positive number with up to 2 decimal places.');
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be greater than zero.');
  }
  return amount;
}

module.exports = { isValidUpiId, buildUpiPaymentUri, parseUpiAmount };
