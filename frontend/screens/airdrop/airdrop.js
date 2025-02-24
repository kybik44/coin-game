// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;

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

  const usersSummary = document.querySelector(".stats-row span:last-child");
  if (usersSummary) {
    usersSummary.textContent = `${totalUsers.toLocaleString()} users`;
  }

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

      await new Promise((resolve) => setTimeout(resolve, 1500)); // Имитация подключения

      state.isConnected = true;
      connectButton.innerHTML =
        '<img src="../../images/ton-space.svg" alt="TON Space" class="connect-icon"><span>Connected</span>';
      connectButton.classList.add("connected");

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
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;

    const mockData = {
      username: user?.username || "Anonymous",
      balance: Math.floor(Math.random() * 10000),
      position: Math.floor(Math.random() * 100) + 1,
      grade: "junior",
      total_users: 18042,
    };

    const usersSummary = document.querySelector(".stats-row span:last-child");
    if (usersSummary) {
      usersSummary.textContent = `${mockData.total_users.toLocaleString()} users`;
    }

    const currentUserName = document.getElementById("current-user-name");
    const currentUserBalance = document.getElementById("current-user-balance");
    const currentUserPosition = document.getElementById(
      "current-user-position"
    );
    const currentUserAvatar = document.getElementById("current-user-avatar");

    if (currentUserName) currentUserName.textContent = mockData.username;
    if (currentUserBalance)
      currentUserBalance.textContent = `${mockData.balance.toLocaleString()} VAI`;
    if (currentUserPosition)
      currentUserPosition.textContent = `#${mockData.position}`;
    if (currentUserAvatar)
      currentUserAvatar.src = user?.photo_url || "../../images/anonym.png";

    updateStats({
      totalUsers: mockData.total_users,
      userPosition: mockData.position,
      userGrade: mockData.grade,
    });

    return mockData;
  } catch (error) {
    console.error("Error in fetchUserData:", error);
    return null;
  }
}

// Функция для установки аватара пользователя
async function setUserAvatar() {
  const avatarContainer = document.querySelector(
    ".stats-container:not(:first-of-type) .user-avatar"
  );
  const defaultAvatar = "../../images/anonym.png";

  try {
    const user = window.Telegram.WebApp.initDataUnsafe.user;
    console.log("Telegram user data:", user);

    const img = document.createElement("img");
    img.src = user?.photo_url || defaultAvatar;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";

    if (avatarContainer) {
      avatarContainer.innerHTML = "";
      avatarContainer.appendChild(img);
    }
  } catch (error) {
    console.error("Error setting user avatar:", error);
    const img = document.createElement("img");
    img.src = defaultAvatar;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";

    if (avatarContainer) {
      avatarContainer.innerHTML = "";
      avatarContainer.appendChild(img);
    }
  }
}

// Функции для работы с модальным окном
function showWalletModal() {
  const modal = document.getElementById("walletModal");
  const modalSheet = modal.querySelector(".modal-bottom-sheet");
  if (modal) {
    modal.style.display = "block";
    requestAnimationFrame(() => {
      modalSheet.classList.add("show");
    });
    document.body.style.overflow = "hidden";
  }
}

function hideWalletModal() {
  const modal = document.getElementById("walletModal");
  const modalSheet = modal.querySelector(".modal-bottom-sheet");
  if (modal) {
    modalSheet.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
      document.body.style.overflow = "";
    }, 300);
  }
}

// Функция для обновления данных текущего пользователя
async function updateCurrentUserData() {
  try {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!user) throw new Error("User data not available");
    console.log("[User Data] Telegram user:", user);

    const avatarElement = document.getElementById("current-user-avatar");
    if (avatarElement) {
      avatarElement.src = user.photo_url || "../../images/anonym.png";
      avatarElement.alt = user.username || "User Avatar";
    }

    const nameElement = document.getElementById("current-user-name");
    if (nameElement) {
      nameElement.textContent =
        user.username ||
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        "VAI's user";
    }

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

    const positionResponse = await fetch(
      `${API_CONFIG.BASE_URL}/api/users/position/${user.id}`
    );
    console.log("[Position] Response status:", positionResponse.status);

    if (!positionResponse.ok)
      throw new Error(`Failed to fetch position: ${positionResponse.status}`);

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

    const usersSummary = document.querySelector(".users-count");
    if (usersSummary && positionData.total) {
      usersSummary.textContent = `${positionData.total.toLocaleString()} users`;
    }

    updateStats({
      totalUsers: positionData.total || 18042,
      userPosition: positionData.position || 0,
      userGrade: "junior",
    });
  } catch (error) {
    console.error("Error updating current user data:", error);
    const elements = {
      "current-user-name": "Anonymous",
      "current-user-balance": "0 VAI",
      "current-user-position": "#--",
    };
    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
  }
}

// Функция для обновления лидерборда
async function updateLeaderboard() {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/leaderboard`);
    console.log("[Leaderboard] Response status:", response.status);

    if (!response.ok)
      throw new Error(`Failed to fetch leaderboard: ${response.status}`);

    const data = await response.json();
    console.log("[Leaderboard] Data:", data);

    const leaderboardContainer = document.querySelector(
      ".leaderboard-container"
    );
    if (!leaderboardContainer) return;

    leaderboardContainer.innerHTML = "";

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
    const leaderboardContainer = document.querySelector(
      ".leaderboard-container"
    );
    if (leaderboardContainer) {
      leaderboardContainer.innerHTML = `
        <div class="error-message">
          Unable to load leaderboard. Please try again later.
        </div>
      `;
    }
  }
}

// Инициализация страницы
document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("[Init] Starting initialization...");

    await TelegramManager.init();
    console.log("[Init] TelegramManager initialized");

    if (!window.BalanceManager) {
      console.error("[Init] BalanceManager not found");
    } else {
      await window.BalanceManager.initialize();
      console.log("[Init] BalanceManager initialized");
    }

    await updateCurrentUserData();
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

document.addEventListener("DOMContentLoaded", () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        const modalContainer = document.querySelector(
          '[data-tc-wallets-modal-container="true"]'
        );
        const widgetRoot = document.getElementById("tc-widget-root");

        if (modalContainer && widgetRoot) {
          widgetRoot.classList.add("active");
          const viewportHeight = window.Telegram.WebApp.viewportHeight;
          const navHeight = 70; // Высота .Nav из CSS
          modalContainer.style.height = `${viewportHeight + navHeight}px`; // Учитываем высоту навигации
          modalContainer.style.top = "0";
          modalContainer.style.position = "fixed";
          modalContainer.style.left = "0";
          modalContainer.style.width = "100%";
          modalContainer.style.zIndex = "10002";
          document.body.style.overflow = "visible";
        } else if (widgetRoot) {
          widgetRoot.classList.remove("active");
          document.body.style.overflow = "hidden";
        }
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.Telegram.WebApp.onEvent("viewportChanged", () => {
    const modalContainer = document.querySelector(
      '[data-tc-wallets-modal-container="true"]'
    );
    if (modalContainer) {
      const viewportHeight = window.Telegram.WebApp.viewportHeight;
      const navHeight = 70; // Учитываем высоту .Nav
      modalContainer.style.height = `${viewportHeight + navHeight}px`;
      modalContainer.style.top = "0";
    }
  });
});
