// Немедленно логируем доступность Telegram WebApp
console.log("Script loaded, checking Telegram WebApp...");
console.log("window.Telegram:", !!window.Telegram);
console.log("window.Telegram?.WebApp:", !!window.Telegram?.WebApp);

// В начале файла добавим проверку
console.log("Checking BalanceManager availability:", !!window.BalanceManager?.fetchBalance);

// В начале файла после проверки Telegram WebApp
console.log("Checking BalanceManager:", {
  exists: !!window.BalanceManager,
  hasFetchBalance: typeof window.BalanceManager?.fetchBalance === 'function',
  methods: Object.keys(window.BalanceManager || {})
});

// Ждем загрузки Telegram WebApp
function waitForTelegram(maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      console.log(`Attempt ${attempts + 1} to get Telegram WebApp`);

      if (window.Telegram?.WebApp) {
        console.log("Telegram WebApp found!");
        resolve(window.Telegram.WebApp);
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        reject(
          new Error("Telegram WebApp not available after maximum attempts")
        );
        return;
      }

      setTimeout(check, 500);
    };

    check();
  });
}

// Глобальные переменные
let tg = null;
const API_BASE_URL = window.location.hostname.includes('ngrok-free.app')
  ? 'https://physically-ethical-pelican.ngrok-free.app'
  : 'http://89.104.70.115:3000';

// Функция для скрытия прелоадера
function hidePreloader() {
  const preloader = document.getElementById("preloader");
  const mainContainer = document.getElementById("main-container");

  if (preloader) {
    preloader.style.display = "none";
  }
  if (mainContainer) {
    mainContainer.classList.remove("hidden");
  }
}

// Функция обновления баланса
async function updateBalance() {
  try {
    if (!window.BalanceManager) {
      console.error("BalanceManager not available");
      return;
    }

    const userId = TelegramManager.getUserId();
    if (!userId) {
      console.error("User ID not available");
      return;
    }

    await window.BalanceManager.fetchBalance(userId);
    
    // Запускаем периодическое обновление
    if (!window.balanceUpdateInterval) {
      window.balanceUpdateInterval = setInterval(() => {
        window.BalanceManager.fetchBalance(userId);
      }, 30000);
    }
  } catch (error) {
    console.error("Error updating balance:", error);
  }
}

// Функция для обработки клика на шар
async function handleBalloonClick() {
  try {
    const userId = TelegramManager.getUserId();
    if (!userId) {
      console.error("User ID not available");
      return;
    }

    // Блокируем кнопку на время запроса
    const balloon = document.querySelector(".balloon");
    if (balloon) {
      balloon.disabled = true;
      balloon.classList.remove("balloon-closed");
      balloon.classList.add("balloon-open");
    }

    const response = await fetch(`${API_BASE_URL}/api/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId.toString() })
    });

    const data = await response.json();
    
    if (response.ok) {
      // Обновляем баланс после успешного клейма
      await updateBalance();

      // Показываем сообщение об успехе
      window.Telegram.WebApp.showPopup({
        message: `You received ${data.reward} VAI!`,
        buttons: [{ type: 'ok' }]
      });

      // Возвращаем исходное состояние через 2 секунды
      setTimeout(() => {
        if (balloon) {
          balloon.classList.remove("balloon-open");
          balloon.classList.add("balloon-closed");
          balloon.disabled = false;
        }
      }, 2000);

      // Запускаем таймер
      if (data.nextClaimTime) {
        startTimer(data.nextClaimTime);
      }
    } else {
      throw new Error(data.error || "Failed to claim");
    }
  } catch (error) {
    console.error("Error claiming:", error);
    window.Telegram.WebApp.showPopup({
      message: error.message || "Error collecting coins",
      buttons: [{ type: 'ok' }]
    });
    
    // В случае ошибки также возвращаем исходное состояние
    const balloon = document.querySelector(".balloon");
    if (balloon) {
      balloon.classList.remove("balloon-open");
      balloon.classList.add("balloon-closed");
      balloon.disabled = false;
    }
  }
}

// Функция обновления таймера
async function updateTimer() {
  try {
    const userId = tg?.initDataUnsafe?.user?.id;
    if (!userId) {
      console.error("User ID not available");
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/next-claim/${userId}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get next claim time');
    }

    // Обновляем состояние кнопки клейма
    const balloon = document.querySelector(".balloon");
    if (balloon) {
      balloon.disabled = !data.canClaim;
      balloon.classList.toggle("disabled", !data.canClaim);
    }

    startTimer(data.nextClaimTime);
  } catch (error) {
    console.error("Error updating timer:", error);
  }
}

// Функция запуска таймера
function startTimer(nextClaimTime) {
  const timerElement = document.getElementById("timer");
  if (!timerElement) return;

  // Очищаем предыдущий интервал если есть
  if (window.timerInterval) {
    clearInterval(window.timerInterval);
  }

  const updateDisplay = () => {
    const now = Date.now();
    const timeLeft = Math.max(0, nextClaimTime - now);

    if (timeLeft <= 0) {
      timerElement.textContent = "00:00:00";
      clearInterval(window.timerInterval);
      
      // Разблокируем кнопку клейма
      const balloon = document.querySelector(".balloon");
      if (balloon) {
        balloon.disabled = false;
        balloon.classList.remove("disabled");
      }
      return;
    }

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    timerElement.textContent = 
      `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  updateDisplay();
  window.timerInterval = setInterval(updateDisplay, 1000);

  // Сохраняем время следующего клейма в localStorage
  localStorage.setItem('nextClaimTime', nextClaimTime.toString());
}

// Функция для добавления обработчика клика на шар
function addBalloonClickHandler() {
    const balloon = document.querySelector(".balloon");
    if (balloon) {
        console.log("Adding click handler to balloon");
        balloon.addEventListener("click", handleBalloonClick);
    }
}

// Функция инициализации таймера
async function initializeTimer() {
  try {
    const userId = TelegramManager.getUserId();
    if (!userId) {
      console.error("User ID not available");
      return;
    }

    // Получаем время следующего клейма с сервера
    const response = await fetch(`${API_BASE_URL}/api/next-claim/${userId}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get next claim time');
    }

    // Обновляем состояние кнопки клейма
    const balloon = document.querySelector(".balloon");
    if (balloon) {
      balloon.disabled = !data.canClaim;
      balloon.classList.toggle("disabled", !data.canClaim);
    }

    // Запускаем таймер если есть ожидание
    if (data.timeLeft > 0) {
      startTimer(data.nextClaimTime);
    }
  } catch (error) {
    console.error("Error initializing timer:", error);
  }
}

// Обновляем инициализацию страницы
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded event fired");
  
  try {
    // Проверяем доступность Telegram WebApp
    let attempt = 1;
    while (!window.Telegram?.WebApp && attempt <= 3) {
      console.log(`Attempt ${attempt} to get Telegram WebApp`);
      await new Promise(resolve => setTimeout(resolve, 500));
      attempt++;
    }

    if (!window.Telegram?.WebApp) {
      throw new Error("Telegram WebApp not available");
    }

    // Инициализируем Telegram
    if (!await TelegramManager.init()) {
      throw new Error("Failed to initialize TelegramManager");
    }

    // Запускаем обновление баланса
    await updateBalance();

    // Инициализируем таймер
    await initializeTimer();

    // Добавляем обработчик клика на шар
    const balloon = document.querySelector(".balloon");
    if (balloon) {
      balloon.addEventListener("click", handleBalloonClick);
    }

  } catch (error) {
    console.error("Initialization error:", error);
  }
});

// Добавляем обработчик ошибок
window.onerror = function (msg, url, line, col, error) {
  console.error("Global error:", {
    message: msg,
    url: url,
    line: line,
    column: col,
    error: error,
  });
  return false;
};

// Очистка при уходе со страницы
window.addEventListener("unload", () => {
  if (window.timerInterval) {
    clearInterval(window.timerInterval);
  }
  if (window.balanceUpdateInterval) {
    clearInterval(window.balanceUpdateInterval);
  }
});
