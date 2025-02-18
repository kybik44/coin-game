// В начале файла
window.tg = window.tg || window.Telegram?.WebApp;

const GAME_CONFIG = {
    COST: 0,
    WINNING_CHANCE: 0.1,
    POSSIBLE_REWARDS: [3000, 5000, 10000],
    CARD_IMAGES: {
        0: 'images/card0.png',
        3000: 'images/card10-2.png',
        5000: 'images/card10-1.png',
        10000: 'images/card10.png',
    },
    UPDATE_INTERVAL: 3000,
    REWARD_AMOUNT: 100,
    FIREWORKS_TIMEOUT: 2000,
    GAME_RESULT_TIMEOUT: 1000,
    RESET_GAME_TIMEOUT: 2000,
    FIREWORKS_PARTICLES: 50,
    FIREWORKS_SPREAD: 400,
    FIREWORKS_HUE_MIN: 20,
    FIREWORKS_HUE_RANGE: 40
};

let coins = 0;
let lastCollectedTime = new Date().getTime();
let flippedCards = [];
let cardValues = [];

// Получаем элементы DOM
const coinCountElement = document.getElementById('coin-count');
const timerElement = document.getElementById('timer');
const referralLinkElement = document.getElementById('referral-link');
const referralResultElement = document.getElementById('referral-result');
const startGameButton = document.getElementById('start-game-button');
const highStakesStart = document.getElementById('high-stakes-start');
const highStakesGame = document.getElementById('high-stakes-game');
const cardsContainer = document.getElementById('cards-container');
const gameResult = document.getElementById('game-result');

// В начале файла, после объявления переменных
const PRELOADER_TIMEOUT = 3000; // 3 секунды

// Добавьте функцию для управления прелоадером
function hidePreloader() {
    const preloader = document.getElementById('preloader');
    const mainContainer = document.getElementById('main-container');
    
    if (preloader && mainContainer) {
        setTimeout(() => {
            preloader.style.opacity = '0';
            preloader.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                preloader.classList.add('hidden');
                mainContainer.classList.remove('hidden');
            }, 500);
        }, PRELOADER_TIMEOUT);
    }
}

// Функция инициализации Telegram WebApp
function initTelegramWebApp() {
    return new Promise((resolve, reject) => {
        try {
            if (window.Telegram?.WebApp) {
                window.tg = window.Telegram.WebApp;
                window.tg.ready();
                window.tg.expand();
                
                console.log('Telegram WebApp initialized:', {
                    initData: window.tg.initData,
                    initDataUnsafe: window.tg.initDataUnsafe,
                    version: window.tg.version,
                    platform: window.tg.platform
                });
                
                resolve(window.tg);
            } else {
                reject(new Error('Telegram WebApp not found'));
            }
        } catch (error) {
            reject(error);
        }
    });
}

// Функция получения ID пользователя из Telegram WebApp
function getUserId() {
    try {
        const tg = window.Telegram?.WebApp;
        if (!tg || !tg.initDataUnsafe?.user?.id) {
            console.error('Не удалось получить Telegram ID пользователя');
            return null;
        }
        
        // Получаем Telegram ID пользователя
        const telegramId = tg.initDataUnsafe.user.id;
        console.log('Telegram user ID:', telegramId);
        
        return telegramId.toString();
    } catch (error) {
        console.error('Error getting Telegram user ID:', error);
        return null;
    }
}

// Функция получения данных пользователя из Telegram
function getTelegramUserData() {
    try {
        const tg = window.Telegram?.WebApp;
        if (!tg || !tg.initDataUnsafe?.user) {
            return null;
        }
        
        const user = tg.initDataUnsafe.user;
        return {
            id: user.id.toString(),
            username: user.username || null,
            firstName: user.first_name || null,
            lastName: user.last_name || null,
            languageCode: user.language_code || 'en',
            photoUrl: user.photo_url || null
        };
    } catch (error) {
        console.error('Error getting Telegram user data:', error);
        return null;
    }
}

// Функция для отображения фейерверков
function showFireworks() {
    const container = document.querySelector('.fireworks-container');
    if (!container) return;
    
    container.innerHTML = '';
    container.style.display = 'block';

    for (let i = 0; i < GAME_CONFIG.FIREWORKS_PARTICLES; i++) {
        const firework = document.createElement('div');
        firework.classList.add('firework');
        firework.style.setProperty('--x', `${Math.random() * GAME_CONFIG.FIREWORKS_SPREAD - GAME_CONFIG.FIREWORKСS_SPREAD/2}px`);
        firework.style.setProperty('--y', `${Math.random() * GAME_CONFIG.FIREWORKСS_SPREAD - GAME_CONFIG.FIREWORKСS_SPREAD/2}px`);
        firework.style.backgroundColor = `hsl(${Math.random() * GAME_CONFIG.FIREWORKСS_HUE_RANGE + GAME_CONFIG.FIREWORKСS_HUE_MIN}, 100%, 50%)`;
        container.appendChild(firework);
    }

    setTimeout(() => {
        container.style.display = 'none';
    }, GAME_CONFIG.FIREWORKСS_TIMEOUT);
}

// Обновляем функцию collectCoins
async function collectCoins(userId) {
    try {
        if (!userId) {
            console.error('User ID is undefined');
            return;
        }

        const response = await fetch('/api/claim', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Error collecting coins');
        }
        
        // Добавляем анимацию нажатия на шарик
        const balloon = document.querySelector('.balloon');
        if (balloon) {
            balloon.classList.add('pressed');
            setTimeout(() => balloon.classList.remove('pressed'), 2000);
        }
        
    } catch (error) {
        console.error('Error collecting coins:', error);
        window.Telegram?.WebApp?.showAlert(error.message || 'Error collecting coins');
    }
}

// Функция для показа экрана
function showScreen(screenNumber) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById(`screen-${screenNumber}`).classList.add('active');
    updateActiveNav(screenNumber);
}

// Функция обновления навигации
function updateActiveNav(screenNumber) {
    document.querySelectorAll('.nav-item').forEach((item, index) => {
        item.classList.toggle('active', index === screenNumber - 1);
    });
}

// Функция получения баланса
async function getBalance(userId) {
    try {
        const response = await fetch(`/api/balance/${userId}`);
        const data = await response.json();
        return data.balance;
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
}

// Функция для запроса награды
async function claimReward(userId) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CLAIM}`, {
            method: 'POST',
            headers: API_CONFIG.HEADERS,
            body: JSON.stringify({ userId })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        lastCollectedTime = Date.now();
        getBalance(userId);

    } catch (error) {
        console.error('Error claiming reward:', error);
    }
}

// Функция начала игры
function startGame() {
    if (!highStakesStart || !highStakesGame || !cardsContainer) return;

    highStakesStart.classList.add('hidden');
    highStakesGame.classList.remove('hidden');

    cardValues = generateCardValues();
    cardsContainer.innerHTML = '';
    flippedCards = [];

    cardValues.forEach((value, index) => {
        const card = document.createElement('div');
        card.classList.add('card');
        
        // Создаем переднюю сторону карты
        const frontFace = document.createElement('div');
        frontFace.classList.add('card-face', 'card-front');
        
        // Создаем заднюю сторону карты
        const backFace = document.createElement('div');
        backFace.classList.add('card-face', 'card-back');
        backFace.style.backgroundImage = `url('${GAME_CONFIG.CARD_IMAGES[value]}')`;
        
        // Добавляем обе стороны к карте
        card.appendChild(frontFace);
        card.appendChild(backFace);
        
        card.dataset.value = value;
        card.addEventListener('click', () => flipCard(card, index));
        cardsContainer.appendChild(card);
    });
}

// Функция генерации значений карт
function generateCardValues() {
    const possibleValues = [0, 0, 0, 0];
    if (Math.random() < GAME_CONFIG.WINNING_CHANCE) {
        const valuableCardValue = GAME_CONFIG.POSSIBLE_REWARDS[
            Math.floor(Math.random() * GAME_CONFIG.POSSIBLE_REWARDS.length)
        ];
        possibleValues[Math.floor(Math.random() * 4)] = valuableCardValue;
    }
    return possibleValues.sort(() => Math.random() - 0.5);
}

// Функция переворота карты
function flipCard(card, index) {
    if (flippedCards.length >= 2 || card.classList.contains('flipped')) return;

    card.classList.add('flipped');
    const cardImage = GAME_CONFIG.CARD_IMAGES[card.dataset.value];
    if (cardImage) {
        card.style.backgroundImage = `url('${cardImage}')`;
    }
    flippedCards.push(card);

    if (flippedCards.length === 2) endGame();
}

// Функция завершения игры
function endGame() {
    if (!gameResult) return;

    const totalWin = flippedCards.reduce((sum, card) => {
        return sum + (parseInt(card.dataset.value, 10) || 0);
    }, 0);

    const userId = getUserId();
    if (!userId) {
        console.error('User ID is undefined');
        return;
    }

    fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPDATE_BALANCE}`, {
        method: 'POST',
        headers: API_CONFIG.HEADERS,
        body: JSON.stringify({ userId, amount: totalWin })
    })
    .then(response => response.json())
    .then(data => {
        setTimeout(() => {
            gameResult.textContent = totalWin > 0 ? 
                `You won ${totalWin} VAI!` : 
                'You didn\'t win anything.';
            setTimeout(() => resetGame(), GAME_CONFIG.RESET_GAME_TIMEOUT);
        }, GAME_CONFIG.GAME_RESULT_TIMEOUT);
    })
    .catch(error => {
        console.error('Error updating balance:', error);
    });
}

// Функция сброса игры
function resetGame() {
    if (!highStakesGame || !highStakesStart || !gameResult) return;

    highStakesGame.classList.add('hidden');
    highStakesStart.classList.remove('hidden');
    gameResult.textContent = '';
    getBalance(getUserId());
}

// Функция обновления профиля
function updateProfileButton() {
    const profileButton = document.getElementById('profile-button');
    if (profileButton && window.tg?.initDataUnsafe?.user) {
        const user = window.tg.initDataUnsafe.user;
        const displayName = user.username || 
                          `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
                          'Guest';
        profileButton.textContent = displayName;
    }
}

// Инициализация приложения
async function initializeApp() {
    try {
        const tg = window.Telegram?.WebApp;
        if (!tg) {
            throw new Error('Telegram WebApp не доступен');
        }

        // Инициализируем Telegram WebApp
        tg.ready();
        tg.expand(); // Расширяем на весь экран

        // Получаем данные пользователя
        const userData = getTelegramUserData();
        if (!userData) {
            throw new Error('Не удалось получить данные пользователя');
        }

        // Настраиваем внешний вид WebApp
        tg.MainButton.hide(); // Скрываем главную кнопку
        tg.BackButton.hide(); // Скрываем кнопку "назад"
        
        // Устанавливаем цвет темы
        document.documentElement.style.setProperty(
            '--tg-theme-bg-color', 
            tg.themeParams.bg_color || '#ffffff'
        );
        document.documentElement.style.setProperty(
            '--tg-theme-text-color', 
            tg.themeParams.text_color || '#000000'
        );

        return userData;
    } catch (error) {
        console.error('Error initializing app:', error);
        return null;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Инициализируем приложение
        const userData = await initializeApp();
        if (!userData) {
            throw new Error('Не удалось инициализировать приложение');
        }

        // Скрываем прелоадер
        hidePreloader();

        // Обновляем интерфейс с данными пользователя
        if (userData.photoUrl) {
            const avatarElements = document.querySelectorAll('.user-avatar img');
            avatarElements.forEach(avatar => {
                avatar.src = userData.photoUrl;
            });
        }

        // Добавляем обработчик для кнопки сбора монет
        const balloon = document.querySelector('.balloon');
        if (balloon) {
            balloon.addEventListener('click', () => collectCoins(userData.id));
        }

    } catch (error) {
        console.error('Initialization error:', error);
        alert('Произошла ошибка при запуске приложения');
    }
});
