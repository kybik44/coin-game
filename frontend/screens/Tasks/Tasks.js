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

async function loadTasksStatus() {
  const userId = TelegramManager.getUserId();
  if (!userId) return;

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
}

// Запуск задачи
async function startTask(button, taskType) {
  const userId = TelegramManager.getUserId();
  if (!userId || !button || !taskType) return;

  button.disabled = true;
  button.classList.add("use");

  // Перенаправляем через сервер для отслеживания
  const trackingUrl = `${API_CONFIG.BASE_URL}/api/tasks/track/${taskType}?userId=${userId}`;
  window.Telegram.WebApp.openLink(trackingUrl);

  // Проверяем выполнение через 5 секунд
  setTimeout(() => checkTaskCompletion(taskType), 5000);
}

// Проверка выполнения задачи
async function checkTaskCompletion(taskType) {
  const userId = TelegramManager.getUserId();
  if (!userId) return;

  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/tasks/check/${taskType}?userId=${userId}`
  );
  const data = await response.json();

  if (response.ok && data.completed) {
    const button = document.querySelector(`[data-task-type="${taskType}"]`);
    if (button) {
      button.disabled = true;
      button.classList.add("inactive-button");
      button.classList.remove("active-button");
    }
    window.Telegram.WebApp.showPopup({
      message: `Вы получили ${data.reward} VAI!`,
      buttons: [{ type: "ok" }],
    });
  }
}

// Инициализация
document.addEventListener("DOMContentLoaded", async () => {
  if (!(await TelegramManager.init())) return;

  await loadTasksStatus();

  const taskButtons = document.querySelectorAll(".lineTask button");
  taskButtons.forEach((button) => {
    const taskType = button.getAttribute("data-task-type");
    button.onclick = () => startTask(button, taskType);
  });
});
