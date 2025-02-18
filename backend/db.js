const sqlite3 = require("sqlite3").verbose();
const config = require("./config");
const path = require("path");
const fs = require("fs");

// Ensure database directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Создаем промис-обертки для операций с БД
const dbAsync = {
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          console.error("[DB] Query error:", err);
          reject(err);
        } else {
          console.log("[DB] Query result:", row);
          resolve(row);
        }
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error("[DB] Error:", err);
          reject(err);
        } else {
          console.log("[DB] Results:", rows);
          resolve(rows);
        }
      });
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) {
          console.error("[DB] Error:", err);
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }
};

// Инициализируем базу данных
const db = new sqlite3.Database(config.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

// Создаем таблицы при первом запуске
async function initializeTables() {
  try {
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        photo_url TEXT,
        balance INTEGER DEFAULT 1000,
        joined_date INTEGER,
        last_claim_time INTEGER,
        wallet_address TEXT,
        wallet_connected_at INTEGER,
        referrer_id TEXT,
        FOREIGN KEY (referrer_id) REFERENCES users(telegram_id)
      )
    `);

    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS referrals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        referrer_id TEXT NOT NULL,
        referred_id TEXT NOT NULL,
        joined_date INTEGER NOT NULL,
        referrer_reward INTEGER DEFAULT 1000,
        referred_reward INTEGER DEFAULT 1000,
        FOREIGN KEY (referrer_id) REFERENCES users(telegram_id),
        FOREIGN KEY (referred_id) REFERENCES users(telegram_id),
        UNIQUE(referred_id)
      )
    `);

    return true;
  } catch (error) {
    console.error("Error initializing tables:", error);
    return false;
  }
}

// Инициализируем таблицы перед экспортом
initializeTables().then(() => {
  console.log("Database tables initialized successfully");
}).catch(error => {
  console.error("Failed to initialize database tables:", error);
  process.exit(1);
});

module.exports = dbAsync;
