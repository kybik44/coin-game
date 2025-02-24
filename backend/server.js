const express = require("express");
const cors = require("cors");
const path = require("path");
const { initializeDatabase } = require("./setupDb");
const config = require("./config");
const apiRoutes = require("./routes/api");

const startTime = Date.now();
let db;

async function startServer() {
  try {
    db = await initializeDatabase();
    console.log("Database initialized");

    const app = express();

    // Логирование всех входящих запросов для отладки
    app.use((req, res, next) => {
      console.log(`[${req.method}] ${req.url} - Headers:`, req.headers);
      next();
    });

    // Настройка CORS (применяется до всех маршрутов)
    app.use(
      cors({
        origin: ["http://morevault.space", "https://morevault.space"],
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "credentials",
          "Cache-Control",
        ],
        credentials: true,
        preflightContinue: false,
        optionsSuccessStatus: 200,
      })
    );

    // Логирование ответа на preflight запросы
    app.options("*", (req, res) => {
      console.log("Preflight response headers:", res.getHeaders());
      res.status(200).end();
    });

    app.use(express.json());

    // Мониторинг производительности каждого запроса
    app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${duration}ms`);
        if (duration > 1000) {
          console.warn(
            `Slow request: ${req.method} ${req.url} - ${duration}ms`
          );
        }
      });
      next();
    });

    // Периодический мониторинг использования памяти
    setInterval(() => {
      const used = process.memoryUsage();
      console.log({
        timestamp: new Date().toISOString(),
        rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
        uptime: `${Math.round((Date.now() - startTime) / 1000 / 60)}min`,
      });
    }, 60000);

    // Обновленный CSP middleware
    app.use((req, res, next) => {
      const csp = {
        "default-src": [
          "'self'",
          "https:",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "data:",
          "blob:",
        ],
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https:",
          "data:",
          "blob:",
          "https://telegram.org",
          "https://fonts.googleapis.com",
        ],
        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "https:",
          "https://fonts.googleapis.com",
          "https://fonts.gstatic.com",
        ],
        "font-src": ["'self'", "https:", "data:", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "https:", "http:", "blob:"],
        "connect-src": [
          "'self'",
          "https:",
          "wss:",
          "http://89.104.70.115:3000",
        ],
        "worker-src": ["'self'", "blob:"],
        "frame-src": ["'self'", "https:", "http://89.104.70.115:3000"],
      };

      const cspString = Object.entries(csp)
        .map(([key, values]) => `${key} ${values.join(" ")}`)
        .join("; ");

      res.setHeader("Content-Security-Policy", cspString);
      next();
    });

    // Кэширование статических файлов
    const staticOptions = {
      maxAge: "1d",
      etag: true,
      lastModified: true,
    };

    app.use(express.static(path.join(__dirname, "../frontend"), staticOptions));
    app.use(
      "/shared",
      express.static(path.join(__dirname, "../frontend/shared"), staticOptions)
    );
    app.use(
      "/screens",
      express.static(path.join(__dirname, "../frontend/screens"), staticOptions)
    );
    app.use(
      "/images",
      express.static(path.join(__dirname, "../frontend/images"), staticOptions)
    );

    app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "../frontend/index.html"));
    });

    app.get("/tonconnect-manifest.json", (req, res) => {
      res.sendFile(
        path.join(__dirname, "../frontend/public/tonconnect-manifest.json")
      );
    });

    // Оптимизированная настройка MIME типов
    app.use((req, res, next) => {
      const ext = path.extname(req.path).toLowerCase();
      const mimeTypes = {
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
      };
      if (mimeTypes[ext]) {
        res.type(mimeTypes[ext]);
      }
      next();
    });

    // Кэш-контроль для API
    app.use((req, res, next) => {
      if (req.path.startsWith("/api/")) {
        res.set("Cache-Control", "no-store");
      }
      next();
    });

    app.use("/api", apiRoutes);

    // Обработка ошибок с детальным логированием
    app.use((err, req, res, next) => {
      console.error("Server error:", {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        error: "Internal server error",
        details: err.message,
        path: req.path,
      });
    });

    const server = app.listen(config.port, "0.0.0.0", () => {
      console.log(
        `Server running in ${process.env.NODE_ENV || "production"} mode`
      );
      console.log(`Server URL: ${config.baseUrl}`);
      console.log(`Local URL: http://localhost:${config.port}`);
    });

    // Обработка graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM signal received: closing HTTP server");
      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
module.exports = { db };
