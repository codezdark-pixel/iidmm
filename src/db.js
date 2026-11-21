const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(process.cwd(), 'frost.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    cashback REAL NOT NULL DEFAULT 0,
    spins INTEGER NOT NULL DEFAULT 0,
    last_spin TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

function ensureUser(user) {
  db.prepare(`INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)`).run(user.id, user.username);
  db.prepare(`UPDATE users SET username = ? WHERE id = ?`).run(user.username, user.id);
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id);
}

function addCashback(id, amount) {
  db.prepare(`UPDATE users SET cashback = cashback + ? WHERE id = ?`).run(amount, id);
}

function addBalance(id, amount) {
  db.prepare(`UPDATE users SET balance = balance + ? WHERE id = ?`).run(amount, id);
}

function addSpins(id, amount) {
  db.prepare(`UPDATE users SET spins = spins + ? WHERE id = ?`).run(amount, id);
}

function redeemSpins(id) {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  if (!user || user.spins < 1) return null;
  db.prepare(`UPDATE users SET spins = spins - 1, balance = balance + 100 WHERE id = ?`).run(id);
  return 100;
}

function leaderboard(limit = 10) {
  return db.prepare(`SELECT * FROM users ORDER BY balance DESC, cashback DESC LIMIT ?`).all(limit);
}

module.exports = { db, ensureUser, addCashback, addBalance, addSpins, redeemSpins, leaderboard };
