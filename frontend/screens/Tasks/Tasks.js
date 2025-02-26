const TASK_TYPES = {
  JOIN_COMMUNITY: "join_community",
  FOLLOW_TWITTER: "follow_twitter",
  ADD_STICKERPACK: "add_stickerpack",
  VIEW_WEBSITE: "view_website",
  PASS_TEST: "pass_test",
  REACT_BLUM: "react_blum",
  JOIN_LUCK: "join_luck",
  JOIN_APHBT: "join_aphbt",
  JOIN_CHLOE: "join_chloe",
  JOIN_SURICAT: "join_suricat",
  JOIN_BENZIN: "join_benzin",
  JOIN_BLUM: "join_blum",
};

// Загружаем статус заданий при инициализации
async function loadTasksStatus() {
  try {
    const userId = TelegramManager.getUserId();
    if (!userId) {
      console.error("User ID not available");
      return;
    }

    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/tasks/status/${userId}`
    );
    const data = await response.json();

    if (response.ok) {
      Object.entries(data.completedTasks).forEach(([taskType, completedAt]) => {
        const button = document.querySelector(`[data-task-type="${taskType}"]`);
        if (button) {
          button.disabled = true;
          button.classList.add("use");
          button.classList.add("inactive-button");
          button.classList.remove("active-button");
        }
      });
    }
  } catch (error) {
    console.error("Error loading tasks status:", error);
  }
}

// Вспомогательные функции для работы с локальным хранилищем
function setPendingTask(taskType, url) {
  localStorage.setItem("pendingTask", JSON.stringify({ taskType, url }));
}

function getPendingTask() {
  const data = localStorage.getItem("pendingTask");
  return data ? JSON.parse(data) : null;
}

function clearPendingTask() {
  localStorage.removeItem("pendingTask");
}

// Функция запуска задания
async function startTask(button, url, taskType) {
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

    // Отключаем кнопку временно
    button.disabled = true;
    button.classList.add("use");

    // Сохраняем задание как "в процессе"
    setPendingTask(taskType, url);

    // Открываем ссылку
    window.open(url, "_blank");

    // На мобильных устройствах показываем инструкцию
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    if (isMobile) {
      window.Telegram.WebApp.showPopup({
        message: "Complete the task and return to claim your reward!",
        buttons: [{ type: "ok" }],
      });
    }
  } catch (error) {
    console.error("Error starting task:", error);
    button.disabled = false;
    button.classList.remove("use");
  }
}

// Функция проверки и завершения задания
async function completeTask(taskType) {
  try {
    const userId = TelegramManager.getUserId();
    if (!userId) {
      console.error("User ID not available");
      return false;
    }

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/tasks/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        taskType,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Отключаем кнопку окончательно
      const button = document.querySelector(`[data-task-type="${taskType}"]`);
      if (button) {
        button.disabled = true;
        button.classList.add("inactive-button");
        button.classList.remove("active-button");
      }

      // Обновляем баланс
      if (window.BalanceManager) {
        await window.BalanceManager.fetchBalance(userId);
      }

      // Показываем попап с наградой
      window.Telegram.WebApp.showPopup({
        message: `You received ${data.reward} VAI!`,
        buttons: [{ type: "ok" }],
      });

      return true;
    } else {
      throw new Error(data.error || "Failed to complete task");
    }
  } catch (error) {
    console.error("Error completing task:", error);
    window.Telegram.WebApp.showPopup({
      message: error.message || "Error completing task",
      buttons: [{ type: "ok" }],
    });
    return false;
  }
}

// Инициализация
document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!(await TelegramManager.init())) {
      throw new Error("Failed to initialize TelegramManager");
    }

    await loadTasksStatus();

    // Проверяем незавершенное задание
    const pendingTask = getPendingTask();
    if (pendingTask) {
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      if (isMobile) {
        // На мобильных устройствах спрашиваем подтверждение
        window.Telegram.WebApp.showPopup(
          {
            message: `Did you complete the ${pendingTask.taskType} task?`,
            buttons: [
              { type: "ok", text: "Yes" },
              { type: "cancel", text: "No" },
            ],
          },
          async (buttonId) => {
            if (buttonId === "ok") {
              const success = await completeTask(pendingTask.taskType);
              if (success) {
                clearPendingTask();
              }
            } else {
              // Если "No", оставляем задание в pending
              const button = document.querySelector(
                `[data-task-type="${pendingTask.taskType}"]`
              );
              if (button) {
                button.disabled = false;
                button.classList.remove("use");
              }
            }
          }
        );
      } else {
        // На десктопе автоматически проверяем (предполагаем, что пользователь вернулся)
        const success = await completeTask(pendingTask.taskType);
        if (success) {
          clearPendingTask();
        } else {
          const button = document.querySelector(
            `[data-task-type="${pendingTask.taskType}"]`
          );
          if (button) {
            button.disabled = false;
            button.classList.remove("use");
          }
        }
      }
    }

    // Настраиваем кнопки
    const taskButtons = {
      join_community: "https://t.me/getvaitoken",
      follow_twitter: "https://x.com/getvaiii",
      view_website: "https://getvault.space",
    };

    Object.entries(taskButtons).forEach(([taskType, url]) => {
      const buttons = document.querySelectorAll(`button[onclick*="${url}"]`);
      buttons.forEach((button) => {
        button.setAttribute("data-task-type", taskType);
        button.onclick = () => startTask(button, url, taskType);
      });
    });
  } catch (error) {
    console.error("Initialization error:", error);
  }
});

// Остальные функции (showBlock1, showBlock2) остаются без изменений
function showBlock1() {
  document.getElementById("block1").classList.add("active");
  document.getElementById("block2").classList.remove("active");
  document.getElementById("button1").classList.add("tab-active");
  document.getElementById("button1").classList.remove("tab-inactive");
  document.getElementById("button2").classList.add("tab-inactive");
  document.getElementById("button2").classList.remove("tab-active");
}

function showBlock2() {
  document.getElementById("block2").classList.add("active");
  document.getElementById("block1").classList.remove("active");
  document.getElementById("button2").classList.add("tab-active");
  document.getElementById("button2").classList.remove("tab-inactive");
  document.getElementById("button1").classList.add("tab-inactive");
  document.getElementById("button1").classList.remove("tab-active");
}
