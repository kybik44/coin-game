// Проверяем, не объявлен ли уже API_CONFIG
if (typeof API_CONFIG === "undefined") {
  const API_CONFIG = {
    BASE_URL:
      window.location.hostname === "morevault.space"
        ? "http://89.104.70.115:3000"
        : "http://localhost:3000",
    ENDPOINTS: {
      HEALTH: "/api/health",
      CLAIM: "/api/claim",
      BALANCE: "/api/balance",
      UPDATE_BALANCE: "/api/updateBalance",
      USER_POSITION: "/api/users/position",
    },
    HEADERS: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    FETCH_OPTIONS: {
      credentials: "same-origin",
      mode: "cors",
    },
  };
  window.API_CONFIG = API_CONFIG;
}

// Менеджер Telegram WebApp
const TelegramManager = {
  tg: null,
  initialized: false,

  async init() {
    if (this.initialized) {
      return true;
    }

    if (window.Telegram?.WebApp) {
      this.tg = window.Telegram.WebApp;
      this.tg.ready();
      this.tg.expand();

      this.initialized = true;
      return true;
    }

    return false;
  },

  getUserId() {
    if (!this.tg?.initDataUnsafe?.user?.id) {
      return null;
    }
    return this.tg.initDataUnsafe.user.id;
  },

  async checkReferral(startParam) {
    console.log("[Referral] Starting referral check with param:", startParam);

    try {
      const userId = this.getUserId();
      if (!userId) {
        console.error("[Referral] No user ID available");
        return false;
      }

      console.log("[Referral] Checking user status for:", userId);

      // Получаем данные пользователя
      const balanceResponse = await fetch(
        `${API_CONFIG.BASE_URL}/api/balance/${userId}`,
        API_CONFIG.FETCH_OPTIONS
      );
      const balanceData = await balanceResponse.json();
      console.log("[Referral] User data:", balanceData);

      if (balanceData.error) {
        console.error("[Referral] Balance check error:", balanceData.error);
        return false;
      }

      // Проверяем, есть ли уже реферер
      if (balanceData.referrer_id) {
        console.log(
          "[Referral] User already has a referrer:",
          balanceData.referrer_id
        );
        this.tg.showPopup({
          title: "Already Referred",
          message: "You have already used a referral link",
          buttons: [{ type: "ok" }],
        });
        return false;
      }

      // Очищаем параметр от префиксов
      const cleanStartParam = startParam
        .toString()
        .replace(/^(webapp|bot|universal)_/, "");
      console.log("[Referral] Cleaned start parameter:", cleanStartParam);

      if (!cleanStartParam || cleanStartParam === userId.toString()) {
        console.log("[Referral] Invalid start parameter or self-referral");
        this.tg.showPopup({
          title: "Invalid Referral",
          message: "Cannot refer yourself or invalid link",
          buttons: [{ type: "ok" }],
        });
        return false;
      }

      // Отправляем запрос на активацию
      const userData = this.tg.initDataUnsafe?.user;
      const requestData = {
        referrerId: cleanStartParam,
        userId: userId.toString(),
        userData: {
          username: userData?.username,
          first_name: userData?.first_name,
          last_name: userData?.last_name,
          photo_url: userData?.photo_url,
        },
      };

      console.log("[Referral] Sending activation request:", requestData);

      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/referral/activate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
          ...API_CONFIG.FETCH_OPTIONS,
        }
      );

      const data = await response.json();
      console.log("[Referral] Server response:", data);

      if (response.ok) {
        console.log("[Referral] Activation successful");
        this.tg.showPopup({
          title: "Welcome!",
          message: `You received ${data.reward.referred} VAI welcome bonus!`,
          buttons: [{ type: "ok" }],
        });
        return true;
      }

      throw new Error(data.error || "Failed to activate referral");
    } catch (error) {
      console.error("[Referral] Error:", error);
      this.tg.showPopup({
        title: "Referral Error",
        message: error.message || "Failed to activate referral",
        buttons: [{ type: "ok" }],
      });
      return false;
    }
  },

  // Добавим метод для отладки
  async debugReferrals() {
    try {
      const userId = this.getUserId();
      if (!userId) return;

      const referralKey = `referral_${userId}`;
      const savedReferral = localStorage.getItem(referralKey);

      console.log("[Referral Debug] Current user:", {
        userId,
        savedReferral: savedReferral ? JSON.parse(savedReferral) : null,
      });

      // Получаем все рефералы с сервера
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/referrals/${userId}`,
        API_CONFIG.FETCH_OPTIONS
      );
      const data = await response.json();
      console.log("[Referral Debug] Server referrals:", data);
    } catch (error) {
      console.error("[Referral Debug] Error:", error);
    }
  },

  // Добавляем метод resetReferralSystem в объект TelegramManager
  async resetReferralSystem() {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/debug/reset-referrals`,
        {
          method: "POST",
          ...API_CONFIG.FETCH_OPTIONS,
        }
      );

      if (response.ok) {
        // Очищаем все referral записи в localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith("referral_")) {
            localStorage.removeItem(key);
          }
        }
        console.log("[Referral] System reset successful");
        return true;
      }
      return false;
    } catch (error) {
      console.error("[Referral] Reset error:", error);
      return false;
    }
  },
};

window.TelegramManager = TelegramManager;

// Функция для плавного перехода между страницами
function navigateTo(url) {
  const mainContainer = document.getElementById("main-container");
  if (mainContainer) {
    mainContainer.classList.add("fade-out");
    setTimeout(() => {
      window.location.href = url;
    }, 300);
  } else {
    window.location.href = url;
  }
}

window.navigateTo = navigateTo;
