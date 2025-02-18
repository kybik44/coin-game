const path = require('path');
const fs = require('fs');

const isDevelopment = process.env.NODE_ENV === 'development';
console.log('Current environment:', process.env.NODE_ENV);

// В режиме разработки используем локальный путь
const dbPath = isDevelopment 
  ? path.resolve(__dirname, 'database.db')
  : path.resolve('E:', 'var', 'www', 'coin-game', 'database.db');

console.log('Database path:', dbPath);

// Создаем директорию, если её нет
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const config = {
  development: {
    port: 3000,
    baseUrl: 'https://physically-ethical-pelican.ngrok-free.app',
    dbPath: dbPath,
    corsOrigin: '*',
    protocol: 'https',
    apiPrefix: '/api'
  },
  production: {
    port: 3000,
    baseUrl: 'http://89.104.70.115:3000',
    dbPath: dbPath,
    corsOrigin: '*',
    protocol: 'http',
    apiPrefix: '/api'
  }
};

const currentConfig = config[isDevelopment ? 'development' : 'production'];

if (!currentConfig.baseUrl || !currentConfig.dbPath) {
  console.error('Invalid configuration:', currentConfig);
  process.exit(1);
}

module.exports = currentConfig; 