const { cryptoIds } = require('./rates');

const chainAliases = {
  eth: 'eth-mainnet',
  ethereum: 'eth-mainnet',
  'eth-mainnet': 'eth-mainnet',
  polygon: 'matic-mainnet',
  matic: 'matic-mainnet',
  'matic-mainnet': 'matic-mainnet',
  bsc: 'bsc-mainnet',
  bnb: 'bsc-mainnet',
  'bsc-mainnet': 'bsc-mainnet',
  arbitrum: 'arbitrum-mainnet',
  'arbitrum-mainnet': 'arbitrum-mainnet',
  optimism: 'optimism-mainnet',
  'optimism-mainnet': 'optimism-mainnet',
  base: 'base-mainnet',
  'base-mainnet': 'base-mainnet',
  avalanche: 'avax-mainnet',
  avax: 'avax-mainnet',
  'avax-mainnet': 'avax-mainnet',
  gnosis: 'gnosis-mainnet',
  'gnosis-mainnet': 'gnosis-mainnet',
  fantom: 'fantom-mainnet',
  'fantom-mainnet': 'fantom-mainnet',
  btc: 'btc-mainnet',
  bitcoin: 'btc-mainnet',
  'btc-mainnet': 'btc-mainnet'
};

const cryptoSymbols = new Set(['BTC', 'ETH', 'USDT', 'USDC', 'LTC', 'SOL', 'XRP', 'DOGE', 'BNB', 'TRX', 'BCH', 'AVAX']);
const fiatSymbols = new Set(['USD', 'INR', 'EUR', 'GBP', 'PKR', 'NPR', 'BDT']);
const evmAddressPattern = /^0x[a-fA-F0-9]{40}$/;
const bitcoinAddressPattern = /^(?:bc1[a-zA-HJ-NP-Z0-9]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;

function normalizeChain(chain) {
  const canonical = chainAliases[String(chain).trim().toLowerCase()];
  if (!canonical) throw new Error('Unsupported chain. Supported: ETH, Polygon, BSC, Arbitrum, Optimism, Base, Avalanche, Gnosis, Fantom, BTC.');
  return canonical;
}

function validateWalletAddress(chain, address) {
  const canonical = normalizeChain(chain);
  if (canonical === 'btc-mainnet') {
    if (!bitcoinAddressPattern.test(address)) throw new Error('That is not a valid Bitcoin mainnet address.');
  } else if (!evmAddressPattern.test(address)) {
    throw new Error('EVM wallet addresses must be 0x followed by 40 hexadecimal characters.');
  }
  return canonical;
}

function inferWalletChain(address) {
  if (evmAddressPattern.test(address)) return 'evm-all';
  if (bitcoinAddressPattern.test(address)) return 'btc-mainnet';
  throw new Error('Unsupported address format. Wallet setup currently recognizes EVM (`0x…`) and Bitcoin (`bc1…`, `1…`, or `3…`) addresses.');
}

function validateTransactionHash(chain, hash) {
  const canonical = normalizeChain(chain);
  if (!/^(?:0x)?[a-fA-F0-9]{64}$/.test(hash)) {
    throw new Error('Transaction hash must contain 64 hexadecimal characters, optionally prefixed with `0x`.');
  }
  return canonical;
}

function parseConversionAmount(value) {
  if (!/^(?:\d+)(?:\.\d+)?$/.test(String(value))) {
    throw new Error('Amount must be a positive number.');
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be greater than zero.');
  return amount;
}

function convertValue(amount, from, to, rates) {
  const source = String(from).toUpperCase();
  const target = String(to).toUpperCase();
  const sourceCrypto = cryptoSymbols.has(source);
  const targetCrypto = cryptoSymbols.has(target);
  const sourceFiat = fiatSymbols.has(source);
  const targetFiat = fiatSymbols.has(target);
  if ((!sourceCrypto && !sourceFiat) || (!targetCrypto && !targetFiat)) {
    throw new Error('Unsupported currency or crypto symbol.');
  }
  if (source === target) return amount;
  if (sourceCrypto && !cryptoIds[source]) {
    throw new Error(`Unsupported crypto symbol: ${source}.`);
  }
  if (targetCrypto && !cryptoIds[target]) {
    throw new Error(`Unsupported crypto symbol: ${target}.`);
  }
  if (sourceCrypto && !rates.crypto[cryptoIds[source]]) {
    throw new Error(`No live price available for ${source}.`);
  }
  if (targetCrypto && !rates.crypto[cryptoIds[target]]) {
    throw new Error(`No live price available for ${target}.`);
  }

  const sourceQuote = sourceCrypto ? rates.crypto[cryptoIds[source]] : null;
  const targetQuote = targetCrypto ? rates.crypto[cryptoIds[target]] : null;
  const sourceUsdRate = sourceFiat ? (source === 'USD' ? 1 : rates.fiat[source]) : null;
  const targetUsdRate = targetFiat ? (target === 'USD' ? 1 : rates.fiat[target]) : null;
  if (sourceFiat && !Number.isFinite(sourceUsdRate)) throw new Error(`No live exchange rate available for ${source}.`);
  if (targetFiat && !Number.isFinite(targetUsdRate)) throw new Error(`No live exchange rate available for ${target}.`);

  const amountInUsd = sourceCrypto ? amount * sourceQuote.usd : amount / sourceUsdRate;
  if (targetCrypto) return amountInUsd / targetQuote.usd;
  if (source === 'INR' && target !== 'USD') return amount * (targetUsdRate / rates.fiat.INR);
  if (target === 'INR' && sourceCrypto) return amount * sourceQuote.inr;
  return amountInUsd * targetUsdRate;
}

function formatCryptoValue(amount, symbol) {
  return `${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 8 })} ${symbol.toUpperCase()}`;
}

function formatFiatValue(amount, symbol) {
  return `${symbol === 'INR' ? '₹' : ''}${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}${symbol === 'USD' ? '$' : symbol === 'EUR' ? '€' : symbol === 'GBP' ? '£' : symbol === 'INR' ? '' : ` ${symbol}`}`;
}

module.exports = {
  chainAliases, cryptoSymbols, fiatSymbols,
  normalizeChain, validateWalletAddress, inferWalletChain, validateTransactionHash, parseConversionAmount,
  convertValue, formatCryptoValue, formatFiatValue
};
