// В начале файла добавим проверку загрузки
console.log("Loading BalanceManager...");

// Оставляем только один BalanceManager
const BalanceManager = {
  currentBalance: 0,
  userId: null,
  updateInterval: null,
  lastClaimTime: 0,
  lastUpdateTime: 0,
  BASE_URL: window.location.hostname.includes("ngrok-free.app")
    ? "https://physically-ethical-pelican.ngrok-free.app"
    : "http://89.104.70.115:3000",

  // Получение баланса с сервера
  async fetchBalance(userId) {
    try {
      if (!userId) {
        throw new Error("No userId provided to fetchBalance");
      }

      console.log("Fetching balance for user:", userId);
      const url = `${this.BASE_URL}/api/balance/${userId}`;
      console.log("Fetching from URL:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        mode: "cors",
        credentials: "include",
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers));

      const responseText = await response.text();
      console.log("Raw response:", responseText);

      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error("Failed to parse response:", e);
        throw new Error("Invalid response format");
      }

      console.log("Parsed balance data:", data);

      if (!data || typeof data.balance !== "number") {
        console.error("Invalid balance data received:", data);
        // Используем значение по умолчанию
        this.currentBalance = 1000;
        this.lastClaimTime = 0;
      } else {
        this.currentBalance = data.balance;
        this.lastClaimTime = data.lastClaimTime || 0;
      }

      this.updateBalanceDisplay();
      return this.currentBalance;
    } catch (error) {
      console.error("Error fetching balance:", error);
      // В случае ошибки используем значение по умолчанию
      this.currentBalance = 1000;
      this.lastClaimTime = 0;
      this.updateBalanceDisplay();
      throw error;
    }
  },

  // Обновление отображения баланса на всех экранах
  updateBalanceDisplay() {
    const elements = document.querySelectorAll(
      ".balance-amount, #coin-count, .balanceAmount"
    );
    elements.forEach((element) => {
      if (element) {
        element.textContent = this.formatBalance(this.currentBalance);
      }
    });
  },

  // Форматирование баланса
  formatBalance(balance) {
    return Number(balance).toLocaleString("en-US");
  },

  // Инициализация баланса при загрузке страницы
  async init(userId) {
    if (!userId) {
      throw new Error("No userId provided to init");
    }

    console.log("Initializing balance manager for user:", userId);

    // Очищаем предыдущий интервал если есть
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.userId = userId;

    try {
      // Получаем начальный баланс
      await this.fetchBalance(userId);

      // Обновляем баланс каждые 30 секунд
      this.updateInterval = setInterval(() => {
        this.fetchBalance(userId).catch(console.error);
      }, 30000);

      return true;
    } catch (error) {
      console.error("Failed to initialize BalanceManager:", error);
      // Даже в случае ошибки инициализируем с дефолтными значениями
      this.currentBalance = 1000;
      this.lastClaimTime = 0;
      this.updateBalanceDisplay();
      return true;
    }
  },

  // Очистка при уходе со страницы
  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.currentBalance = 0;
    this.userId = null;
    this.lastClaimTime = 0;
  },

  async initialize() {
    try {
      const userId = TelegramManager.getUserId();
      if (!userId) {
        throw new Error("User ID not available");
      }

      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/balance/${userId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch balance");
      }

      const data = await response.json();
      this.currentBalance = data.balance;
      this.lastUpdateTime = Date.now();

      this.updateBalanceDisplay();
      return true;
    } catch (error) {
      console.error("Balance initialization error:", error);
      return false;
    }
  },

  async update() {
    await this.initialize();
  },
};

// Присваиваем BalanceManager к window
window.BalanceManager = BalanceManager;

// Проверяем, что BalanceManager корректно инициализирован
console.log("BalanceManager initialized:", {
  hasObject: !!window.BalanceManager,
  hasFetchBalance: typeof window.BalanceManager?.fetchBalance === "function",
  methods: Object.keys(window.BalanceManager || {}),
});

// Очистка при уходе со страницы
window.addEventListener("unload", () => {
  if (window.BalanceManager) {
    window.BalanceManager.cleanup();
  }
});
