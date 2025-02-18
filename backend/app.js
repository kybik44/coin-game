// Настройка CSP
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self' https: 'unsafe-inline' 'unsafe-eval' data: blob:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; " +
        "style-src 'self' 'unsafe-inline' https:; " +
        "img-src 'self' data: https: http:; " +
        "font-src 'self' https: data:; " +
        "connect-src 'self' https: wss:; " +
        "worker-src 'self' blob:; " +
        "frame-src 'self' https:;"
    );
    next();
});

// CORS middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Маршрут для manifest.json
app.get('/tonconnect-manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/tonconnect-manifest.json'));
}); 