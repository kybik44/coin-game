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
  add_stickerpack: "https://t.me/addstickers/somepack",
  view_website: "https://getvault.space",
  pass_test: "https://example.com/test",
  react_blum: "https://t.me/getvaitoken/123",
  join_luck: "https://t.me/luck_channel",
  join_aphbt: "https://t.me/aphbt_channel",
  join_chloe: "https://t.me/chloe_channel",
  join_suricat: "https://t.me/suricat_channel",
  join_benzin: "https://t.me/benzin_channel",
  join_blum: "https://t.me/blum_channel",
};

// Проверка, является ли задача верифицируемой (подписка на канал)
function isVerifiable(taskType) {
  return taskType.startsWith("join_");
}

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
const user = tg.initDataUnsafe.user;
const userId = user.id;

// Получение списка выполненных задач
async function getCompletedTasks() {
  try {
    const response = await fetch(`/api/tasks/completed/${userId}`);
    const data = await response.json();
    return data.completed;
  } catch (error) {
    console.error("Ошибка получения выполненных задач:", error);
    return [];
  }
}

// Обновление состояния кнопок
async function updateButtonStates() {
  const completedTasks = await getCompletedTasks();
  const buttons = document.querySelectorAll("button[data-task-type]");
  buttons.forEach((button) => {
    const taskType = button.dataset.taskType;
    if (completedTasks.includes(taskType)) {
      button.textContent = "Completed";
      button.disabled = true;
      button.classList.add("use");
    } else {
      button.textContent = "Start";
      button.dataset.state = "start";
    }
  });
}

// Обработка клика по кнопке
async function handleButtonClick(button) {
  const taskType = button.dataset.taskType;
  const state = button.dataset.state;

  if (state === "start") {
    tg.openLink(taskUrls[taskType]);
    if (isVerifiable(taskType)) {
      button.textContent = "Check";
      button.dataset.state = "check";
    } else {
      button.textContent = "Claim";
      button.dataset.state = "claim";
    }
  } else if (state === "check") {
    const response = await fetch("/api/tasks/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, taskType }),
    });
    console.log(response);
    const data = await response.json();
    console.log(data);
    if (data.success) {
      button.textContent = "Completed";
      button.disabled = true;
      button.classList.add("use");
      tg.showAlert(`Задание выполнено! Вы заработали ${data.reward} VAI`);
    } else {
      tg.showAlert("Задание еще не выполнено. Подпишитесь на канал.");
    }
  } else if (state === "claim") {
    // Завершение задачи без проверки
    const response = await fetch("/api/tasks/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, taskType }),
    });
    const data = await response.json();
    if (data.success) {
      button.textContent = "Completed";
      button.disabled = true;
      button.classList.add("use");
      tg.showAlert(`Задание выполнено! Вы заработали ${data.reward} VAI`);
    } else {
      tg.showAlert("Ошибка при выполнении задания.");
    }
  }
}

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", async () => {
  await updateButtonStates();
  const buttons = document.querySelectorAll("button[data-task-type]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => handleButtonClick(button));
  });
});
