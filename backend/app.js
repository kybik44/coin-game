const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Настройка CSP
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' https: 'unsafe-inline' 'unsafe-eval' data: blob:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; " +
      "style-src 'self' 'unsafe-inline' https: fonts.googleapis.com; " +
      "font-src 'self' https: fonts.gstatic.com data:; " +
      "img-src 'self' data: https: http:; " +
      "connect-src 'self' https: wss: http://89.104.70.115:3000; " +
      "worker-src 'self' blob:; " +
      "frame-src 'self' https:;"
  );
  next();
});

// Настройка CORS (единственная настройка через пакет cors)
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
  })
);

// Статические файлы
app.use(express.static(path.join(__dirname, "public")));

// Маршрут для manifest.json
app.get("/tonconnect-manifest.json", (req, res) => {
  res.sendFile(path.join(__dirname, "public/tonconnect-manifest.json"));
});

module.exports = app;
