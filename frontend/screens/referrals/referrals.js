// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;
console.log("Initial tg object:", tg);

// Функция для скрытия прелоадера
function hidePreloader() {
  const mainContainer = document.getElementById("main-container");
  if (mainContainer) {
    mainContainer.classList.remove("hidden");
  }
}

// Функция для получения данных о рефералах
async function loadReferrals() {
  const userId = TelegramManager.getUserId();
  if (!userId) {
    console.error("No user ID available");
    return;
  }

  console.log("Loading referrals for user:", userId);

  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/referrals/${userId}`
    );
    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error response:", errorData);
      throw new Error(errorData.error || "Failed to load referrals");
    }

    const data = await response.json();
    console.log("Referrals data:", data);

    const referralsList = document.querySelector(".referrals-list");
    const referralsCount = document.querySelector(".stats-value");

    // Обновляем счетчик рефералов
    if (referralsCount) {
      const count = data.total || 0;
      referralsCount.textContent = `${count} ${count === 1 ? "user" : "users"}`;
    }

    // Обновляем список рефералов
    if (referralsList) {
      referralsList.innerHTML = "";

      if (!data.referrals || data.referrals.length === 0) {
        referralsList.innerHTML = `
          <div class="person">
            <div class="right">
              <img class="user-avatar" src="../../images/anonym.png">
              <div class="user-details">
                <span class="user-name">No referrals yet</span>
                <span class="user-data">Invite friends to earn rewards!</span>
              </div>
            </div>
            <span class="left">+0 VAI</span>
          </div>
        `;
        return;
      }

      // Сортируем рефералов по дате (новые первые)
      const sortedReferrals = [...data.referrals].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      sortedReferrals.forEach((referral) => {
        const referralElement = document.createElement("div");
        referralElement.className = "person";

        const joinedDate = new Date(referral.date).toLocaleDateString();
        const username = referral.name || "VAI's user";
        const reward = referral.reward || 1000;
        const photoUrl = referral.photo_url || "../../images/anonym.png";

        referralElement.innerHTML = `
          <div class="right">
            <img class="user-avatar" src="${photoUrl}" alt="${username}">
            <div class="user-details">
              <span class="user-name">${username}</span>
              <span class="user-data">${joinedDate}</span>
            </div>
          </div>
          <span class="left">+${reward} VAI</span>
        `;

        referralsList.appendChild(referralElement);
      });

      console.log(
        "Referrals list updated with",
        sortedReferrals.length,
        "referrals"
      );
    }
  } catch (error) {
    console.error("Error loading referrals:", error);
    if (TelegramManager.tg?.showPopup) {
      TelegramManager.tg.showPopup({
        title: "Error",
        message: error.message || "Failed to load referrals",
        buttons: [{ type: "ok" }],
      });
    }
  }
}

// Функция для обработки кнопки Invite
function handleInvite() {
  const userId = TelegramManager.getUserId();
  const botName = "dev_kybik_bot";
  const startCommand = `start=${userId}`;

  // Создаем три версии ссылки для разных платформ
  const links = {
    webapp: `https://t.me/${botName}/bot?startapp=${userId}`, // Для WebApp на всех платформах
    bot: `https://t.me/${botName}?${startCommand}`, // Для бота
    universal: `https://t.me/${botName}/bot?${startCommand}`, // Универсальная ссылка
  };

  console.log("[Referral] Creating invite links:", links);

  const messageText = `🎮 Join VAI Game and get 1000 VAI bonus tokens!\n\n🎁 Use my referral link to start:\n${links.webapp}`;

  const linkToShare = `https://t.me/${botName}/bot?startapp=${userId}`;
  window.Telegram.WebApp.openTelegramLink(
    `https://t.me/share/url?url=${encodeURIComponent(
      linkToShare
    )}&text=${encodeURIComponent(messageText)}`
  );
}

// Добавим обработчик события активации реферала
window.addEventListener("referralActivated", async (event) => {
  console.log("[Referrals] Referral activated:", event.detail);
  // Перезагружаем список рефералов
  await loadReferrals();
});

// Инициализация страницы
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing referrals page...");

  if (!(await TelegramManager.init())) {
    console.error("Telegram WebApp not available");
    return;
  }

  // Загружаем рефералов
  await loadReferrals();

  // Добавляем обработчик для кнопки приглашения
  const inviteButton = document.getElementById("invite-button");
  if (inviteButton) {
    inviteButton.addEventListener("click", handleInvite);
  }

  // Обновляем данные каждые 10 секунд
  setInterval(loadReferrals, 10000);

  // Показываем контейнер
  hidePreloader();
});
