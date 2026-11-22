const axios = require('axios');

const BASE_URL = 'https://api.covalenthq.com';

async function goldRushGet(path, params = {}) {
  const apiKey = process.env.GOLDRUSH_API_KEY;
  if (!apiKey) throw new Error('On-chain lookup requires `GOLDRUSH_API_KEY` in `.env`.');

  let response;
  try {
    response = await axios.get(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      params,
      timeout: 15000
    });
  } catch (error) {
    const status = error.response?.status;
    if (status === 401 || status === 403) throw new Error('GoldRush rejected the API key. Check `GOLDRUSH_API_KEY` in `.env`.');
    if (status === 404) throw new Error('No matching on-chain record was found.');
    if (status === 429) throw new Error('GoldRush API rate limit reached. Try again shortly.');
    if (status) throw new Error(`GoldRush request failed with HTTP ${status}.`);
    throw new Error('Could not reach GoldRush. Check the bot network connection and try again.');
  }

  const payload = response.data?.data;
  if (!payload || response.data?.error) {
    throw new Error(response.data?.error_message || 'GoldRush returned an invalid response.');
  }
  return payload;
}

async function getWalletBalances(chain, address) {
  const isMultichainEvm = chain === 'evm-all';
  const path = isMultichainEvm
    ? `/v1/allchains/address/${encodeURIComponent(address)}/balances/`
    : `/v1/${encodeURIComponent(chain)}/address/${encodeURIComponent(address)}/balances_v2/`;
  const payload = await goldRushGet(path, isMultichainEvm
    ? { 'quote-currency': 'USD', limit: 100 }
    : { 'no-spam': true, 'quote-currency': 'USD', limit: 100 });
  return Array.isArray(payload.items) ? payload.items : [];
}

async function getTransaction(chain, hash) {
  const path = `/v1/${encodeURIComponent(chain)}/transaction_v2/${encodeURIComponent(hash)}/`;
  const payload = await goldRushGet(path, { 'quote-currency': 'USD' });
  const transaction = payload.items?.[0];
  if (!transaction) throw new Error('No transaction was found for that hash on the selected chain.');
  return transaction;
}

function normalizeBalance(item) {
  const decimals = Number(item.contract_decimals || 0);
  const rawBalance = Number(item.balance || 0);
  const balance = rawBalance / (10 ** decimals);
  if (!Number.isFinite(balance)) return null;
  return {
    symbol: item.contract_ticker_symbol || item.contract_name || 'TOKEN',
    balance,
    usdValue: Number(item.quote) || 0,
    chain: item.chain_name || item.chain_id || null
  };
}

function formatTransaction(transaction) {
  const hash = transaction.tx_hash || transaction.txHash || 'Unknown';
  const fields = [
    `**Hash:** \`${hash}\``,
    `**Status:** ${transaction.successful === false ? 'Failed' : 'Confirmed'}`,
    transaction.block_height !== undefined ? `**Block:** ${transaction.block_height}` : null,
    transaction.block_signed_at ? `**Time:** ${transaction.block_signed_at}` : null,
    transaction.from_address ? `**From:** \`${transaction.from_address}\`` : null,
    transaction.to_address ? `**To:** \`${transaction.to_address}\`` : null
  ].filter(Boolean);
  return fields.join('\n');
}

module.exports = { getWalletBalances, getTransaction, normalizeBalance, formatTransaction };
