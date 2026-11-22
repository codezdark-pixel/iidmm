const emojis = require('../emoji.json');
const { createContainer } = require('./component-v2');

function formatInr(amount) {
  return `${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}₹`;
}

function formatCrypto(amount, symbol, includeLabel = false) {
  const normalizedSymbol = symbol.toUpperCase();
  const value = ['USDT', 'USDC'].includes(normalizedSymbol)
    ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${amount.toFixed(8)} ${normalizedSymbol}`;
  return includeLabel ? `${value} in Crypto` : value;
}

function createConversionContainer({ from, to, pay, receive, i2cRate, rateLabel, rateValue }) {
  const currencyEmojis = { INR: emojis.inr, CRYPTO: emojis.crypto, PAYPAL: emojis.paypal };
  const fromEmoji = currencyEmojis[from] ? `${currencyEmojis[from]} ` : '';
  const toEmoji = currencyEmojis[to] ? `${currencyEmojis[to]} ` : '';
  const rateLine = rateValue !== undefined
    ? `-# **${rateLabel} Rate :** \`${rateValue}\``
    : i2cRate !== undefined ? `-# **I2C Rate :** \`${i2cRate.toFixed(2)}₹/$\`` : null;
  const footer = [rateLine, `-# ${emojis.india} INDIA EXCHANGE`].filter(Boolean).join('\n');
  return createContainer([
      `### ${fromEmoji}${from} → ${toEmoji}${to}`,
      '**You Have To Pay :**',
      `> **\`${pay}\`**`,
      '',
      '**You Will Receive :**',
      `> **\`${receive}\`**`,
      '',
      footer
    ].join('\n'));
}

module.exports = { formatInr, formatCrypto, createConversionContainer };
