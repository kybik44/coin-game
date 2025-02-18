const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const config = require("./config");

// Используем путь из конфига
const dbPath = config.dbPath;
console.log("Database path:", dbPath);

// Проверяем и создаем директорию
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  console.log("Creating database directory...");
  fs.mkdirSync(dbDir, { recursive: true });
}

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    console.log("[Setup] Creating database at:", dbPath);
    
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("[Setup] Error opening database:", err);
        reject(err);
        return;
      }

      console.log("[Setup] Database opened successfully");

      // Оборачиваем операции с БД в промисы
      const runAsync = (sql) => new Promise((resolve, reject) => {
        db.run(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const allAsync = (sql) => new Promise((resolve, reject) => {
        db.all(sql, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Последовательно создаем таблицы и выполняем миграции
      runAsync('PRAGMA foreign_keys = ON')
        .then(() => runAsync(`
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
        `))
        .then(() => {
          // Проверяем существование столбца stories_shown
          return allAsync(`PRAGMA table_info(users)`).then(columns => {
            const hasStoriesShown = columns.some(col => col.name === 'stories_shown');
            if (!hasStoriesShown) {
              console.log("[Setup] Adding stories_shown column");
              return runAsync(`
                ALTER TABLE users 
                ADD COLUMN stories_shown INTEGER DEFAULT 0
              `);
            }
            return Promise.resolve();
          });
        })
        .then(() => runAsync(`
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
        `))
        .then(() => runAsync(`
          CREATE TABLE IF NOT EXISTS completed_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            task_type TEXT NOT NULL,
            completed_at INTEGER NOT NULL,
            reward INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(telegram_id),
            UNIQUE(user_id, task_type)
          )
        `))
        .then(() => allAsync("SELECT name FROM sqlite_master WHERE type='table'"))
        .then(tables => {
          console.log("[Setup] Created tables:", tables);
          return allAsync("SELECT * FROM users");
        })
        .then(users => {
          console.log("[Setup] Existing users:", users);
          resolve(db);
        })
        .catch(error => {
          console.error("[Setup] Error during initialization:", error);
          reject(error);
        });
    });
  });
}

module.exports = { initializeDatabase };
