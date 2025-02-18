const tg = window.Telegram?.WebApp;
let flippedCards = [];

// Удаляем дублирующий GAME_CONFIG, так как он теперь импортируется из gameConfig.js

// Генерация значений карт
function generateCardValues() {
  const values = new Array(GAME_CONFIG.CARDS_COUNT).fill(0);
  
  if (Math.random() < GAME_CONFIG.WINNING_CHANCE) {
    const winningPosition = Math.floor(Math.random() * GAME_CONFIG.CARDS_COUNT);
    const winningValue = GAME_CONFIG.POSSIBLE_REWARDS[
      Math.floor(Math.random() * GAME_CONFIG.POSSIBLE_REWARDS.length)
    ];
    values[winningPosition] = winningValue;
  }
  
  return values;
}

// Инициализация игры
function initGame() {
  const cardValues = generateCardValues();
  const cardsContainer = document.getElementById("cards-container");

  if (!cardsContainer) return;

  // Создаем карты
  cardsContainer.innerHTML = cardValues
    .map(
      (value, index) => `
        <div class="card" data-value="${value}" data-index="${index}">
            <div class="card-inner">
                <div class="card-front"></div>
                <div class="card-back" style="background-image: url('${GAME_CONFIG.CARD_IMAGES[value]}')"></div>
            </div>
        </div>
    `
    )
    .join("");

  // Добавляем обработчики на карты
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => flipCard(card));
  });
}

// Переворот карты
function flipCard(card) {
  if (flippedCards.length >= GAME_CONFIG.MAX_FLIPS || 
    card.classList.contains(GAME_CONFIG.CSS_CLASSES.FLIPPED)) return;
  
  card.classList.add(GAME_CONFIG.CSS_CLASSES.FLIPPED);
  flippedCards.push(card);
  
  if (flippedCards.length === GAME_CONFIG.MAX_FLIPS) {
    setTimeout(checkWin, GAME_CONFIG.FLIP_ANIMATION_DURATION);
  }
}

// Функция создания фейерверка
function createFireworks() {
    const fireworksContainer = document.createElement('div');
    fireworksContainer.className = 'fireworks-container';
    document.body.appendChild(fireworksContainer);

    const { SPREAD, DURATION, PARTICLE_COUNT, COLORS } = GAME_CONFIG.FIREWORKS;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const particle = document.createElement('div');
        particle.className = 'firework';
        
        // Случайное направление
        const angle = (Math.random() * Math.PI * 2);
        const distance = Math.random() * SPREAD;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        // Случайный цвет
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        
        particle.style.setProperty('--x', `${x}px`);
        particle.style.setProperty('--y', `${y}px`);
        particle.style.backgroundColor = color;
        
        fireworksContainer.appendChild(particle);
    }

    // Показываем контейнер
    fireworksContainer.style.display = 'block';

    // Удаляем фейерверк после анимации
    setTimeout(() => {
        fireworksContainer.remove();
    }, DURATION);
}

// Проверка выигрыша
async function checkWin() {
  try {
    if (!tg) {
      throw new Error("Telegram WebApp not initialized");
    }

    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) {
      throw new Error("User ID not available");
    }

    const totalWin = flippedCards.reduce((sum, card) => {
      return sum + parseInt(card.dataset.value || 0);
    }, 0);

    if (totalWin > 0) {
      console.log("Processing win:", { userId, amount: totalWin });

      // Отправляем запрос на начисление выигрыша
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/game/win`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          userId: userId.toString(),
          amount: totalWin,
        }),
      });

      console.log("Win response status:", response.status);
      const data = await response.json();
      console.log("Win response data:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to process win");
      }

      // Обновляем баланс
      if (window.BalanceManager) {
        await window.BalanceManager.fetchBalance(userId.toString());
      }

      // Запускаем фейерверк при выигрыше
      createFireworks();

      tg.showPopup({
        title: "Congratulations!",
        message: GAME_CONFIG.MESSAGES.WIN.replace('{amount}', totalWin),
        buttons: [{ type: "ok" }]
      });
    } else {
      tg.showPopup({
        title: "No Win",
        message: GAME_CONFIG.MESSAGES.NO_WIN,
        buttons: [{ type: "ok" }]
      });
    }

    // Возвращаемся на страницу high-stakes
    setTimeout(() => {
      window.location.href = "high-stakes.html";
    }, GAME_CONFIG.RETURN_TO_MENU_DELAY);
  } catch (error) {
    console.error("Error in checkWin:", error);
    if (tg) {
      tg.showPopup({
        title: "Error",
        message: error.message || "Error processing win",
        buttons: [
          {
            type: "ok",
          },
        ],
      });
    }
  }
}

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
  try {
    console.log("Initializing game...");

    if (!tg) {
      throw new Error("Telegram WebApp not initialized");
    }

    tg.ready();
    tg.expand();

    const mainContainer = document.getElementById("main-container");
    if (mainContainer) {
      mainContainer.classList.remove("hidden");
    }

    initGame();
  } catch (error) {
    console.error("Error initializing:", error);
    if (tg) {
      tg.showPopup({
        title: "Error",
        message: error.message || "Failed to initialize game",
        buttons: [
          {
            type: "ok",
          },
        ],
      });
    }
  }
});
