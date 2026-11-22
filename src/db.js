const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'frost.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS upi_accounts (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    upi_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS staff_role_snapshots (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    role_ids TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS crypto_wallets (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    chain TEXT NOT NULL,
    address TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id, chain)
  );
`);

for (const column of ['cashback', 'spins', 'last_spin']) {
  if (db.pragma('table_info(users)').some(({ name }) => name === column)) {
    db.exec(`ALTER TABLE users DROP COLUMN ${column}`);
  }
}

function ensureUser(user) {
  db.prepare(`INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)`).run(user.id, user.username);
  db.prepare(`UPDATE users SET username = ? WHERE id = ?`).run(user.username, user.id);
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id);
}

function addBalance(id, amount) {
  db.prepare(`UPDATE users SET balance = balance + ? WHERE id = ?`).run(amount, id);
}

function leaderboard(limit = 10) {
  return db.prepare(`SELECT * FROM users ORDER BY balance DESC LIMIT ?`).all(limit);
}

function getI2cRate() {
  return getExchangeRate('i2c');
}

function setI2cRate(value) {
  setExchangeRate('i2c', value);
}

function getExchangeRate(method) {
  const key = method.toLowerCase() === 'i2c' ? 'i2c_rate' : `exchange_rate:${method.toLowerCase()}`;
  return db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key)?.value ?? null;
}

function setExchangeRate(method, value) {
  const key = method.toLowerCase() === 'i2c' ? 'i2c_rate' : `exchange_rate:${method.toLowerCase()}`;
  db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value);
}

function getUpiId(guildId, userId) {
  return db.prepare('SELECT upi_id FROM upi_accounts WHERE guild_id = ? AND user_id = ?')
    .get(guildId, userId)?.upi_id ?? null;
}

function setUpiId(guildId, userId, upiId) {
  db.prepare(`
    INSERT INTO upi_accounts (guild_id, user_id, upi_id) VALUES (?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET upi_id = excluded.upi_id, created_at = CURRENT_TIMESTAMP
  `).run(guildId, userId, upiId);
}

function removeUpiId(guildId, userId) {
  return db.prepare('DELETE FROM upi_accounts WHERE guild_id = ? AND user_id = ?')
    .run(guildId, userId).changes > 0;
}

function getStaffRoleSnapshot(guildId, userId) {
  const row = db.prepare(`
    SELECT status, role_ids FROM staff_role_snapshots WHERE guild_id = ? AND user_id = ?
  `).get(guildId, userId);
  return row ? { status: row.status, roleIds: JSON.parse(row.role_ids) } : null;
}

function saveStaffRoleSnapshot(guildId, userId, status, roleIds) {
  db.prepare(`
    INSERT INTO staff_role_snapshots (guild_id, user_id, status, role_ids)
    VALUES (?, ?, ?, ?)
  `).run(guildId, userId, status, JSON.stringify(roleIds));
}

function removeStaffRoleSnapshot(guildId, userId) {
  db.prepare('DELETE FROM staff_role_snapshots WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
}

function getCryptoWallets(guildId, userId) {
  return db.prepare(`
    SELECT chain, address FROM crypto_wallets
    WHERE guild_id = ? AND user_id = ? ORDER BY chain
  `).all(guildId, userId);
}

function setCryptoWallet(guildId, userId, chain, address) {
  db.prepare(`
    INSERT INTO crypto_wallets (guild_id, user_id, chain, address) VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id, chain)
    DO UPDATE SET address = excluded.address, updated_at = CURRENT_TIMESTAMP
  `).run(guildId, userId, chain, address);
}

function removeCryptoWallet(guildId, userId, chain) {
  return db.prepare(`
    DELETE FROM crypto_wallets WHERE guild_id = ? AND user_id = ? AND chain = ?
  `).run(guildId, userId, chain).changes > 0;
}

function removeAllCryptoWallets(guildId, userId) {
  return db.prepare(`
    DELETE FROM crypto_wallets WHERE guild_id = ? AND user_id = ?
  `).run(guildId, userId).changes;
}

module.exports = {
  db, ensureUser, addBalance, leaderboard,
  getI2cRate, setI2cRate, getExchangeRate, setExchangeRate,
  getUpiId, setUpiId, removeUpiId,
  getStaffRoleSnapshot, saveStaffRoleSnapshot, removeStaffRoleSnapshot,
  getCryptoWallets, setCryptoWallet, removeCryptoWallet, removeAllCryptoWallets
};
