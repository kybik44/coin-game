const TASK_TYPES = {
  JOIN_COMMUNITY: 'join_community',
  FOLLOW_TWITTER: 'follow_twitter',
  ADD_STICKERPACK: 'add_stickerpack',
  VIEW_WEBSITE: 'view_website',
  PASS_TEST: 'pass_test',
  REACT_BLUM: 'react_blum',
  JOIN_LUCK: 'join_luck',
  JOIN_APHBT: 'join_aphbt',
  JOIN_CHLOE: 'join_chloe',
  JOIN_SURICAT: 'join_suricat',
  JOIN_BENZIN: 'join_benzin',
  JOIN_BLUM: 'join_blum'
};

// Загружаем статус заданий при инициализации
async function loadTasksStatus() {
  try {
    const userId = TelegramManager.getUserId();
    if (!userId) {
      console.error("User ID not available");
      return;
    }

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/tasks/status/${userId}`);
    const data = await response.json();

    if (response.ok) {
      // Отключаем кнопки для выполненных заданий
      Object.entries(data.completedTasks).forEach(([taskType, completedAt]) => {
        const button = document.querySelector(`[data-task-type="${taskType}"]`);
        if (button) {
          button.disabled = true;
          button.classList.add('use');
          button.classList.add('inactive-button');
          button.classList.remove('active-button');
        }
      });
    }
  } catch (error) {
    console.error("Error loading tasks status:", error);
  }
}

// Функция выполнения задания
async function handleTaskClick(button, url, taskType) {
  try {
    if (!button || !taskType) {
      console.error("Button or task type not provided");
      return;
    }

    const userId = TelegramManager.getUserId();
    if (!userId) {
      console.error("User ID not available");
      return;
    }

    // Открываем ссылку
    window.open(url, '_blank');

    // Отправляем запрос на выполнение задания
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/tasks/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        taskType
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Отключаем кнопку и добавляем стили
      button.disabled = true;
      button.classList.add('use');
      button.classList.add('inactive-button');
      button.classList.remove('active-button');

      // Обновляем баланс
      if (window.BalanceManager) {
        await window.BalanceManager.fetchBalance(userId);
      }

      // Показываем сообщение об успехе
      window.Telegram.WebApp.showPopup({
        message: `You received ${data.reward} VAI!`,
        buttons: [{ type: 'ok' }]
      });
    } else {
      throw new Error(data.error || "Failed to complete task");
    }
  } catch (error) {
    console.error("Error completing task:", error);
    window.Telegram.WebApp.showPopup({
      message: error.message || "Error completing task",
      buttons: [{ type: 'ok' }]
    });
  }
}

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Инициализируем Telegram
    if (!await TelegramManager.init()) {
      throw new Error("Failed to initialize TelegramManager");
    }

    // Загружаем статус заданий
    await loadTasksStatus();

    // Добавляем data-task-type к кнопкам
    const taskButtons = {
      'join_community': 'https://t.me/getvaitoken',
      'follow_twitter': 'https://x.com/getvaiii',
      'view_website': 'https://getvault.space'
    };

    Object.entries(taskButtons).forEach(([taskType, url]) => {
      const buttons = document.querySelectorAll(`button[onclick*="${url}"]`);
      buttons.forEach(button => {
        button.setAttribute('data-task-type', taskType);
        button.onclick = () => handleTaskClick(button, url, taskType);
      });
    });

  } catch (error) {
    console.error("Initialization error:", error);
  }
});

function showBlock1() {
  document.getElementById("block1").classList.add("active");
  document.getElementById("block2").classList.remove("active");

  // Изменение стилей кнопок
  document.getElementById("button1").classList.add("tab-active");
  document.getElementById("button1").classList.remove("tab-inactive");

  document.getElementById("button2").classList.add("tab-inactive");
  document.getElementById("button2").classList.remove("tab-active");
}

function showBlock2() {
  document.getElementById("block2").classList.add("active");
  document.getElementById("block1").classList.remove("active");

  // Изменение стилей кнопок
  document.getElementById("button2").classList.add("tab-active");
  document.getElementById("button2").classList.remove("tab-inactive");

  document.getElementById("button1").classList.add("tab-inactive");
  document.getElementById("button1").classList.remove("tab-active");
} 