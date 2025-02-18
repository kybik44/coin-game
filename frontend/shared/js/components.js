// HTML компонентов
const HEADER_HTML = `
    <header class="header">
        <div class="balance-container">
            <img src="../../images/vaiicon.svg" alt="VAI" class="vai-icon">
            <span id="balance-amount">0</span>
        </div>
        <a href="../roadmap/roadmap.html" class="roadmap-link"><svg width="70" height="10" viewBox="0 0 70 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M70 2 L78 10 L70 18" stroke="white" stroke-width="2" fill="none" />
                <line x1="2" y1="10" x2="78" y2="10" stroke="white" stroke-width="2" />
            </svg>
            </a>
    </header>
`;

// Функция для вставки компонентов
function insertComponents() {
  // Вставляем хедер
  const headerContainer = document.querySelector(".header-container");
  if (headerContainer) {
    headerContainer.innerHTML = HEADER_HTML;
  }
}

// Вставляем компоненты при загрузке страницы
document.addEventListener("DOMContentLoaded", insertComponents);

// Инициализация баланса для всех страниц
async function initializeBalance() {
  try {
    if (!window.BalanceManager) {
      console.error("BalanceManager not loaded");
      return;
    }
    await BalanceManager.initialize();
  } catch (error) {
    console.error("Error initializing balance:", error);
  }
}

// Обновляем функцию setupViewport
function setupViewport() {
  // Устанавливаем метатег viewport
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (viewportMeta) {
    viewportMeta.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
    );
  }

  // Обработка изменения размера окна
  function updateViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);

    // Обновляем высоту main-container
    const mainContainer = document.querySelector(".main-container");
    if (mainContainer) {
      mainContainer.style.height = `${window.innerHeight}px`;
    }
  }

  // Инициализация и обработчики событий
  updateViewportHeight();
  window.addEventListener("resize", updateViewportHeight);
  window.addEventListener("orientationchange", () => {
    setTimeout(updateViewportHeight, 100);
  });

  // Предотвращаем скролл на iOS Safari
  document.addEventListener(
    "touchmove",
    (e) => {
      if (!e.target.closest(".main-container")) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
}

// Обновляем функцию initializePage
async function initializePage() {
  try {
    // Отключаем анимации на время инициализации
    document.body.classList.remove("page-loaded");

    // Инициализируем viewport
    setupViewport();

    // Инициализируем Telegram
    if (!(await TelegramManager.init())) {
      throw new Error("Failed to initialize Telegram WebApp");
    }

    // Устанавливаем правильную высоту для WebApp
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.expand();
    }

    // Инициализируем баланс
    await initializeBalance();

    // Показываем основной контейнер
    const mainContainer = document.getElementById("main-container");
    if (mainContainer) {
      mainContainer.classList.remove("hidden");
    }

    // Анимируем появление white-button
    const buttons = document.querySelectorAll(".white-button");
    buttons.forEach((button) => {
      button.style.opacity = "1";
      button.style.transform = "translateY(0)";
    });

    // Включаем анимации после инициализации
    requestAnimationFrame(() => {
      document.body.classList.add("page-loaded");
    });
  } catch (error) {
    console.error("Error initializing page:", error);
  }
}

// Экспортируем функции глобально
window.initializePage = initializePage;
