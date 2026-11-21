# Frost Exchange Discord Bot

A Discord bot with help dropdown pages, member profiles, cashback, lucky spins, leaderboard, live crypto and FX conversions, and a math calculator.

## Setup

1. Create a Discord application and bot at the Discord Developer Portal.
2. Enable the **Message Content** privileged intent for the bot in the Developer Portal.
3. Invite the bot with scopes `bot` and `applications.commands`, plus permission to send messages and use application commands.
4. Copy `.env.example` to `.env`.
5. Fill in `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`. Add `GUILD_ID` while testing for faster slash-command registration.
6. Install dependencies and start:

```bash
npm install
npm start
```

## Commands

- `.help` / `&help` / `/help`
- `.profile` / `&profile` / `/profile`
- `.cashback` / `&cashback` / `/cashback`
- `.calc (50+20)*1.5` / `&calc (50+20)*1.5` / `/calc`
- `.i2c 1000 USDT` / `&i2c 1000 USDT` / `/i2c`
- `.c2i 50 USDT` / `&c2i 50 USDT` / `/c2i`
- `.c2c 50 USDT BTC` / `&c2c 50 USDT BTC` / `/c2c`
- `.spins`, `.redeem`, and `.leaderboard`

The database is stored in `frost.db`. CoinGecko and Frankfurter rates are cached for 60 seconds. Wallet values are local demo values unless connected to your existing exchange account system.
