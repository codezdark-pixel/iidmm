require('dotenv').config();
const {
  Client, GatewayIntentBits, Partials, ActionRowBuilder,
  StringSelectMenuBuilder, PermissionFlagsBits, ContainerBuilder,
  TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder
} = require('discord.js');
const math = require('mathjs');
const QRCode = require('qrcode');
const db = require('./db');
const rates = require('./rates');
const { formatInr, formatCrypto, createConversionContainer } = require('./conversion-embed');
const { BRAND_ACCENT_COLOR, createContainer, componentV2Payload } = require('./component-v2');
const { createCalculatorContainer } = require('./calculator-container');
const { createProfileContainer } = require('./profile-container');
const { isValidUpiId, buildUpiPaymentUri, parseUpiAmount } = require('./upi');
const { hasStaffHelpAccess } = require('./help-access');
const {
  normalizeChain, inferWalletChain, validateTransactionHash,
  parseConversionAmount, convertValue, formatCryptoValue, formatFiatValue,
  cryptoSymbols
} = require('./crypto-tools');
const { getWalletBalances, getTransaction, normalizeBalance, formatTransaction } = require('./crypto-api');
const emojis = require('../emoji.json');
const staffRoles = require('../staff-roles.json');

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('Missing DISCORD_TOKEN. Copy .env.example to .env and add your bot token.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const currencyMethods = [
  'i2c','c2i','pp2c','c2pp','i2pp','pp2i','c2c'
];

function helpContainer(category = 'home', canAccessStaffHelp = false) {
  const footer = "-# All right's reserved by INDIA EXCHANGE.";

  if (category === 'extra') {
    return createContainer([
      `## ${emojis.king} Extra`,
      '> General assistant features and help menu',
      '',
      `> ${emojis.stararrow} \`=help\` ${emojis.hyphen} Interactive help center.`,
      `> ${emojis.stararrow} \`=help search\` ${emojis.hyphen} Search for commands.`,
      `> ${emojis.stararrow} \`=ping\` ${emojis.hyphen} Check bot latency.`,
      `> ${emojis.stararrow} \`=staff\` ${emojis.hyphen} Manage exchanger staff roles (requires Manage Roles).`,
      `> ${emojis.stararrow} \`=staff break @member\` ${emojis.hyphen} Replace exchanger roles with the break role.`,
      `> ${emojis.stararrow} \`=staff hire @member\` ${emojis.hyphen} Give the exchanger role.`,
      `> ${emojis.stararrow} \`=staff hire <inr|pp> @member\` ${emojis.hyphen} Give exchanger and market roles.`,
      `> ${emojis.stararrow} \`=staff restrict @member\` ${emojis.hyphen} Replace exchanger roles with the restricted role.`,
      `> ${emojis.stararrow} \`=staff resume @member\` ${emojis.hyphen} Remove the break role and restore exchanger roles.`,
      `> ${emojis.stararrow} \`=staff retire @member\` ${emojis.hyphen} Replace exchanger roles with the retired role.`,
      `> ${emojis.stararrow} \`=staff suspend @member\` ${emojis.hyphen} Replace exchanger roles with the suspended role.`,
      `> ${emojis.stararrow} \`=staff unrestrict @member\` ${emojis.hyphen} Remove the restricted role and restore exchanger roles.`,
      `> ${emojis.stararrow} \`=staff unretire @member\` ${emojis.hyphen} Remove the retired role and restore exchanger roles.`,
      `> ${emojis.stararrow} \`=staff unsuspend @member\` ${emojis.hyphen} Remove the suspended role and restore exchanger roles.`,
      `> ${emojis.stararrow} \`=stats\` ${emojis.hyphen} Show bot health: latency, shards, cogs, uptime, memory.`,
      `> ${emojis.stararrow} \`=top\` ${emojis.hyphen} Create a top admin role.`,
      '-# Page 1/1',
      footer
    ].join('\n'), { actionRows: helpComponents(category, canAccessStaffHelp) });
  }

  if (category === 'upi') {
    return createContainer([
      `## ${emojis.upi} Upi`,
      '> UPI payment management and QR generation',
      '',
      `> ${emojis.stararrow} \`=listupi\` ${emojis.hyphen} View saved UPI IDs.`,
      `> ${emojis.stararrow} \`=qr [amount]\` ${emojis.hyphen} Generate a UPI QR code.`,
      `> ${emojis.stararrow} \`=removeupi\` ${emojis.hyphen} Delete a saved UPI ID.`,
      `> ${emojis.stararrow} \`=setupi <upi-id>\` ${emojis.hyphen} Save or update your UPI ID.`,
      `> ${emojis.stararrow} \`=upi\` ${emojis.hyphen} Share a saved UPI ID.`,
      '-# Page 1/1',
      footer
    ].join('\n'), { actionRows: helpComponents(category, canAccessStaffHelp) });
  }

  if (category === 'crypto') {
    return createContainer([
      `## ${emojis.rocket} Crypto`,
      '> Cryptocurrency rates, conversions, balances & txids',
      '',
      `> ${emojis.stararrow} \`=bal\` ${emojis.hyphen} View balances for your saved wallets.`,
      `> ${emojis.stararrow} \`=convert <amount> <from> <to>\` ${emojis.hyphen} Convert crypto and fiat values.`,
      `> ${emojis.stararrow} \`=price <crypto>\` ${emojis.hyphen} Live cryptocurrency price.`,
      `> ${emojis.stararrow} \`=txid <chain> <hash>\` ${emojis.hyphen} Look up transaction details.`,
      `> ${emojis.stararrow} \`=wallet <address>\` ${emojis.hyphen} Save a wallet; EVM and Bitcoin addresses are detected automatically.`,
      `> ${emojis.stararrow} \`=wallet list|remove <address|all>\` ${emojis.hyphen} Manage your saved wallets.`,
      '-# Page 1/1',
      footer
    ].join('\n'), { actionRows: helpComponents(category, canAccessStaffHelp) });
  }

  if (category === 'profile') {
    return createContainer([
        `### ${emojis.icons8cutenote100} **Member Profile**`,
        '-# Commands to check your personal profile and rewards.',
        '',
        `> ### ${emojis.icons8cutebluecursor100} **Personal Profile**`,
        '> - `.profile` / `.p` / `.stats` *(Public)*',
        '>   View your profile card with User Info and Client Stats.',
        footer
      ].join('\n'), { actionRows: helpComponents(category, canAccessStaffHelp) });
  }

  if (category === 'calculators') {
    return createContainer([
        `### ${emojis.coins} **Exchange Rate & Conversion Calculators**`,
        '-# Currency converters, crypto swaps, and calculator tools.',
        '',
        `> ### ${emojis.icons8cutebluecursor100} **Currency Conversion Commands (Public - No Perms Needed)**`,
        '> - `.i2c <amount>` — INR to Crypto (e.g. `.i2c 1000` or `.i2c 10$`)',
        '> - `.c2i <amount> [crypto]` — Crypto to INR; uses separate rates below $100 and at/above $100 USD value',
        '> - `.pp2c <amount>` — PayPal to Crypto',
        '> - `.c2pp <amount>` — Crypto to PayPal',
        '> - `.i2pp <amount>` — INR to PayPal',
        '> - `.pp2i <amount>` — PayPal to INR',
        '> - `.c2c <amount> <from> <to>` — Crypto to Crypto swap',
        '> - `.setrate <exchange> <rate>` — Set exchange rates *(Owner only)*',
        '> - PayPal exchange rates are percentage fees (e.g. `.setrate pp2i 18` deducts 18%).',
        '> - `.setrate c2i below100 <rate>` / `.setrate c2i above100 <rate>` — Set the two C2I tiers *(Owner only)*',
        '',
        `> ### ${emojis.icons8cuteopenbook100} **Math Calculator**`,
        '> - `.calc <expr>` / `.math <expr>` — Instant arithmetic calculator (e.g. `.calc (50+20)*1.5`)',
        footer
      ].join('\n'), { actionRows: helpComponents(category, canAccessStaffHelp) });
  }

  const categories = [
    `### ${emojis.india} **INDIA EXCHANGE • Member Help Directory**`,
    '-# Public commands and utilities available to server members.',
    '',
    `> ### ${emojis.icons8cutebluecursor100} **Prefixes & Usage**`,
    '> - **Prefixes:** `.` for exchange/profile tools; `=` for assistant, UPI, and crypto tools.',
    '',
    `> ### ${emojis.icons8cuteopenbook100} **Available Categories**`,
    `> - ${emojis.icons8cutenote100} **Stats & Profiles:** Profile card, balance, and leaderboard`,
    `> - ${emojis.coins} **Calculator & Utilities:** Crypto calculations, guides, and ToS`,
    `> - ${emojis.rocket} **Crypto:** Live prices, conversions, wallet balances, and transaction lookups`
  ];
  if (canAccessStaffHelp) {
    categories.push(
      `> - ${emojis.king} **Extra:** Staff assistant features and help menu`,
      `> - ${emojis.upi} **UPI:** Payment management and QR generation`
    );
  }
  categories.push(
    '',
    '-# Select a category from the dropdown menu below to view available commands.',
    footer
  );

  return createContainer(categories.join('\n'), {
    actionRows: helpComponents(category, canAccessStaffHelp)
  });
}

function responseContainer(description) {
  return createContainer(description);
}

function helpComponents(category = 'home', canAccessStaffHelp = false) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('frost_help_category')
    .setPlaceholder('Select a category')
    .addOptions([
      { label: 'Home', value: 'home', description: 'Member help directory', default: category === 'home' },
      { label: 'Member Profile', value: 'profile', description: 'Profile commands', default: category === 'profile' },
      { label: 'Calculators', value: 'calculators', description: 'Conversions and math tools', default: category === 'calculators' },
      { label: 'Crypto', value: 'crypto', description: 'Prices, conversions, balances, and transactions', default: category === 'crypto' },
      ...(canAccessStaffHelp ? [
        { label: 'Extra', value: 'extra', description: 'Staff assistant features and help menu', default: category === 'extra' },
        { label: 'UPI', value: 'upi', description: 'UPI payment management and QR generation', default: category === 'upi' }
      ] : [])
    ]);
  return [new ActionRowBuilder().addComponents(menu)];
}

function calculateMath(expression) {
  if (!expression || expression.length > 120) throw new Error('Expression is missing or too long.');
  if (!/^[0-9+\-*/().,%\s,a-zA-Z_]+$/.test(expression)) throw new Error('Use numbers and basic math operators only.');
  const allowed = ['sin','cos','tan','sqrt','abs','log','exp','pi','e','pow','round','floor','ceil'];
  const names = expression.match(/[a-zA-Z_]+/g) || [];
  if (names.some(name => !allowed.includes(name.toLowerCase()))) throw new Error('That math function is not allowed.');
  const result = math.evaluate(expression);
  if (typeof result !== 'number' || !Number.isFinite(result)) throw new Error('Could not calculate a finite number.');
  return Number(result.toPrecision(12));
}

function getConversionRoute(method) {
  const routes = {
    i2c: ['INR', 'CRYPTO'],
    c2i: ['CRYPTO', 'INR'],
    c2c: ['CRYPTO', 'CRYPTO'],
    pp2c: ['PAYPAL', 'CRYPTO'],
    c2pp: ['CRYPTO', 'PAYPAL'],
    i2pp: ['INR', 'PAYPAL'],
    pp2i: ['PAYPAL', 'INR']
  };
  return routes[method];
}

function formatExchangeAmount(amount, currency, cryptoSymbol) {
  if (currency === 'INR') return formatInr(amount);
  if (currency === 'CRYPTO') return formatCrypto(amount, cryptoSymbol || 'USDT', true);
  if (currency === 'PAYPAL') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${amount.toLocaleString('en-US', { maximumFractionDigits: 8 })} ${currency}`;
}

async function handleConverter(method, amountText, symbolText) {
  const amount = rates.parseAmount(amountText);
  const configuredI2cRate = db.getI2cRate();
  const configuredRate = db.getExchangeRate(method);
  const route = getConversionRoute(method);
  const cryptoSymbol = method === 'c2c'
    ? String(symbolText || 'USDT BTC').split(/\s+/)[0]
    : method.startsWith('c2') ? symbolText || 'USDT' : 'USDT';

  if (['pp2c', 'c2pp', 'i2pp', 'pp2i'].includes(method)) {
    const feePercentage = configuredRate ?? 0;
    const rateData = await rates.getRates();
    const dollarToInr = configuredI2cRate ?? rateData.fiat.INR;
    let grossResult;
    let receiveSymbol;

    if (method === 'pp2i') {
      grossResult = amount * dollarToInr;
    } else if (method === 'i2pp') {
      grossResult = amount / dollarToInr;
    } else if (method === 'pp2c') {
      const target = (symbolText || 'USDT').toUpperCase();
      const cryptoId = rates.cryptoIds[target] || rates.cryptoIds.USDT;
      const quote = rateData.crypto[cryptoId];
      if (!quote) throw new Error(`No live rate available for ${target}.`);
      grossResult = amount / quote.usd;
      receiveSymbol = target;
    } else {
      const source = (symbolText || 'USDT').toUpperCase();
      const cryptoId = rates.cryptoIds[source] || rates.cryptoIds.USDT;
      const quote = rateData.crypto[cryptoId];
      if (!quote) throw new Error(`No live rate available for ${source}.`);
      grossResult = amount * quote.usd;
    }

    const netResult = rates.applyPercentageFee(grossResult, feePercentage);
    return createConversionContainer({
      from: route[0],
      to: route[1],
      pay: formatExchangeAmount(amount, route[0], cryptoSymbol),
      receive: formatExchangeAmount(netResult, route[1], receiveSymbol),
      rateLabel: `${method.toUpperCase()} Fee`,
      rateValue: `${feePercentage}%`
    });
  }

  if (method === 'c2i') {
    const symbol = (symbolText || 'USDT').toUpperCase();
    const rateData = await rates.getRates();
    const cryptoId = rates.cryptoIds[symbol] || rates.cryptoIds.USDT;
    const quote = rateData.crypto[cryptoId];
    if (!quote) throw new Error(`No live rate available for ${symbol}.`);
    const tier = rates.getC2iRateTier(amount, quote.usd);
    const tierRate = db.getExchangeRate(`c2i_${tier}`);
    const selectedRate = tierRate ?? configuredRate;
    if (selectedRate !== null) {
      return createConversionContainer({
        from: 'CRYPTO',
        to: 'INR',
        pay: formatCrypto(amount, symbol),
        receive: formatInr(amount * selectedRate),
        rateLabel: `C2I ${tier === 'above100' ? '≥' : '<'} $100`,
        rateValue: `${selectedRate.toLocaleString('en-US', { maximumFractionDigits: 8 })}₹ per ${symbol}`
      });
    }

    const liveQuote = await rates.cryptoToInr(amount, symbol, configuredI2cRate);
    return createConversionContainer({
      from: 'CRYPTO',
      to: 'INR',
      pay: formatCrypto(amount, symbol),
      receive: formatInr(liveQuote.result),
      i2cRate: liveQuote.i2cRate
    });
  }

  if (configuredRate !== null && method !== 'i2c') {
    const toCryptoSymbol = method === 'c2c'
      ? String(symbolText || 'USDT BTC').split(/\s+/)[1] || 'BTC'
      : 'USDT';
    const convertedAmount = amount * configuredRate;
    return createConversionContainer({
      from: route[0],
      to: route[1],
      pay: formatExchangeAmount(amount, route[0], cryptoSymbol),
      receive: formatExchangeAmount(convertedAmount, route[1], toCryptoSymbol),
      rateLabel: method.toUpperCase(),
      rateValue: `${configuredRate.toLocaleString('en-US', { maximumFractionDigits: 8 })} ${route[1]} per ${route[0]}`
    });
  }
  if (method === 'i2c') {
    const quote = await rates.inrToCrypto(amount, symbolText || 'USDT', configuredI2cRate);
    return createConversionContainer({
      from: 'INR',
      to: 'CRYPTO',
      pay: formatInr(amount),
      receive: formatCrypto(quote.result, quote.symbol, true),
      i2cRate: quote.i2cRate
    });
  }
  if (method === 'c2c') {
    const parts = String(symbolText || 'USDT BTC').split(/\s+/);
    const quote = await rates.cryptoToCrypto(amount, parts[0], parts[1]);
    const i2cRate = configuredI2cRate || (await rates.getRates()).fiat.INR;
    return createConversionContainer({
      from: 'CRYPTO',
      to: 'CRYPTO',
      pay: formatCrypto(amount, parts[0]),
      receive: formatCrypto(quote.result, quote.symbol, true),
      i2cRate
    });
  }
  throw new Error(`No rate has been configured for ${method.toUpperCase()}.`);
}

async function sendHelp(replyable, member, category = 'home') {
  const canAccessStaff = hasStaffHelpAccess(member, staffRoles);
  await replyable.reply(componentV2Payload(helpContainer(category, canAccessStaff)));
}

const helpSearchEntries = [
  ['=help', 'Open the interactive help center'],
  ['=help search <term>', 'Search available bot commands'],
  ['=ping', 'Check bot latency'],
  ['=staff', 'Manage exchanger staff roles', true],
  ['=stats', 'Show bot health and resource usage', true],
  ['=top', 'Show the account leaderboard', true],
  ['=listupi', 'Privately view your saved UPI ID', true],
  ['=qr [amount]', 'Generate a UPI payment QR code', true],
  ['=removeupi', 'Delete your saved UPI ID', true],
  ['=setupi <upi-id>', 'Save or update your UPI ID', true],
  ['=upi', 'Share your saved UPI ID', true],
  ['=bal', 'View on-chain balances for your saved wallets'],
  ['=convert <amount> <from> <to>', 'Convert between supported crypto assets and fiat currencies'],
  ['=price <crypto>', 'View the live crypto price in USD and INR'],
  ['=txid <chain> <hash>', 'Look up transaction details on a supported chain'],
  ['=wallet <address>', 'Save an EVM or Bitcoin wallet address for on-chain balance lookup'],
  ['.profile / .p', 'Show your profile'],
  ['.calc <expression>', 'Calculate a math expression'],
  ...currencyMethods.map(method => [`.${method}`, `Convert using ${method.toUpperCase()}`])
];

async function handleCryptoCommand(message, command, args) {
  if (!message.guild) throw new Error('Crypto wallet commands can only be used in a server.');

  if (command === 'wallet') {
    const subcommand = args[0]?.toLowerCase();
    if (subcommand === 'list') {
      const wallets = db.getCryptoWallets(message.guild.id, message.author.id);
      if (!wallets.length) throw new Error('You have no saved wallets. Use `=wallet <address>` first.');
      const walletList = wallets.map(({ chain, address }) =>
        `\`${chain === 'evm-all' ? 'EVM networks' : 'Bitcoin'}\` — \`${address}\``
      ).join('\n');
      await message.author.send(componentV2Payload(responseContainer(`Your saved crypto wallets:\n${walletList}`)));
      return message.reply(componentV2Payload(responseContainer('Your wallet list was sent to you in a direct message.')));
    }

    if (subcommand === 'remove') {
      if (!args[1]) throw new Error('Usage: `=wallet remove <address>` or `=wallet remove all`.');
      if (args[1].toLowerCase() === 'all') {
        const removed = db.removeAllCryptoWallets(message.guild.id, message.author.id);
        if (!removed) throw new Error('You have no saved wallets to remove.');
        return message.reply(componentV2Payload(responseContainer(`${emojis.tick} Removed all your saved wallets.`)));
      }
      const chain = inferWalletChain(args[1]);
      if (!db.removeCryptoWallet(message.guild.id, message.author.id, chain)) {
        throw new Error('You have no saved wallet for that address.');
      }
      return message.reply(componentV2Payload(responseContainer(`${emojis.tick} Removed your saved wallet.`)));
    }

    if (args.length !== 1) throw new Error('Usage: `=wallet <address>`, `=wallet list`, or `=wallet remove <address|all>`.');
    const chain = inferWalletChain(args[0]);
    db.setCryptoWallet(message.guild.id, message.author.id, chain, args[0]);
    return message.reply(componentV2Payload(responseContainer(
      `${emojis.tick} Saved your ${chain === 'evm-all' ? 'EVM' : 'Bitcoin'} wallet. Use \`=bal\` to check its balances.`
    )));
  }

  if (command === 'bal') {
    if (!message.guild) throw new Error('Crypto wallets are configured per server.');
    const wallets = db.getCryptoWallets(message.guild.id, message.author.id);
    if (!wallets.length) throw new Error('You have no saved wallets. Use `=wallet <chain> <address>` first.');
    const results = await Promise.all(wallets.map(async wallet => ({
      wallet,
      items: await getWalletBalances(wallet.chain, wallet.address)
    })));
    const sections = results.map(({ wallet, items }) => {
      const balances = items
        .map(normalizeBalance)
        .filter(item => item && item.balance > 0)
        .sort((a, b) => b.usdValue - a.usdValue);
      const shown = balances.slice(0, 8).map(item =>
        `> ${formatCryptoValue(item.balance, item.symbol)}${item.chain ? ` on \`${item.chain}\`` : ''}${item.usdValue > 0 ? ` — $${item.usdValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : ''}`
      );
      if (balances.length > shown.length) shown.push(`> …and ${balances.length - 8} more assets`);
      const title = wallet.chain === 'evm-all' ? 'All supported EVM networks' : 'Bitcoin';
      return `### ${title}\n${shown.join('\n') || '> No token balances found.'}`;
    });
    return message.reply(componentV2Payload(responseContainer([
      `## ${emojis.rocket} Crypto Balances for ${message.author}`,
      ...sections
    ].join('\n\n'))));
  }

  if (command === 'price') {
    if (args.length !== 1) throw new Error('Usage: `=price <crypto>` (for example, `=price BTC`).');
    const symbol = args[0].toUpperCase();
    if (!cryptoSymbols.has(symbol)) throw new Error('Unsupported asset. Use BTC, ETH, USDT, USDC, LTC, SOL, XRP, DOGE, BNB, TRX, BCH, or AVAX.');
    const ratesData = await rates.getRates();
    const quote = ratesData.crypto[rates.cryptoIds[symbol]];
    if (!quote) throw new Error(`No live price is available for ${symbol}.`);
    return message.reply(componentV2Payload(responseContainer([
      `## ${emojis.rocket} ${symbol} Price`,
      `> **USD:** $${quote.usd.toLocaleString('en-US', { maximumFractionDigits: 8 })}`,
      `> **INR:** ₹${quote.inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    ].join('\n'))));
  }

  if (command === 'convert') {
    if (args.length !== 3) throw new Error('Usage: `=convert <amount> <from> <to>` (for example, `=convert 1 BTC INR`).');
    const amount = parseConversionAmount(args[0]);
    const from = args[1].toUpperCase();
    const to = args[2].toUpperCase();
    const converted = convertValue(amount, from, to, await rates.getRates());
    const formattedAmount = cryptoSymbols.has(from)
      ? formatCryptoValue(amount, from)
      : formatFiatValue(amount, from);
    const formattedResult = cryptoSymbols.has(to)
      ? formatCryptoValue(converted, to)
      : formatFiatValue(converted, to);
    return message.reply(componentV2Payload(responseContainer([
      `## ${emojis.rocket} Crypto Conversion`,
      `> **${formattedAmount}** → **${formattedResult}**`
    ].join('\n'))));
  }

  if (command === 'txid') {
    if (args.length !== 2) throw new Error('Usage: `=txid <chain> <hash>` (for example, `=txid eth 0x…`).');
    const chain = validateTransactionHash(args[0], args[1]);
    const transaction = await getTransaction(chain, args[1]);
    return message.reply(componentV2Payload(responseContainer([
      `## ${emojis.rocket} Transaction on \`${chain}\``,
      formatTransaction(transaction)
    ].join('\n'))));
  }
}

function findMentionedUserId(message, args) {
  const mentioned = message.mentions.users.first();
  if (mentioned) return mentioned.id;
  const id = args.find(value => /^\d{17,20}$/.test(value));
  if (id) return id;
  const mention = args.map(value => value.match(/^<@!?(\d{17,20})>$/)).find(Boolean);
  return mention?.[1] || null;
}

async function handleStaffCommand(message, args) {
  const action = (args.shift() || '').toLowerCase();
  const actionStatuses = {
    break: 'break',
    restrict: 'restricted',
    retire: 'retired',
    suspend: 'suspended'
  };
  const restoreStatuses = {
    resume: 'break',
    unrestrict: 'restricted',
    unretire: 'retired',
    unsuspend: 'suspended'
  };
  if (!message.guild || !message.member) {
    throw new Error('Staff management can only be used in a server.');
  }
  if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error('You need the Manage Roles permission to manage staff.');
  }
  const botMember = await message.guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error('The bot needs the Manage Roles permission.');
  }
  if (!Object.hasOwn(actionStatuses, action)
      && !Object.hasOwn(restoreStatuses, action)
      && action !== 'hire') {
    return message.reply(componentV2Payload(responseContainer(
        'Usage: `=staff <break|hire|restrict|resume|retire|suspend|unrestrict|unretire|unsuspend> [inr|pp] <@member>`'
    )));
  }

  const userId = findMentionedUserId(message, args);
  if (!userId) throw new Error('Mention the staff member or provide their Discord user ID.');
  const target = await message.guild.members.fetch(userId);
  if (!target.manageable) {
    throw new Error('The bot cannot manage this member. Check the bot role hierarchy.');
  }

  if (action === 'hire') {
    if (db.getStaffRoleSnapshot(message.guild.id, target.id)) {
      throw new Error(`<@${target.id}> has an active staff status. Restore it before hiring them again.`);
    }
    const optionArgs = args.filter(value => !/^<@!?\d{17,20}>$/.test(value) && !/^\d{17,20}$/.test(value));
    const currency = optionArgs.map(value => value.toLowerCase()).find(value => ['inr', 'pp'].includes(value));
    if (optionArgs.some(value => value.toLowerCase() !== currency)) {
      throw new Error('Supported hire options are `inr` and `pp`; use `=staff hire @member` for the general exchanger role.');
    }
    const roleIds = [staffRoles.exchanger];
    if (currency) roleIds.push(staffRoles.markets[currency]);
    if (roleIds.some(roleId => !/^\d{17,20}$/.test(roleId || ''))) {
      throw new Error(`Set the ${currency ? `${currency.toUpperCase()} market and exchanger` : 'exchanger'} role ID${currency ? 's' : ''} in \`staff-roles.json\`.`);
    }

    const roles = await Promise.all([...new Set(roleIds)].map(async roleId => {
      const role = await message.guild.roles.fetch(roleId);
      if (!role) throw new Error(`Configured role \`${roleId}\` in \`staff-roles.json\` was not found in this server.`);
      return role;
    }));
    await target.roles.add(roles, `Staff hire by ${message.author.tag}`);
    return message.reply(componentV2Payload(responseContainer(
      `${emojis.tick} Added ${roles.map(role => `<@&${role.id}>`).join(' and ')} to <@${target.id}>.`
    )));
  }

  const snapshot = db.getStaffRoleSnapshot(message.guild.id, target.id);
  if (Object.hasOwn(restoreStatuses, action)) {
    const expectedStatus = restoreStatuses[action];
    if (!snapshot || snapshot.status !== expectedStatus) {
      throw new Error(`No saved ${expectedStatus} role state exists for <@${target.id}>.`);
    }
    const statusRoleId = staffRoles.statuses[expectedStatus];
    if (!/^\d{17,20}$/.test(statusRoleId || '')) {
      throw new Error(`Set the \`${expectedStatus}\` status role ID in \`staff-roles.json\`.`);
    }
    const roles = await Promise.all(snapshot.roleIds.map(async roleId => {
      const role = await message.guild.roles.fetch(roleId);
      if (!role) throw new Error(`Saved role \`${roleId}\` no longer exists; the role state was kept.`);
      return role;
    }));
    const statusRole = await message.guild.roles.fetch(statusRoleId);
    if (!statusRole) throw new Error(`Configured status role \`${statusRoleId}\` was not found in this server.`);
    await target.roles.remove(statusRole, `Staff status restoration by ${message.author.tag}`);
    try {
      if (roles.length) await target.roles.add(roles, `Staff role restoration by ${message.author.tag}`);
    } catch (error) {
      try {
        await target.roles.add(statusRole, 'Rollback failed staff role restoration');
      } catch (rollbackError) {
        console.error('Unable to restore the staff status role after a failed role restoration.', rollbackError);
      }
      throw error;
    }
    db.removeStaffRoleSnapshot(message.guild.id, target.id);
    return message.reply(componentV2Payload(responseContainer(
      `${emojis.tick} Restored ${roles.map(role => `<@&${role.id}>`).join(' and ') || 'the saved roles'} for <@${target.id}>.`
    )));
  }

  if (snapshot) {
    throw new Error(`<@${target.id}> already has a saved \`${snapshot.status}\` status. Restore it before changing status.`);
  }
  const status = actionStatuses[action];
  const configuredRoleIds = [
    staffRoles.exchanger,
    ...Object.values(staffRoles.markets)
  ].filter(Boolean);
  if (!configuredRoleIds.length) {
    throw new Error('Configure exchanger role IDs in `staff-roles.json` before using staff status commands.');
  }
  const statusRoleId = staffRoles.statuses[status];
  if (!/^\d{17,20}$/.test(statusRoleId || '')) {
    throw new Error(`Set the \`${status}\` status role ID in \`staff-roles.json\`.`);
  }
  const statusRole = await message.guild.roles.fetch(statusRoleId);
  if (!statusRole) throw new Error(`Configured status role \`${statusRoleId}\` was not found in this server.`);
  const configuredRoles = await Promise.all([...new Set(configuredRoleIds)].map(async roleId => {
    const role = await message.guild.roles.fetch(roleId);
    if (!role) throw new Error(`Configured exchanger role \`${roleId}\` was not found in this server.`);
    return role;
  }));
  const rolesToRemove = configuredRoles.filter(role => target.roles.cache.has(role.id));
  if (!rolesToRemove.length) throw new Error(`<@${target.id}> has none of the configured exchanger roles.`);

  db.saveStaffRoleSnapshot(message.guild.id, target.id, status, rolesToRemove.map(role => role.id));
  try {
    await target.roles.remove(rolesToRemove, `Staff status ${status} by ${message.author.tag}`);
    await target.roles.add(statusRole, `Staff status ${status} by ${message.author.tag}`);
  } catch (error) {
    try {
      await target.roles.add(rolesToRemove, `Rollback failed staff status change`);
      db.removeStaffRoleSnapshot(message.guild.id, target.id);
    } catch (rollbackError) {
      console.error('Unable to roll back staff role change; saved role snapshot retained.', rollbackError);
    }
    try {
      await target.roles.remove(statusRole, 'Rollback failed staff status change');
    } catch (rollbackError) {
      console.error('Unable to remove the status role after a failed staff role change.', rollbackError);
    }
    throw error;
  }
  return message.reply(componentV2Payload(responseContainer(
    `${emojis.tick} Set <@${target.id}> to \`${status}\`: removed exchanger roles and added <@&${statusRole.id}>.`
  )));
}

async function handleUpiCommand(message, command, args) {
  if (!message.guild) throw new Error('UPI commands can only be used in a server.');
  const guildId = message.guild.id;
  const userId = message.author.id;

  if (command === 'setupi') {
    const upiId = args[0];
    if (args.length !== 1 || !isValidUpiId(upiId)) {
      throw new Error('Usage: `=setupi <upi-id>` (example: `=setupi name@bank`).');
    }
    db.setUpiId(guildId, userId, upiId);
    return message.reply(componentV2Payload(responseContainer(`${emojis.tick} Your UPI ID was saved for this server.`)));
  }
  if (command === 'removeupi') {
    const removed = db.removeUpiId(guildId, userId);
    return message.reply(componentV2Payload(responseContainer(
      removed ? `${emojis.tick} Your saved UPI ID was deleted.` : `${emojis.cross} You do not have a saved UPI ID.`
    )));
  }
  if (command === 'listupi') {
    const upiId = db.getUpiId(guildId, userId);
    if (!upiId) throw new Error('You do not have a saved UPI ID. Use `=setupi <upi-id>` first.');
    await message.author.send(componentV2Payload(responseContainer(`Your saved UPI ID for this server is \`${upiId}\`.`)));
    return message.reply(componentV2Payload(responseContainer('Your saved UPI ID was sent to you in a direct message.')));
  }
  const upiId = db.getUpiId(guildId, userId);
  if (!upiId) throw new Error('You do not have a saved UPI ID. Use `=setupi <upi-id>` first.');
  if (command === 'upi') {
    return message.reply(componentV2Payload(responseContainer(`UPI ID for ${message.member.displayName}: \`${upiId}\``)));
  }
  if (command === 'qr') {
    const amount = parseUpiAmount(args[0]);
    if (args.length > 1) throw new Error('Usage: `=qr [amount]`.');
    const paymentUri = buildUpiPaymentUri(upiId, message.member.displayName, amount);
    const image = await QRCode.toBuffer(paymentUri, { type: 'png', width: 360, margin: 2 });
    const container = new ContainerBuilder()
      .setAccentColor(BRAND_ACCENT_COLOR)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `## UPI Payment QR\nScan to pay ${message.member.displayName}${amount ? ` **₹${amount.toFixed(2)}**` : ''}.\nUPI ID: \`${upiId}\``
      ))
      .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://upi-qr.png')
      ));
    return message.reply({
      ...componentV2Payload(container),
      files: [{ attachment: image, name: 'upi-qr.png' }]
    });
  }
}

async function handlePrefixMessage(message) {
  if (message.author.bot) return;
  const prefix = ['.', '='].find(candidate => message.content.startsWith(candidate));
  if (!prefix) return;
  const canAccessStaff = hasStaffHelpAccess(message.member, staffRoles);

  const args = message.content.slice(prefix.length).trim().split(/\s+/).filter(Boolean);
  const command = (args.shift() || '').toLowerCase();
  const argument = args.join(' ').trim();

  if (['help','h','home'].includes(command)) {
    if (args[0]?.toLowerCase() === 'search') {
      const query = args.slice(1).join(' ').trim().toLowerCase();
      if (!query) {
        return message.reply(componentV2Payload(responseContainer('Usage: `=help search <term>`.')));
      }
      const matches = helpSearchEntries.filter(([name, description, staffOnly]) =>
        (!staffOnly || canAccessStaff) && `${name} ${description}`.toLowerCase().includes(query)
      );
      const results = matches.map(([name, description]) => `> \`${name}\` — ${description}`).join('\n');
      return message.reply(componentV2Payload(responseContainer(
        results || `No commands found for \`${query}\`.`
      )));
    }
    return sendHelp(message, message.member);
  }
  if (command === 'ping' && prefix === '=') {
    return message.reply(componentV2Payload(responseContainer(`WebSocket latency: **${Math.round(client.ws.ping)} ms**`)));
  }
  if (command === 'stats' && prefix === '=') {
    const uptimeSeconds = Math.floor((client.uptime || 0) / 1000);
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const memoryMb = process.memoryUsage().rss / 1024 / 1024;
    return message.reply(componentV2Payload(responseContainer([
      '## Bot Health',
      `- WebSocket latency: **${Math.round(client.ws.ping)} ms**`,
      `- Shards connected: **${client.ws.shards.size}**`,
      `- Uptime: **${days}d ${hours}h ${minutes}m ${seconds}s**`,
      `- Memory usage: **${memoryMb.toFixed(1)} MB**`
    ].join('\n'))));
  }
  if (['bal', 'convert', 'price', 'txid', 'wallet'].includes(command) && prefix === '=') {
    try {
      return await handleCryptoCommand(message, command, args);
    } catch (error) {
      return message.reply(componentV2Payload(responseContainer(`${emojis.cross} ${error.message}`)));
    }
  }
  if (command === 'staff') {
    try {
      return await handleStaffCommand(message, args);
    } catch (error) {
      return message.reply(componentV2Payload(responseContainer(`${emojis.cross} ${error.message}`)));
    }
  }
  if (['listupi', 'qr', 'removeupi', 'setupi', 'upi'].includes(command)) {
    try {
      return await handleUpiCommand(message, command, args);
    } catch (error) {
      return message.reply(componentV2Payload(responseContainer(`${emojis.cross} ${error.message}`)));
    }
  }
  if (command === 'top' && prefix === '=') {
    const rows = db.leaderboard();
    const description = rows.map((row, i) => `**${i + 1}.** ${row.username} — ₹${row.balance.toLocaleString('en-IN')}`).join('\n') || 'No users yet.';
    return message.reply(componentV2Payload(responseContainer(`## ${emojis.king} INDIA EXCHANGE Leaderboard\n${description}`)));
  }
  if (command === 'setrate') {
    if (!process.env.BOT_OWNER_ID) {
      return message.reply(componentV2Payload(responseContainer(`${emojis.cross} Set \`BOT_OWNER_ID\` in \`.env\` to enable owner rate changes.`)));
    }
    if (message.author.id !== process.env.BOT_OWNER_ID) {
      return message.reply(componentV2Payload(responseContainer(`${emojis.cross} Only the bot owner can change the I2C rate.`)));
    }

    const [rateName, ...rateArgs] = args;
    if (rateName?.toLowerCase() === 'list') {
      return message.reply(componentV2Payload(responseContainer(
        `Configurable exchanges:\n${currencyMethods.map(name => `\`${name}\``).join(', ')}\nC2I tiers: \`below100\`, \`above100\``
      )));
    }
    const method = rateName?.toLowerCase();
    const c2iTier = method === 'c2i' ? rateArgs.shift()?.toLowerCase() : null;
    const rateParts = rateArgs;
    const rateKey = method === 'c2i' && ['below100', 'above100'].includes(c2iTier)
      ? `c2i_${c2iTier}`
      : method;
    const rateText = rateParts.join('').replace(/[,₹$/\s]/g, '');
    const rate = Number(rateText);
    const isPercentageRate = ['pp2c', 'c2pp', 'i2pp', 'pp2i'].includes(method);
    if (!currencyMethods.includes(method) || (method === 'c2i' && !['below100', 'above100'].includes(c2iTier)) || !/^\d+(?:\.\d+)?$/.test(rateText) || !Number.isFinite(rate) || (isPercentageRate ? rate > 100 : rate <= 0)) {
      return message.reply(componentV2Payload(responseContainer('Usage: `.setrate <exchange> <rate>` or `.setrate c2i <below100|above100> <rate>`. Use `.setrate list` to see exchanges.')));
    }

    db.setExchangeRate(rateKey, rate);
    const rateDescription = isPercentageRate
      ? `${rate}% fee`
      : method === 'i2c'
      ? `${rate.toFixed(2)}₹/$`
      : method === 'c2i'
        ? `${rate.toLocaleString('en-US', { maximumFractionDigits: 8 })}₹ per crypto unit for ${c2iTier === 'below100' ? '< $100' : '≥ $100'}`
        : `${rate.toLocaleString('en-US', { maximumFractionDigits: 8 })} ${getConversionRoute(method)[1]} per ${getConversionRoute(method)[0]}`;
    return message.reply(componentV2Payload(responseContainer(`${emojis.tick} \`${rateKey}\` rate set to **${rateDescription}**.`)));
  }
  if (['profile','p','stats','lb','leaderboard'].includes(command) && prefix === '.') {
    db.ensureUser(message.author);
  }
  if (['profile','p','stats'].includes(command) && prefix === '.') return message.reply(componentV2Payload(createProfileContainer(message.author, message.member)));
  if (['calc','math'].includes(command)) {
    try {
      const result = calculateMath(argument);
      return message.reply(componentV2Payload(createCalculatorContainer(argument, result)));
    }
    catch (error) { return message.reply(componentV2Payload(responseContainer(`${emojis.cross} ${error.message}`))); }
  }
  if (currencyMethods.includes(command)) {
    try {
      const result = await handleConverter(command, argument, args.slice(1).join(' '));
      return message.reply(componentV2Payload(result));
    } catch (error) { return message.reply(componentV2Payload(responseContainer(`${emojis.cross} ${error.message}`))); }
  }
  if (['lb','leaderboard'].includes(command)) {
    const rows = db.leaderboard();
    const description = rows.map((row, i) => `**${i + 1}.** ${row.username} — ₹${row.balance.toLocaleString('en-IN')}`).join('\n') || 'No users yet.';
    return message.reply(componentV2Payload(responseContainer(`## ${emojis.king} INDIA EXCHANGE Leaderboard\n${description}`)));
  }
}

client.on('messageCreate', handlePrefixMessage);

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'frost_help_category') {
      const category = interaction.values[0];
      const canAccessStaff = hasStaffHelpAccess(interaction.member, staffRoles);
      if (['extra', 'upi'].includes(category) && !canAccessStaff) {
        return interaction.update(componentV2Payload(helpContainer('home', false)));
      }
      if (!['home', 'profile', 'calculators', 'crypto', 'extra', 'upi'].includes(category)) {
        return interaction.reply(componentV2Payload(responseContainer(
          `${emojis.cross} That help category is not available.`
        ), true));
      }
      await interaction.update(componentV2Payload(helpContainer(category, canAccessStaff)));
    }
  } catch (error) {
    console.error(error);
    if (interaction.isRepliable()) {
      const payload = componentV2Payload(responseContainer(`${emojis.cross} ${error.message || 'Something went wrong.'}`), true);
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
      else await interaction.reply(payload);
    }
  }
});

client.once('ready', async () => {
  console.log(`INDIA EXCHANGE bot logged in as ${client.user.tag}`);
});

client.login(token);
