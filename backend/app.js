// Настройка CSP
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
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

// Обновляем CORS middleware
app.use((req, res, next) => {
    const allowedOrigins = ['http://morevault.space', 'https://morevault.space'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, credentials');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 часа
    }
    
    // Обработка preflight запросов
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    
    next();
});

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Маршрут для manifest.json
app.get('/tonconnect-manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/tonconnect-manifest.json'));
}); 