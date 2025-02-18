// Инициализация Telegram WebApp
const tg = window.tg || window.Telegram?.WebApp;

// Состояние приложения
const state = {
  isConnected: false,
  userGrade: "junior",
  userPosition: 0,
  totalUsers: 0,
  leaderboard: [],
};

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

// Функция для обновления отображения статистики
function updateStats(stats) {
  const { totalUsers, userPosition, userGrade } = stats;

  // Обновляем общее количество пользователей
  const usersSummary = document.querySelector(".stats-row span:last-child");
  if (usersSummary) {
    usersSummary.textContent = `${totalUsers.toLocaleString()} users`;
  }

  // Обновляем грейд пользователя
  const gradeValue = document.querySelector(".grade-value");
  if (gradeValue) {
    gradeValue.textContent = userGrade;
  }

  state.totalUsers = totalUsers;
  state.userPosition = userPosition;
  state.userGrade = userGrade;
}

// Функция для подключения TON Space
async function connectTonSpace() {
  try {
    const connectButton = document.querySelector(".connect-button");
    if (!state.isConnected) {
      connectButton.disabled = true;
      connectButton.innerHTML =
        '<div class="spinner"></div><span>Connecting...</span>';

      // Здесь будет реальная логика подключения к TON Space
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Имитация подключения

      state.isConnected = true;
      connectButton.innerHTML =
        '<img src="../../images/ton-space.svg" alt="TON Space" class="connect-icon"><span>Connected</span>';
      connectButton.classList.add("connected");

      // Запрашиваем обновленные данные
      fetchUserData();
    }
  } catch (error) {
    console.error("Error connecting to TON Space:", error);
    const connectButton = document.querySelector(".connect-button");
    connectButton.disabled = false;
    connectButton.innerHTML =
      '<img src="../../images/ton-space.svg" alt="TON Space" class="connect-icon"><span>Connect your TON Space</span>';
  }
}

// Функция для получения данных пользователя
async function fetchUserData() {
  try {
    // Получаем данные из Telegram WebApp
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    
    // Моковые данные для тестирования
    const mockData = {
      username: user?.username || 'Anonymous',
      balance: Math.floor(Math.random() * 10000), // Случайный баланс для теста
      position: Math.floor(Math.random() * 100) + 1, // Случайная позиция
      grade: 'junior',
      total_users: 18042
    };

    // Обновляем текст на странице
    const usersSummary = document.querySelector(".stats-row span:last-child");
    if (usersSummary) {
      usersSummary.textContent = `${mockData.total_users.toLocaleString()} users`;
    }

    // Обновляем информацию о текущем пользователе
    const currentUserName = document.getElementById("current-user-name");
    const currentUserBalance = document.getElementById("current-user-balance");
    const currentUserPosition = document.getElementById("current-user-position");
    const currentUserAvatar = document.getElementById("current-user-avatar");

    if (currentUserName) {
      currentUserName.textContent = mockData.username;
    }

    if (currentUserBalance) {
      currentUserBalance.textContent = `${mockData.balance.toLocaleString()} VAI`;
    }

    if (currentUserPosition) {
      currentUserPosition.textContent = `#${mockData.position}`;
    }

    if (currentUserAvatar) {
      currentUserAvatar.src = user?.photo_url || "../../images/anonym.png";
    }

    // Обновляем статистику
    updateStats({
      totalUsers: mockData.total_users,
      userPosition: mockData.position,
      userGrade: mockData.grade
    });

    return mockData;
  } catch (error) {
    console.error("Error in fetchUserData:", error);
    return null;
  }
}

// Функция для получения и установки аватара пользователя
async function setUserAvatar() {
  const avatarContainer = document.querySelector(
    ".stats-container:not(:first-of-type) .user-avatar"
  );
  const defaultAvatar = "../../images/anonym.png";

  try {
    const user = window.Telegram.WebApp.initDataUnsafe.user;
    console.log("Telegram user data:", user);

    if (user && user.photo_url) {
      // Создаем элемент img вместо установки background-image
      const img = document.createElement("img");
      img.src = user.photo_url;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";

      // Очищаем контейнер и добавляем изображение
      avatarContainer.innerHTML = "";
      avatarContainer.appendChild(img);
    } else {
      // Для дефолтной аватарки делаем то же самое
      const img = document.createElement("img");
      img.src = defaultAvatar;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";

      avatarContainer.innerHTML = "";
      avatarContainer.appendChild(img);
    }
  } catch (error) {
    console.error("Error setting user avatar:", error);
    // В случае ошибки тоже используем img
    const img = document.createElement("img");
    img.src = defaultAvatar;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";

    avatarContainer.innerHTML = "";
    avatarContainer.appendChild(img);
  }
}

// Функции для работы с модальным окном
function showWalletModal() {
  const modal = document.getElementById("walletModal");
  const modalSheet = modal.querySelector(".modal-bottom-sheet");
  modal.style.display = "block";
  requestAnimationFrame(() => {
    modalSheet.classList.add("show");
  });
  document.body.style.overflow = "hidden";
}

function hideWalletModal() {
  const modal = document.getElementById("walletModal");
  const modalSheet = modal.querySelector(".modal-bottom-sheet");
  modalSheet.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
    document.body.style.overflow = "";
  }, 300);
}

// Функция для обновления данных текущего пользователя
async function updateCurrentUserData() {
  try {
    // Получаем данные пользователя из Telegram WebApp
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!user) {
      throw new Error("User data not available");
    }
    console.log("[User Data] Telegram user:", user);

    // Обновляем аватар
    const avatarElement = document.getElementById("current-user-avatar");
    if (avatarElement) {
      avatarElement.src = user.photo_url || "../../images/anonym.png";
      avatarElement.alt = user.username || "User Avatar";
    }

    // Обновляем имя пользователя
    const nameElement = document.getElementById("current-user-name");
    if (nameElement) {
      nameElement.textContent =
        user.username ||
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        "VAI's user";
    }

    // Проверяем наличие BalanceManager
    console.log("[Balance] BalanceManager exists:", !!window.BalanceManager);
    
    // Обновляем баланс через BalanceManager
    const balanceElement = document.getElementById("current-user-balance");
    if (balanceElement) {
      if (!window.BalanceManager) {
        console.error("[Balance] BalanceManager not found");
        balanceElement.textContent = "0 VAI";
      } else {
        try {
          console.log("[Balance] Fetching balance for user:", user.id);
          const balance = await window.BalanceManager.fetchBalance(user.id);
          console.log("[Balance] Received balance:", balance);
          balanceElement.textContent = `${balance.toLocaleString()} VAI`;
        } catch (balanceError) {
          console.error("[Balance] Error fetching balance:", balanceError);
          balanceElement.textContent = "0 VAI";
        }
      }
    }

    // Получаем позицию пользователя
    const positionResponse = await fetch(
      `${API_CONFIG.BASE_URL}/api/users/position/${user.id}`
    );
    console.log("[Position] Response status:", positionResponse.status);

    if (!positionResponse.ok) {
      throw new Error(`Failed to fetch position: ${positionResponse.status}`);
    }

    const positionData = await positionResponse.json();
    console.log("[Position] Data:", positionData);

    const positionElement = document.getElementById("current-user-position");
    if (positionElement) {
      if (positionData && typeof positionData.position === "number") {
        positionElement.textContent = `#${(
          18042 - positionData.position
        ).toLocaleString()}`;
      } else {
        positionElement.textContent = "#--";
        console.error("Invalid position data received:", positionData);
      }
    }

    // Обновляем отображение общего количества пользователей
    const usersSummary = document.querySelector(".users-count");
    if (usersSummary && positionData.total) {
      usersSummary.textContent = `${positionData.total.toLocaleString()} users`;
    }

    // Обновляем статистику
    updateStats({
      totalUsers: positionData.total || 18042,
      userPosition: positionData.position || 0,
      userGrade: "junior"
    });

  } catch (error) {
    console.error("Error updating current user data:", error);
    // Устанавливаем запасные значения при ошибке
    const elements = {
      "current-user-name": "Anonymous",
      "current-user-balance": "0 VAI",
      "current-user-position": "#--"
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
  }
}

// Функция для обновления лидерборда
async function updateLeaderboard() {
  try {
    // Используем правильный URL для получения лидерборда
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/leaderboard`);
    
    console.log("[Leaderboard] Response status:", response.status);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("[Leaderboard] Data:", data);

    const leaderboardContainer = document.querySelector(".leaderboard-container");
    if (!leaderboardContainer) return;

    // Очищаем текущий лидерборд
    leaderboardContainer.innerHTML = "";

    // Добавляем новые элементы
    data.leaderboard.forEach((user) => {
      const positionText =
        user.position === 1
          ? "Leader"
          : user.position === 2
          ? "Second"
          : user.position === 3
          ? "Third"
          : user.position === 4
          ? "Fourth"
          : `#${user.position}`;

      const userElement = `
        <div class="leaderboard-item">
          <div class="user-info">
            <div class="user-avatar">
              <img src="../../images/anonym.png" alt="${user.username}">
            </div>
            <div class="user-details">
              <span class="user-name">${user.username}</span>
              <span class="user-balance">${user.balance.toLocaleString()} VAI</span>
            </div>
          </div>
          <span class="user-position">${positionText}</span>
        </div>
      `;

      leaderboardContainer.insertAdjacentHTML("beforeend", userElement);
    });
  } catch (error) {
    console.error("Error updating leaderboard:", error);
    // В случае ошибки показываем сообщение пользователю
    const leaderboardContainer = document.querySelector(".leaderboard-container");
    if (leaderboardContainer) {
      leaderboardContainer.innerHTML = `
        <div class="error-message">
          Unable to load leaderboard. Please try again later.
        </div>
      `;
    }
  }
}

// Обновляем инициализацию страницы
document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("[Init] Starting initialization...");
    
    // Инициализируем Telegram WebApp
    await TelegramManager.init();
    console.log("[Init] TelegramManager initialized");
    
    // Проверяем наличие BalanceManager
    if (!window.BalanceManager) {
      console.error("[Init] BalanceManager not found");
    } else {
      // Инициализируем BalanceManager
      await window.BalanceManager.initialize();
      console.log("[Init] BalanceManager initialized");
    }
    
    // Обновляем данные пользователя
    await updateCurrentUserData();
    
    // Обновляем лидерборд
    await updateLeaderboard();
  } catch (error) {
    console.error("[Init] Error initializing page:", error);
  }
});

// Обновляем данные каждые 30 секунд
setInterval(async () => {
  try {
    await updateCurrentUserData();
    await updateLeaderboard();
  } catch (error) {
    console.error("Error updating data:", error);
  }
}, 30000);

// В конце скрипта добавим:
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      const modalContainer = document.querySelector(
        '[data-tc-wallets-modal-container="true"]'
      );
      const widgetRoot = document.getElementById("tc-widget-root");

      if (modalContainer && widgetRoot) {
        widgetRoot.classList.add("active");
      } else if (widgetRoot) {
        widgetRoot.classList.remove("active");
      }
    }
  });
});

// Начинаем наблюдение за изменениями в DOM
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
