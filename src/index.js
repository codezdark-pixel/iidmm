require('dotenv').config();
const {
  Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder,
  REST, Routes
} = require('discord.js');
const math = require('mathjs');
const db = require('./db');
const rates = require('./rates');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token) {
  console.error('Missing DISCORD_TOKEN. Copy .env.example to .env and add your bot token.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const currencyMethods = [
  'i2c','c2i','c2si','c2safe','c2cdm','c2cash','cdm2c','cash2c','c2ccw','c2card','ccw2c','card2c','c2c','pp2c','p2c','c2pp','c2p','i2pp','i2p','ps2c','c2ps','pkr2c','c2pkr','npr2c','c2npr','bdt2c','c2bdt'
];

function helpEmbed(category = 'home') {
  if (category === 'profile') {
    return new EmbedBuilder()
      .setTitle('💳 Member Profile')
      .setDescription('Commands to check your personal profile and rewards.')
      .addFields(
        { name: 'Personal Profile & Cashback', value: '`&profile` / `&p` / `/profile` — View your profile card with account and wallet details.\n`&cashback` / `&cb` / `/cashback` — Open the interactive Cashback Hub.' }
      )
      .setFooter({ text: 'All rights reserved by Frost Exchange' })
      .setColor(0x4ea1ff);
  }

  if (category === 'calculators') {
    return new EmbedBuilder()
      .setTitle('🪙 Exchange Rate & Conversion Calculators')
      .setDescription('Live real-time currency converters, CDM/CCW cash, crypto assets, and calculator tools.')
      .addFields(
        { name: 'Currency Conversion', value: '`&i2c <amount>` — INR to Crypto\n`&c2i <amount>` — Crypto to INR\n`&c2si` / `&c2safe` — Crypto to Safe INR\n`&c2cdm` / `&c2cash` — Crypto to CDM\n`&cdm2c` / `&cash2c` — CDM to Crypto\n`&c2ccw` / `&c2card` — Crypto to CCW\n`&ccw2c` / `&card2c` — CCW to Crypto\n`&c2c <amount>` — Crypto to Crypto\n`&pp2c` / `&p2c` — PayPal to Crypto\n`&c2pp` / `&c2p` — Crypto to PayPal\n`&i2pp` / `&i2p` — INR to PayPal\nPaySafeCard, PKR, NPR, and BDT routes are also available.' },
        { name: 'Math Calculator', value: '`&calc <expr>` / `&math <expr>` / `/calc` / `/math`' }
      )
      .setFooter({ text: 'All rights reserved by Frost Exchange' })
      .setColor(0x4ea1ff);
  }

  return new EmbedBuilder()
    .setTitle('❄️ Frost Exchange • Member Help Directory')
    .setDescription('Public commands and utilities available to server members.')
    .addFields(
      { name: 'Prefixes & Usage', value: '**Primary Prefix:** `.` — `.calc`, `.p`, `.redeem`, `.spins`, `.lb`\n**Secondary Prefix:** `&` — `&calc`, `&profile`, `&stats`, `&leaderboard`\n**Slash Commands:** `/` supported across public helper commands' },
      { name: 'Available Categories', value: '💳 **Stats & Profiles:** Profile card, balance, rewards, and leaderboard\n🪙 **Calculator & Utilities:** Crypto calculations, guides, and ToS' }
    )
    .setFooter({ text: 'All rights reserved by Frost Exchange' })
    .setColor(0x4ea1ff);
}

function helpComponents(category = 'home') {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('frost_help_category')
    .setPlaceholder('Select a category')
    .addOptions([
      { label: 'Home', value: 'home', description: 'Member help directory', default: category === 'home' },
      { label: 'Member Profile', value: 'profile', description: 'Profile and cashback commands', default: category === 'profile' },
      { label: 'Calculators', value: 'calculators', description: 'Conversions and math tools', default: category === 'calculators' }
    ]);
  return [new ActionRowBuilder().addComponents(menu)];
}

function profileEmbed(user) {
  return new EmbedBuilder()
    .setTitle('Member Profile')
    .setThumbnail(user.displayAvatarURL ? user.displayAvatarURL() : null)
    .addFields(
      { name: 'User Info', value: `**Name:** ${user.tag}\n**ID:** ${user.id}` },
      { name: 'Client Stats', value: '**Level:** 1\n**Status:** Member' },
      { name: 'Cashback Wallet', value: `**Balance:** ₹${Number(db.ensureUser(user).balance).toLocaleString('en-IN')}\n**Cashback:** ₹${Number(db.ensureUser(user).cashback).toLocaleString('en-IN')}\n**Spins:** ${db.ensureUser(user).spins}` }
    )
    .setColor(0x4ea1ff)
    .setFooter({ text: 'Frost Exchange' });
}

function cashbackComponents() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('frost_spin').setLabel('Spin the Wheel').setEmoji('🎡').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('frost_redeem').setLabel('Redeem a Spin').setStyle(ButtonStyle.Success)
  )];
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

async function handleConverter(method, amountText, symbolText) {
  const amount = rates.parseAmount(amountText);
  if (method === 'i2c' || method === 'i2p') {
    const quote = await rates.inrToCrypto(amount, symbolText || 'USDT');
    return `₹${amount.toLocaleString('en-IN')} ≈ ${quote.result.toFixed(8)} ${quote.symbol}\nSource: ${quote.source}`;
  }
  if (method === 'c2i' || method === 'c2si' || method === 'c2safe' || method === 'c2cdm' || method === 'c2cash' || method === 'c2ccw' || method === 'c2card' || method === 'c2pp' || method === 'c2p') {
    const quote = await rates.cryptoToInr(amount, symbolText || 'USDT');
    return `${amount} ${symbolText || 'USDT'} ≈ ₹${quote.result.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\nSource: ${quote.source}`;
  }
  if (method === 'c2c') {
    const parts = String(symbolText || 'USDT BTC').split(/\s+/);
    const quote = await rates.cryptoToCrypto(amount, parts[0], parts[1]);
    return `${amount} ${parts[0].toUpperCase()} ≈ ${quote.result.toFixed(8)} ${quote.symbol}\nSource: ${quote.source}`;
  }
  if (method.includes('2') || method.includes('c')) {
    const quote = await rates.inrToCrypto(amount, 'USDT');
    return `Estimated: ₹${amount.toLocaleString('en-IN')} ≈ ${quote.result.toFixed(8)} USDT\nSource: ${quote.source}`;
  }
  return 'This conversion route is available; add method-specific rates in src/rates.js.';
}

async function sendHelp(replyable, category = 'home') {
  await replyable.reply({ embeds: [helpEmbed(category)], components: helpComponents(category) });
}

async function handlePrefixMessage(message) {
  if (message.author.bot) return;
  const prefix = message.content.startsWith('.') ? '.' : (message.content.startsWith('&') ? '&' : null);
  if (!prefix) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = (args.shift() || '').toLowerCase();
  const argument = args.join(' ').trim();

  if (['help','h','home'].includes(command)) return sendHelp(message);
  if (['profile','p','stats','cb','cashback','spins','redeem','lb','leaderboard'].includes(command)) {
    db.ensureUser(message.author);
  }
  if (['profile','p','stats'].includes(command)) return message.reply({ embeds: [profileEmbed(message.author)] });
  if (['cb','cashback'].includes(command)) return message.reply({ content: 'Frost Exchange • Cashback Hub', embeds: [profileEmbed(message.author)], components: cashbackComponents() });
  if (['calc','math'].includes(command)) {
    try { return message.reply(`Result: **${calculateMath(argument)}**`); }
    catch (error) { return message.reply(`❌ ${error.message}`); }
  }
  if (currencyMethods.includes(command)) {
    try {
      const result = await handleConverter(command, argument, args.slice(1).join(' '));
      return message.reply(result);
    } catch (error) { return message.reply(`❌ ${error.message}`); }
  }
  if (['spins'].includes(command)) {
    const user = db.ensureUser(message.author);
    return message.reply(`🎡 You have **${user.spins}** lucky spins.`);
  }
  if (['redeem'].includes(command)) {
    const reward = db.redeemSpins(message.author.id);
    return message.reply(reward ? `✅ Redeemed 1 spin for **₹${reward}**.` : '❌ You do not have a spin to redeem.');
  }
  if (['lb','leaderboard'].includes(command)) {
    const rows = db.leaderboard();
    const description = rows.map((row, i) => `**${i + 1}.** ${row.username} — ₹${row.balance.toLocaleString('en-IN')}`).join('\n') || 'No users yet.';
    return message.reply({ embeds: [new EmbedBuilder().setTitle('🏆 Frost Exchange Leaderboard').setDescription(description).setColor(0xf1c40f)] });
  }
}

const slashCommands = [
  new SlashCommandBuilder().setName('help').setDescription('Open the Frost Exchange help directory'),
  new SlashCommandBuilder().setName('profile').setDescription('View your profile'),
  new SlashCommandBuilder().setName('cashback').setDescription('Open the Cashback Hub'),
  new SlashCommandBuilder().setName('calc').setDescription('Calculate a math expression').addStringOption(o => o.setName('expression').setDescription('Example: (50+20)*1.5').setRequired(true)),
  new SlashCommandBuilder().setName('math').setDescription('Calculate a math expression').addStringOption(o => o.setName('expression').setDescription('Math expression').setRequired(true)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('View the top balances'),
  new SlashCommandBuilder().setName('spins').setDescription('Check your lucky spins'),
  new SlashCommandBuilder().setName('redeem').setDescription('Redeem a lucky spin'),
  new SlashCommandBuilder().setName('i2c').setDescription('Convert INR to crypto').addNumberOption(o => o.setName('amount').setDescription('Amount in INR').setRequired(true)).addStringOption(o => o.setName('crypto').setDescription('BTC, ETH, USDT...')),
  new SlashCommandBuilder().setName('c2i').setDescription('Convert crypto to INR').addNumberOption(o => o.setName('amount').setDescription('Crypto amount').setRequired(true)).addStringOption(o => o.setName('crypto').setDescription('BTC, ETH, USDT...')),
  new SlashCommandBuilder().setName('c2c').setDescription('Convert crypto to crypto').addNumberOption(o => o.setName('amount').setDescription('Source amount').setRequired(true)).addStringOption(o => o.setName('from').setDescription('Source crypto').setRequired(true)).addStringOption(o => o.setName('to').setDescription('Target crypto').setRequired(true))
];

async function registerSlashCommands() {
  if (!clientId) throw new Error('Missing DISCORD_CLIENT_ID');
  const rest = new REST({ version: '10' }).setToken(token);
  const body = slashCommands.map(command => command.toJSON());
  if (guildId) await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
  else await rest.put(Routes.applicationCommands(clientId), { body });
}

client.on('messageCreate', handlePrefixMessage);

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'frost_help_category') {
      const category = interaction.values[0];
      await interaction.update({ embeds: [helpEmbed(category)], components: helpComponents(category) });
    } else if (interaction.isButton() && interaction.customId === 'frost_spin') {
      const user = db.ensureUser(interaction.user);
      const now = Date.now();
      const last = user.last_spin ? new Date(user.last_spin).getTime() : 0;
      if (now - last < 24 * 60 * 60 * 1000) {
        const remaining = Math.ceil((24 * 60 * 60 * 1000 - (now - last)) / 3600000);
        return interaction.reply({ content: `🎡 You can spin again in **${remaining} hours**.`, ephemeral: true });
      }
      const roll = Math.floor(Math.random() * 100);
      const reward = roll === 99 ? 1000 : 10 + Math.floor(Math.random() * 20) * 10;
      db.addCashback(user.id, reward);
      db.db.prepare(`UPDATE users SET last_spin = ? WHERE id = ?`).run(new Date().toISOString(), user.id);
      await interaction.reply({ content: `🎉 You won **₹${reward} cashback**!`, ephemeral: true });
    } else if (interaction.isButton() && interaction.customId === 'frost_redeem') {
      const reward = db.redeemSpins(interaction.user.id);
      await interaction.reply({ content: reward ? `✅ Redeemed 1 spin for **₹${reward}**.` : '❌ No spins available.', ephemeral: true });
    } else if (interaction.isChatInputCommand()) {
      db.ensureUser(interaction.user);
      const command = interaction.commandName;
      if (command === 'help') return sendHelp(interaction);
      if (command === 'profile') return interaction.reply({ embeds: [profileEmbed(interaction.user)] });
      if (command === 'cashback') return interaction.reply({ content: 'Frost Exchange • Cashback Hub', embeds: [profileEmbed(interaction.user)], components: cashbackComponents() });
      if (command === 'calc' || command === 'math') {
        try { await interaction.reply(`Result: **${calculateMath(interaction.options.getString('expression'))}**`); }
        catch (error) { await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true }); }
      } else if (command === 'spins') {
        const user = db.ensureUser(interaction.user);
        await interaction.reply(`🎡 You have **${user.spins}** lucky spins.`);
      } else if (command === 'redeem') {
        const reward = db.redeemSpins(interaction.user.id);
        await interaction.reply(reward ? `✅ Redeemed 1 spin for **₹${reward}**.` : '❌ You do not have a spin to redeem.');
      } else if (command === 'leaderboard') {
        const rows = db.leaderboard();
        const description = rows.map((row, i) => `**${i + 1}.** ${row.username} — ₹${row.balance.toLocaleString('en-IN')}`).join('\n') || 'No users yet.';
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏆 Frost Exchange Leaderboard').setDescription(description).setColor(0xf1c40f)] });
      } else if (command === 'i2c') {
        const quote = await rates.inrToCrypto(interaction.options.getNumber('amount'), interaction.options.getString('crypto') || 'USDT');
        await interaction.reply(`₹${interaction.options.getNumber('amount').toLocaleString('en-IN')} ≈ ${quote.result.toFixed(8)} ${quote.symbol}\nSource: ${quote.source}`);
      } else if (command === 'c2i') {
        const quote = await rates.cryptoToInr(interaction.options.getNumber('amount'), interaction.options.getString('crypto') || 'USDT');
        await interaction.reply(`${interaction.options.getNumber('amount')} ${interaction.options.getString('crypto') || 'USDT'} ≈ ₹${quote.result.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\nSource: ${quote.source}`);
      } else if (command === 'c2c') {
        const quote = await rates.cryptoToCrypto(interaction.options.getNumber('amount'), interaction.options.getString('from'), interaction.options.getString('to'));
        await interaction.reply(`${interaction.options.getNumber('amount')} ${interaction.options.getString('from').toUpperCase()} ≈ ${quote.result.toFixed(8)} ${quote.symbol}\nSource: ${quote.source}`);
      }
    }
  } catch (error) {
    console.error(error);
    if (interaction.isRepliable()) {
      const payload = { content: `❌ ${error.message || 'Something went wrong.'}`, ephemeral: true };
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => {});
      else await interaction.reply(payload).catch(() => {});
    }
  }
});

client.once('ready', async () => {
  console.log(`Frost Exchange bot logged in as ${client.user.tag}`);
  try { await registerSlashCommands(); console.log('Slash commands registered.'); }
  catch (error) { console.error('Failed to register slash commands:', error.message); }
});

client.login(token);
