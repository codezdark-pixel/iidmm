const axios = require('axios');

const cryptoIds = {
  BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', USDC: 'usd-coin',
  LTC: 'litecoin', SOL: 'solana', XRP: 'ripple', DOGE: 'dogecoin', BNB: 'binancecoin',
  TRX: 'tron', BCH: 'bitcoin-cash', AVAX: 'avalanche-2'
};

let cache = { expires: 0, data: null };

async function getRates() {
  if (cache.data && Date.now() < cache.expires) return cache.data;
  const ids = Object.values(cryptoIds).join(',');
  const [crypto, fiat] = await Promise.all([
    axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: { ids, vs_currencies: 'usd,inr' }, timeout: 10000
    }),
    axios.get('https://api.frankfurter.app/latest', {
      params: { from: 'USD', to: 'INR,EUR,GBP,PKR,NPR,BDT' }, timeout: 10000
    })
  ]);

  const fiatRates = fiat.data.rates || {};
  fiatRates.INR = fiatRates.INR || 83;
  cache = {
    expires: Date.now() + 60_000,
    data: { crypto: crypto.data, fiat: fiatRates }
  };
  return cache.data;
}

function parseAmount(text) {
  const clean = String(text).replace(/,/g, '').trim();
  const match = clean.match(/[-+]?\d+(?:\.\d+)?/);
  if (!match) throw new Error('Please enter a valid amount.');
  const amount = Number(match[0]);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Amount must be zero or greater.');
  return amount;
}

async function cryptoToInr(amount, symbol = 'USDT') {
  const rates = await getRates();
  const id = cryptoIds[symbol.toUpperCase()] || cryptoIds.USDT;
  const quote = rates.crypto[id];
  if (!quote) throw new Error(`No live rate available for ${symbol.toUpperCase()}.`);
  return { result: amount * quote.inr, source: 'CoinGecko + INR FX', symbol: '₹' };
}

async function inrToCrypto(amount, symbol = 'USDT') {
  const rates = await getRates();
  const id = cryptoIds[symbol.toUpperCase()] || cryptoIds.USDT;
  const quote = rates.crypto[id];
  if (!quote) throw new Error(`No live rate available for ${symbol.toUpperCase()}.`);
  return { result: amount / quote.inr, source: 'CoinGecko + INR FX', symbol: symbol.toUpperCase() };
}

async function cryptoToCrypto(amount, from = 'USDT', to = 'BTC') {
  const rates = await getRates();
  const fromId = cryptoIds[from.toUpperCase()] || cryptoIds.USDT;
  const toId = cryptoIds[to.toUpperCase()] || cryptoIds.USDT;
  const fromQuote = rates.crypto[fromId];
  const toQuote = rates.crypto[toId];
  if (!fromQuote || !toQuote) throw new Error('One of these crypto assets is not available.');
  return { result: amount * fromQuote.usd / toQuote.usd, source: 'CoinGecko live spot', symbol: to.toUpperCase() };
}

module.exports = { getRates, parseAmount, cryptoToInr, inrToCrypto, cryptoToCrypto, cryptoIds };
