const path = require("path");
const fs = require("fs");

const isDevelopment = process.env.NODE_ENV === "development";
console.log("Current environment:", process.env.NODE_ENV);

// В режиме разработки используем локальный путь, в production — путь для Ubuntu
const dbPath = isDevelopment
  ? path.resolve(__dirname, "database.db")
  : path.resolve("/var/www/coin-game/database.db");

console.log("Database path:", dbPath);

// Проверяем права доступа
try {
  if (fs.existsSync(dbPath)) {
    fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
    console.log("Database file is readable and writable");
  } else {
    console.log("Database file does not exist, creating...");
    fs.writeFileSync(dbPath, "");
    fs.chmodSync(dbPath, "664"); // Устанавливаем права 664 (чтение/запись для владельца и группы)
  }
} catch (error) {
  console.error("Database access error:", error.message);
}

// Создаем директорию, если её нет
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log("Created database directory:", dbDir);
}

const config = {
  development: {
    port: 3000,
    baseUrl: "https://physically-ethical-pelican.ngrok-free.app",
    dbPath: dbPath,
    corsOrigin: ["http://localhost:3000"],
    protocol: "https",
    apiPrefix: "/api",
  },
  production: {
    port: 3000,
    baseUrl: "http://89.104.70.115:3000",
    dbPath: dbPath,
    corsOrigin: ["http://morevault.space", "https://morevault.space"],
    protocol: "http",
    apiPrefix: "/api",
  },
};

const currentConfig = config[isDevelopment ? "development" : "production"];

if (!currentConfig.baseUrl || !currentConfig.dbPath) {
  console.error("Invalid configuration:", currentConfig);
  process.exit(1);
}

module.exports = currentConfig;
