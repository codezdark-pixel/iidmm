# INDIA EXCHANGE Discord Bot

A Discord bot with help dropdown pages, member profiles, leaderboard, live crypto and FX conversions, and a math calculator.

Bot replies use Discord Components V2 containers, including the help pages, profile, conversion results, and command responses. Emoji aliases are listed in `emoji.json`.

## Setup

1. Create a Discord application and bot at the Discord Developer Portal.
2. Enable the **Message Content** privileged intent for the bot in the Developer Portal.
3. Invite the bot with the `bot` scope and permission to send messages and embeds.
4. Copy `.env.example` to `.env`.
5. Fill in `DISCORD_TOKEN` and your Discord user ID as `BOT_OWNER_ID`.
6. Install dependencies and start:

```bash
npm install
npm start
```

## Commands

- `.help`
- `.profile` / `.p`
- `.calc (50+20)*1.5`
- `.i2c 1000 USDT`
- `.c2i 50 USDT` — applies the below-$100 or at/above-$100 rate based on the crypto's USD value. Exactly $100 uses the `above100` tier.
- `.pp2c 50`, `.c2pp 50`, `.i2pp 1000`, and `.pp2i 50`
- `.c2c 50 USDT BTC`
- `.leaderboard`
- `.setrate <exchange> <rate>` — owner-only; sets a rate independently for each supported exchange. For PayPal routes, the value is a percentage fee deducted from the live conversion (for example, `.setrate pp2i 18` deducts 18%; `.setrate pp2i 6` with a ₹101 USD rate gives ₹496.92). For C2I, set separate output-per-crypto-unit rates with `.setrate c2i below100 <rate>` and `.setrate c2i above100 <rate>`. The tier is selected using the crypto amount's USD value; exactly $100 uses `above100`. Use `.setrate list` to see supported commands.

### Assistant and UPI commands

- `=help`; `=help search <term>`
- `=ping`, `=stats`, `=top`
- `=setupi <upi-id>` — save or update your UPI ID for the current server.
- `=listupi` — DM yourself the saved UPI ID.
- `=upi` — share your saved UPI ID in the current channel.
- `=qr [amount]` — post a UPI QR code; amount is optional and in INR.
- `=removeupi` — delete your saved UPI ID.
- `=staff hire @member` and `=staff hire <inr|pp> @member`
- `=staff <break|restrict|retire|suspend> @member`
- `=staff <resume|unrestrict|unretire|unsuspend> @member`
- `=wallet <address>` — save a wallet; `0x…` addresses are checked across supported EVM networks and Bitcoin address formats are detected automatically.
- `=wallet list`, `=wallet remove <address|all>` — manage saved wallets.
- `=bal` — privately DM on-chain balances for saved EVM/Bitcoin wallets.
- `=price <crypto>` — live USD and INR price for supported crypto symbols.
- `=convert <amount> <from> <to>` — convert between supported crypto assets and fiat currencies.
- `=txid <chain> <hash>` — staff-only transaction lookup on a supported chain.

UPI IDs are stored per member and server. `=listupi` only sends the caller's own ID by DM. Staff commands require the caller and bot to have **Manage Roles**, and the bot's role must be above the target. Configure role IDs in `staff-roles.json`: a dedicated `staff` role for staff-only help access; the general exchanger role; optional INR/PayPal market roles; and the break/restricted/retired/suspended status roles. A staff status command removes the member's configured exchanger roles and adds that status's dedicated role. Its matching restore command removes the status role and restores the exact exchanger roles saved when the status was applied.

Crypto price/conversion and wallet commands are available to everyone; `=txid` is restricted to members with the dedicated staff role. Price/conversion commands use CoinGecko and Frankfurter rates. On-chain wallet balance and transaction lookups use GoldRush and require `GOLDRUSH_API_KEY` in `.env` (see `.env.example`). Wallet address inference supports EVM `0x…` addresses across GoldRush's multichain EVM balance endpoint and Bitcoin mainnet address formats. EVM addresses do not encode one specific chain, so `=bal` checks the supported EVM networks together. `=txid` requires a chain name because a transaction hash alone does not identify a network.

The bot uses `.` for exchange/profile commands and `=` for assistant, UPI, and crypto commands. Help category dropdowns remain interactive.
The public help menu shows profile/stats and calculator pages to regular members. The Extra and UPI help pages are visible only to members with the dedicated `staff` role configured in `staff-roles.json`; exchanger and status roles do not grant this access.

The SQLite database is stored locally. CoinGecko and Frankfurter rates are cached for 60 seconds. Balance values are local demo values unless connected to your existing exchange account system.
