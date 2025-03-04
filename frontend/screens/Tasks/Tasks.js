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

// Маппинг URL для задач
const taskUrls = {
  join_community: "https://t.me/getvaitoken",
  follow_twitter: "https://x.com/getvaiii",
  add_stickerpack: "https://t.me/getvaitoken",
  view_website: "https://getvault.space",
  pass_test: "https://t.me/getvaitoken",
  react_blum: "https://t.me/getvaitoken",
  join_luck: "https://t.me/getvaitoken",
  join_aphbt: "https://t.me/getvaitoken",
  join_chloe: "https://t.me/getvaitoken",
  join_suricat: "https://t.me/getvaitoken",
  join_benzin: "https://t.me/getvaitoken",
  join_blum: "https://t.me/getvaitoken",
};

// Загрузка статуса заданий при инициализации
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
          button.classList.add("inactive-button");
          button.classList.remove("active-button");
        }
      });
    }
  } catch (error) {
    console.error("Error loading tasks status:", error);
  }
}

// Вспомогательные функции для локального хранилища
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

// Запуск задачи
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

    button.disabled = true;
    button.classList.add("use");

    setPendingTask(taskType, url);
    window.Telegram.WebApp.openLink(url);

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

// Завершение задачи
async function completeTask(taskType) {
  try {
    const userId = TelegramManager.getUserId();
    if (!userId) {
      console.error("User ID not available");
      return false;
    }

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/tasks/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, taskType }),
    });

    const data = await response.json();

    if (response.ok) {
      const button = document.querySelector(`[data-task-type="${taskType}"]`);
      if (button) {
        button.disabled = true;
        button.classList.add("inactive-button");
        button.classList.remove("active-button");
      }

      if (window.BalanceManager) {
        await window.BalanceManager.fetchBalance(userId);
      }

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

    const pendingTask = getPendingTask();
    if (pendingTask) {
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      if (isMobile) {
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
              if (success) clearPendingTask();
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
        );
      } else {
        const success = await completeTask(pendingTask.taskType);
        if (success) clearPendingTask();
        else {
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

    // Привязка кнопок задач
    const taskButtons = document.querySelectorAll(".lineTask button");
    taskButtons.forEach((button) => {
      const taskType = button.getAttribute("data-task-type");
      const url = taskUrls[taskType];
      button.onclick = () => startTask(button, url, taskType);
    });
  } catch (error) {
    console.error("Initialization error:", error);
  }
});
