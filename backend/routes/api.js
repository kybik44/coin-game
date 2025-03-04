const express = require("express");
const router = express.Router();
const db = require("../db");
const mockUsers = require("../mockUsers");

// Получение баланса
router.get("/balance/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("[Balance] Getting balance for:", userId);

    let user = await db.get("SELECT * FROM users WHERE telegram_id = ?", [
      userId,
    ]);
    console.log("[Balance] User check result:", user);

    if (!user) {
      console.log("[Balance] Creating new user:", userId);
      await db.run(
        `INSERT INTO users (
          telegram_id, 
          balance, 
          joined_date,
          last_claim_time
        ) VALUES (?, ?, ?, ?)`,
        [userId, 1000, Date.now(), 0]
      );
      user = await db.get("SELECT * FROM users WHERE telegram_id = ?", [
        userId,
      ]);
      console.log("[Balance] Created user:", user);
    }

    const response = {
      balance: user.balance,
      lastClaimTime: user.last_claim_time || 0,
      isNew: user.referrer_id === null && user.stories_shown === 0,
      storiesShown: !!user.stories_shown,
      referrer_id: user.referrer_id,
    };

    console.log("[Balance] Sending response:", response);
    res.json(response);
  } catch (error) {
    console.error("[Balance] Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Получение времени следующего клейма
router.get("/next-claim/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const user = await db.get(
      "SELECT last_claim_time FROM users WHERE telegram_id = ?",
      [userId]
    );

    const now = Date.now();
    const lastClaimTime = user?.last_claim_time || 0;
    const claimCooldown = 3 * 60 * 60 * 1000; // 3 часа
    const nextClaimTime = lastClaimTime + claimCooldown;
    const timeLeft = Math.max(0, nextClaimTime - now);

    res.json({
      canClaim: timeLeft <= 0,
      nextClaimTime: nextClaimTime,
      timeLeft: timeLeft,
      lastClaimTime: lastClaimTime,
    });
  } catch (error) {
    console.error("[Next Claim] Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Клейм наград
router.post("/claim", async (req, res) => {
  try {
    const { userId } = req.body;
    console.log("[Claim] Processing claim for user:", userId);

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Проверяем существование пользователя
    let user = await db.get("SELECT * FROM users WHERE telegram_id = ?", [
      userId,
    ]);

    // Если пользователя нет, создаем его
    if (!user) {
      console.log("[Claim] Creating new user:", userId);
      await db.run(
        `INSERT INTO users (
          telegram_id, 
          balance,
          joined_date,
          last_claim_time
        ) VALUES (?, ?, ?, ?)`,
        [userId, 1000, Date.now(), 0]
      );
      user = await db.get("SELECT * FROM users WHERE telegram_id = ?", [
        userId,
      ]);
    }

    // Проверяем время последнего клейма
    const now = Date.now();
    const lastClaimTime = user.last_claim_time || 0;
    const claimCooldown = 3 * 60 * 60 * 1000; // 3 часа
    const timeLeft = lastClaimTime + claimCooldown - now;

    if (timeLeft > 0) {
      return res.status(400).json({
        error: "Claim not ready",
        timeLeft,
        nextClaimTime: lastClaimTime + claimCooldown,
      });
    }

    // Начисляем награду
    const reward = 100;
    const newBalance = user.balance + reward;

    await db.run(
      `UPDATE users 
       SET balance = ?,
           last_claim_time = ?
       WHERE telegram_id = ?`,
      [newBalance, now, userId]
    );

    console.log("[Claim] Successful claim for user:", userId, {
      newBalance,
      reward,
    });

    res.json({
      success: true,
      balance: newBalance,
      reward,
      nextClaimTime: now + claimCooldown,
    });
  } catch (error) {
    console.error("[Claim] Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Получение списка рефералов
router.get("/referrals/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("[Referrals] Getting referrals for:", userId);

    // Проверяем все записи в таблице referrals
    const allReferrals = await db.all("SELECT * FROM referrals");
    console.log("[Referrals] All referrals in DB:", allReferrals);

    // Проверяем пользователя
    const user = await db.get("SELECT * FROM users WHERE telegram_id = ?", [
      userId,
    ]);
    console.log("[Referrals] User data:", user);

    // Получаем рефералов с дополнительной информацией
    const referrals = await db.all(
      `
      SELECT 
        r.*,
        u.telegram_id,
        u.username,
        u.first_name,
        u.last_name,
        u.photo_url,
        u.joined_date,
        u.balance
      FROM referrals r
      INNER JOIN users u ON u.telegram_id = r.referred_id
      WHERE r.referrer_id = ?
        AND r.referrer_id != r.referred_id
      ORDER BY r.joined_date DESC
    `,
      [userId.toString()]
    );

    console.log("[Referrals] Found referrals:", referrals);

    const response = {
      referrals: referrals.map((ref) => ({
        id: ref.telegram_id,
        name:
          ref.username ||
          `${ref.first_name || ""} ${ref.last_name || ""}`.trim() ||
          "VAI's user",
        photo_url: ref.photo_url,
        date: new Date(ref.joined_date).toISOString(),
        reward: ref.referrer_reward || 1000,
      })),
      total: referrals.length,
      totalRewards: referrals.reduce(
        (sum, ref) => sum + (ref.referrer_reward || 1000),
        0
      ),
      debug: {
        user,
        allReferrals,
        rawReferrals: referrals,
      },
    };

    console.log("[Referrals] Sending response:", response);
    res.json(response);
  } catch (error) {
    console.error("[Referrals] Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Добавление реферала
router.post("/referrals/add", async (req, res) => {
  try {
    const { referrerId, referredId } = req.body;
    console.log("[Add Referral] Request:", { referrerId, referredId });

    if (!referrerId || !referredId) {
      return res
        .status(400)
        .json({ error: "Both referrer and referred IDs are required" });
    }

    // Проверяем, не является ли пользователь уже чьим-то рефералом
    const existingReferral = await db.get(
      "SELECT * FROM referrals WHERE referred_id = ?",
      [referredId]
    );

    if (existingReferral) {
      return res.status(400).json({ error: "User is already referred" });
    }

    // Добавляем реферала
    await db.run(
      `INSERT INTO referrals (referrer_id, referred_id, date) 
       VALUES (?, ?, ?)`,
      [referrerId, referredId, Date.now()]
    );

    // Начисляем бонус рефереру
    await db.run(
      `UPDATE users 
       SET balance = balance + 1000 
       WHERE telegram_id = ?`,
      [referrerId]
    );

    console.log("[Add Referral] Successfully added referral");

    res.json({ success: true });
  } catch (error) {
    console.error("[Add Referral] Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Начало игры
router.post("/game/start", async (req, res) => {
  try {
    const { userId } = req.body;
    console.log("[Game Start] Request for user:", userId);

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Проверяем существование пользователя
    const user = await db.get("SELECT * FROM users WHERE telegram_id = ?", [
      userId,
    ]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const GAME_COST = 300;

    // Проверяем достаточно ли баланса
    if (user.balance < GAME_COST) {
      return res.status(400).json({
        error: "Insufficient balance",
        required: GAME_COST,
        current: user.balance,
      });
    }

    // Списываем стоимость игры
    await db.run(
      `UPDATE users 
       SET balance = balance - ? 
       WHERE telegram_id = ?`,
      [GAME_COST, userId]
    );

    // Получаем обновленный баланс
    const updatedUser = await db.get(
      "SELECT * FROM users WHERE telegram_id = ?",
      [userId]
    );

    console.log("[Game Start] Game started for user:", userId, {
      cost: GAME_COST,
      newBalance: updatedUser.balance,
    });

    res.json({
      success: true,
      balance: updatedUser.balance,
      cost: GAME_COST,
    });
  } catch (error) {
    console.error("[Game Start] Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Выигрыш в игре
router.post("/game/win", async (req, res) => {
  try {
    const { userId, amount } = req.body;
    console.log("[Game Win] Request:", {
      userId,
      amount,
      userIdType: typeof userId,
      amountType: typeof amount,
    });

    if (!userId || !amount) {
      return res.status(400).json({
        error: "User ID and amount are required",
        details: { userId, amount },
      });
    }

    // Проверяем существование пользователя
    const user = await db.get(
      "SELECT * FROM users WHERE telegram_id = ?",
      [userId.toString()] // Преобразуем в строку
    );

    console.log("[Game Win] Found user:", user);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        details: { userId: userId.toString() },
      });
    }

    // Начисляем выигрыш
    await db.run(
      `UPDATE users 
       SET balance = balance + ? 
       WHERE telegram_id = ?`,
      [amount, userId.toString()]
    );

    // Получаем обновленный баланс
    const updatedUser = await db.get(
      "SELECT * FROM users WHERE telegram_id = ?",
      [userId.toString()]
    );

    console.log("[Game Win] Updated user:", updatedUser);

    res.json({
      success: true,
      balance: updatedUser.balance,
      wonAmount: amount,
    });
  } catch (error) {
    console.error("[Game Win] Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Активация реферальной ссылки
router.post("/referral/activate", async (req, res) => {
  try {
    const { referrerId, userId, userData } = req.body;
    console.log("[Referral] Activation request:", {
      referrerId,
      userId,
      userData,
    });

    // Проверяем существование реферера
    const referrer = await db.get("SELECT * FROM users WHERE telegram_id = ?", [
      referrerId,
    ]);

    if (!referrer) {
      return res.status(400).json({
        error: "Invalid referral",
        details: "Referrer not found",
      });
    }

    // Проверяем, не является ли реферер тем же пользователем
    if (referrerId === userId) {
      return res.status(400).json({
        error: "Invalid referral",
        details: "Cannot refer yourself",
      });
    }

    // Начинаем транзакцию
    await db.run("BEGIN TRANSACTION");

    try {
      // Проверяем, не активировал ли пользователь уже реферальную ссылку
      const existingReferral = await db.get(
        "SELECT * FROM referrals WHERE referred_id = ?",
        [userId]
      );

      if (existingReferral) {
        await db.run("ROLLBACK");
        return res.status(400).json({
          error: "Already referred",
          details: "You have already used a referral link",
        });
      }

      // Создаем или обновляем пользователя
      const user = await db.get("SELECT * FROM users WHERE telegram_id = ?", [
        userId,
      ]);

      if (!user) {
        // Создаем нового пользователя
        await db.run(
          `INSERT INTO users (
            telegram_id, 
            username,
            first_name,
            last_name,
            photo_url,
            balance,
            joined_date,
            last_claim_time,
            referrer_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            userData?.username,
            userData?.first_name,
            userData?.last_name,
            userData?.photo_url,
            2000, // Начальный баланс + бонус
            Date.now(),
            0,
            referrerId,
          ]
        );
      } else {
        // Если пользователь существует, обновляем его данные
        await db.run(
          `UPDATE users 
           SET balance = balance + 1000,
               referrer_id = ?,
               username = COALESCE(?, username),
               first_name = COALESCE(?, first_name),
               last_name = COALESCE(?, last_name),
               photo_url = COALESCE(?, photo_url)
           WHERE telegram_id = ?`,
          [
            referrerId,
            userData?.username,
            userData?.first_name,
            userData?.last_name,
            userData?.photo_url,
            userId,
          ]
        );
      }

      // Добавляем запись в таблицу рефералов
      await db.run(
        `INSERT INTO referrals (
          referrer_id,
          referred_id,
          joined_date,
          referrer_reward,
          referred_reward
        ) VALUES (?, ?, ?, ?, ?)`,
        [referrerId, userId, Date.now(), 1000, 1000]
      );

      // Начисляем бонус рефереру
      await db.run(
        "UPDATE users SET balance = balance + ? WHERE telegram_id = ?",
        [1000, referrerId]
      );

      await db.run("COMMIT");

      res.json({
        success: true,
        reward: {
          referrer: 1000,
          referred: 1000,
        },
      });
    } catch (error) {
      await db.run("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("[Referral] Activation error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Получение информации о подключенном кошельке
router.get("/wallet/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await db.get(
      `SELECT wallet_address, wallet_connected_at 
             FROM users 
             WHERE telegram_id = ?`,
      [userId]
    );

    res.json({
      connected: !!user?.wallet_address,
      address: user?.wallet_address,
      connectedAt: user?.wallet_connected_at,
    });
  } catch (error) {
    console.error("[Wallet Info] Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Подключение кошелька
router.post("/wallet/connect", async (req, res) => {
  try {
    const { userId, walletAddress } = req.body;

    if (!userId || !walletAddress) {
      return res.status(400).json({
        error: "User ID and wallet address are required",
      });
    }

    // Обновляем информацию о кошельке
    await db.run(
      `UPDATE users 
             SET wallet_address = ?, wallet_connected_at = ? 
             WHERE telegram_id = ?`,
      [walletAddress, Date.now(), userId]
    );

    res.json({
      success: true,
      message: "Wallet connected successfully",
    });
  } catch (error) {
    console.error("[Wallet Connect] Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Отключение кошелька
router.post("/wallet/disconnect", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: "User ID is required",
      });
    }

    // Очищаем информацию о кошельке
    await db.run(
      `UPDATE users 
             SET wallet_address = NULL, wallet_connected_at = NULL 
             WHERE telegram_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      message: "Wallet disconnected successfully",
    });
  } catch (error) {
    console.error("[Wallet Disconnect] Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Получение позиции пользователя в рейтинге
router.get("/users/position/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("[Position] Getting position for user:", userId);

    // Получаем реального пользователя
    const user = await db.get(
      "SELECT telegram_id, balance FROM users WHERE telegram_id = ?",
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        details: `No user found with ID ${userId}`,
      });
    }

    // Получаем всех реальных пользователей
    const realUsers = await db.all("SELECT telegram_id, balance FROM users");

    // Объединяем реальных и моковых пользователей
    const allUsers = [...realUsers, ...mockUsers];

    // Сортируем по балансу по убыванию
    allUsers.sort((a, b) => b.balance - a.balance);

    // Находим позицию пользователя
    const position = allUsers.findIndex((u) => u.telegram_id === userId) + 1;

    // Базовое количество пользователей (18,042) + реальные пользователи
    const totalUsers = 18042 + realUsers.length;

    console.log("[Position] Found position:", position);

    res.json({
      position: position,
      total: totalUsers,
    });
  } catch (error) {
    console.error("[Position] Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Получение списка лидеров
router.get("/leaderboard", async (req, res) => {
  try {
    console.log("[Leaderboard] Getting leaderboard data");

    // Получаем реальных пользователей
    const realUsers = await db.all(`
      SELECT telegram_id, username, first_name, last_name, balance 
      FROM users 
      ORDER BY balance DESC 
      LIMIT 20
    `);

    // Форматируем реальных пользователей
    const formattedRealUsers = realUsers.map((user) => ({
      telegram_id: user.telegram_id,
      username:
        user.username ||
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        "VAI's user",
      balance: user.balance,
    }));

    // Объединяем с моковыми пользователями и сортируем
    const allUsers = [...formattedRealUsers, ...mockUsers]
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 20);

    console.log("[Leaderboard] Sending data:", allUsers);

    res.json({
      leaderboard: allUsers.map((user, index) => ({
        position: index + 1,
        telegram_id: user.telegram_id,
        username: user.username,
        balance: user.balance,
      })),
    });
  } catch (error) {
    console.error("[Leaderboard] Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Добавляем новый роут для отметки просмотра сторис
router.post("/stories/mark-shown", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    await db.run("UPDATE users SET stories_shown = 1 WHERE telegram_id = ?", [
      userId,
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error("[Stories] Error marking stories as shown:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot("YOUR_BOT_TOKEN_HERE", { polling: false });

// Маппинг задач к каналам и наградам
const taskChannels = {
  join_community: "@getvaitoken",
  join_luck: "@luck_channel",
  join_aphbt: "@aphbt_channel",
  join_chloe: "@chloe_channel",
  join_suricat: "@suricat_channel",
  join_benzin: "@benzin_channel",
  join_blum: "@blum_channel",
};

const taskRewards = {
  join_community: 500,
  follow_twitter: 500,
  add_stickerpack: 500,
  view_website: 500,
  pass_test: 500,
  react_blum: 500,
  join_luck: 1000,
  join_aphbt: 1000,
  join_chloe: 1000,
  join_suricat: 1000,
  join_benzin: 1000,
  join_blum: 1000,
};

// Проверка членства в канале
async function checkChannelMembership(userId, channelUsername) {
  try {
    const member = await bot.getChatMember(channelUsername, userId);
    console.log(member)
    return ["member", "administrator", "creator"].includes(member.status);
  } catch (error) {
    console.error("[Tasks] Ошибка проверки членства:", error);
    return false;
  }
}

// Получение выполненных задач
router.get("/tasks/completed/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const completedTasks = await db.all(
      "SELECT task_type FROM completed_tasks WHERE user_id = ?",
      [userId]
    );
    res.json({ completed: completedTasks.map((t) => t.task_type) });
  } catch (error) {
    console.error("[Tasks] Ошибка получения выполненных задач:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// Проверка выполнения задачи (для задач с подпиской)
router.post("/tasks/verify", async (req, res) => {
  try {
    const { userId, taskType } = req.body;
    const channelUsername = taskChannels[taskType];
    if (!channelUsername) {
      return res.status(400).json({ error: "Неверный тип задачи" });
    }
    console.log("join")
    const isMember = await checkChannelMembership(userId, channelUsername);
    console.log(isMember)
    if (isMember) {
      const reward = taskRewards[taskType] || 500;
      await db.run(
        "INSERT INTO completed_tasks (user_id, task_type, completed_at, reward) VALUES (?, ?, ?, ?)",
        [userId, taskType, Date.now(), reward]
      );
      await db.run(
        "UPDATE users SET balance = balance + ? WHERE telegram_id = ?",
        [reward, userId]
      );
      res.json({ success: true, reward });
    } else {
      res.json({ success: false, message: "Вы не подписаны на канал" });
    }
  } catch (error) {
    console.error("[Tasks] Ошибка проверки задачи:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

// Завершение задачи (для задач без проверки)
router.post("/tasks/complete", async (req, res) => {
  try {
    const { userId, taskType } = req.body;
    const existing = await db.get(
      "SELECT * FROM completed_tasks WHERE user_id = ? AND task_type = ?",
      [userId, taskType]
    );
    if (existing) {
      return res.status(400).json({ error: "Задача уже выполнена" });
    }
    const reward = taskRewards[taskType] || 500;
    await db.run(
      "INSERT INTO completed_tasks (user_id, task_type, completed_at, reward) VALUES (?, ?, ?, ?)",
      [userId, taskType, Date.now(), reward]
    );
    await db.run(
      "UPDATE users SET balance = balance + ? WHERE telegram_id = ?",
      [reward, userId]
    );
    res.json({ success: true, reward });
  } catch (error) {
    console.error("[Tasks] Ошибка завершения задачи:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

module.exports = router;
