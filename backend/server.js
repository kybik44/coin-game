const express = require("express");
const cors = require("cors");
const path = require("path");
const { initializeDatabase } = require("./setupDb");
const config = require("./config");
const apiRoutes = require("./routes/api");

let db; // Глобальная переменная для доступа к БД

async function startServer() {
  try {
    // Инициализируем базу данных
    db = await initializeDatabase();
    console.log("Database initialized");

    const app = express();

    // Middleware
    app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    app.use(express.json());

    // Обновляем CSP middleware
    app.use((req, res, next) => {
      const csp = {
        'default-src': ["'self'", 'http://89.104.70.115:3000', 'data:', 'blob:'],
        'script-src': [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'http://89.104.70.115:3000',
          'https://telegram.org',
          'https://cdn.jsdelivr.net'
        ],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'http://89.104.70.115:3000', 'https:'],
        'connect-src': ["'self'", 'http://89.104.70.115:3000', 'wss:'],
        'worker-src': ["'self'", 'blob:'],
        'frame-src': ["'self'", 'http://89.104.70.115:3000']
      };

      const cspString = Object.entries(csp)
        .map(([key, values]) => `${key} ${values.join(' ')}`)
        .join('; ');

      res.setHeader('Content-Security-Policy', cspString);
      next();
    });

    // Логирование запросов
    app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      next();
    });

    // Статические файлы
    app.use(express.static(path.join(__dirname, '../frontend')));
    app.use('/shared', express.static(path.join(__dirname, '../frontend/shared')));
    app.use('/screens', express.static(path.join(__dirname, '../frontend/screens')));
    app.use('/images', express.static(path.join(__dirname, '../frontend/images')));

    // Корневой маршрут
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/index.html'));
    });

    // Маршрут для manifest.json
    app.get("/tonconnect-manifest.json", (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/public/tonconnect-manifest.json'));
    });

    // Единый middleware для логирования
    app.use((req, res, next) => {
      console.log("Request URL:", req.url);
      console.log("Request path:", req.path);
      console.log("Content-Type:", res.get("Content-Type"));
      next();
    });

    // Настройка MIME типов
    app.use((req, res, next) => {
      if (req.path.endsWith(".js")) {
        res.type("application/javascript");
      } else if (req.path.endsWith(".css")) {
        res.type("text/css");
      }
      next();
    });

    // Add cache control middleware
    app.use((req, res, next) => {
      if (req.path.startsWith("/api/")) {
        res.set("Cache-Control", "no-store");
      }
      next();
    });

    // Подключаем API роуты
    app.use("/api", apiRoutes);

    // Обработка несуществующих маршрутов
    app.use((req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/index.html'));
    });

    // Add error handling middleware
    app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({
        error: 'Internal server error',
        details: err.message,
        path: req.path
      });
    });

    // Запускаем сервер
    app.listen(config.port, "0.0.0.0", () => {
      console.log(`Server running in ${process.env.NODE_ENV || "production"} mode`);
      console.log(`Server URL: ${config.baseUrl}`);
      console.log(`Local URL: http://localhost:${config.port}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Запускаем сервер
startServer();

// Экспортируем db для использования в routes
module.exports = { db };
