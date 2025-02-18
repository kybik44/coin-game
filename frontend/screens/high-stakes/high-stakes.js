const tg = window.Telegram?.WebApp;
console.log("Telegram WebApp:", tg);

let flippedCards = [];

// Функция начала игры
async function startGame() {
    try {
        // Проверяем инициализацию Telegram WebApp
        if (!tg) {
            throw new Error("Telegram WebApp not initialized");
        }

        // Получаем ID пользователя
        const userId = tg.initDataUnsafe?.user?.id;
        console.log("User ID:", userId);

        if (!userId) {
            throw new Error("User ID not available");
        }

        // Проверяем баланс перед началом игры
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/balance/${userId}`);
        if (!response.ok) {
            throw new Error("Failed to get balance");
        }

        const balanceData = await response.json();
        console.log("Balance data:", balanceData);

        if (balanceData.balance < GAME_CONFIG.COST) {
            tg.showPopup({
                title: "Insufficient Balance",
                message: `You need ${GAME_CONFIG.COST} VAI to play. Current balance: ${balanceData.balance} VAI`,
                buttons: [{ type: "ok" }]
            });
            return;
        }

        // Списываем стоимость игры
        const startGameResponse = await fetch(`${API_CONFIG.BASE_URL}/api/game/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: userId.toString() })
        });

        if (!startGameResponse.ok) {
            const errorData = await startGameResponse.json();
            throw new Error(errorData.error || "Failed to start game");
        }

        // Обновляем баланс
        if (window.BalanceManager) {
            await window.BalanceManager.fetchBalance(userId.toString());
        }

        // Переходим на страницу игры
        window.location.href = "game.html";
    } catch (error) {
        console.error("Error starting game:", error);
        tg.showPopup({
            title: "Error",
            message: error.message || "Failed to start game",
            buttons: [{ type: "ok" }]
        });
    }
}

function generateCardValues() {
    const values = [0, 0, 0, 0];
    
    // if (Math.random() < 0.1) {
        const winningPosition = Math.floor(Math.random() * 4);
        const winningValues = [3000, 5000, 10000];
        const winningValue = winningValues[Math.floor(Math.random() * winningValues.length)];
        values[winningPosition] = winningValue;
    // }
    
    return values;
}

function showCards() {
    const highStakesStart = document.querySelector('.high-stakes-start');
    const highStakesGame = document.querySelector('.high-stakes-game');
    
    if (!highStakesStart || !highStakesGame) return;
    
    highStakesStart.classList.add('hidden');
    highStakesGame.classList.remove('hidden');
    
    const cardValues = generateCardValues();
    flippedCards = [];
    
    const cardsContainer = document.getElementById('cards-container');
    if (!cardsContainer) return;

    cardsContainer.innerHTML = cardValues.map((value, index) => `
        <div class="card" data-index="${index}" data-value="${value}">
            <div class="card-inner">
                <div class="card-front"></div>
                <div class="card-back" style="background-image: url('${GAME_CONFIG.CARD_IMAGES[value]}')"></div>
            </div>
        </div>
    `).join('');
    
    // Добавляем обработчики на карты
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('click', () => flipCard(card));
    });
}

function flipCard(card) {
    if (flippedCards.length >= 2 || card.classList.contains('flipped')) return;
    
    card.classList.add('flipped');
    flippedCards.push(card);
    
    if (flippedCards.length === 2) {
        setTimeout(() => {
            endGame();
        }, 1000);
    }
}

// Добавляем вспомогательные функции
function formatBalance(amount) {
    return amount.toLocaleString();
}

async function getBalance() {
    try {
        const userId = window.tg.initDataUnsafe?.user?.id;
        if (!userId) return 0;

        const response = await fetch(`/api/balance/${userId}`);
        const data = await response.json();
        return data.balance || 0;
    } catch (error) {
        console.error('Error getting balance:', error);
        return 0;
    }
}

// Обновляем функцию endGame
async function endGame() {
    const totalWin = flippedCards.reduce((sum, card) => {
        return sum + parseInt(card.dataset.value || 0);
    }, 0);
    
    if (totalWin > 0) {
        try {
            const currentBalance = await getBalance();
            const userId = window.tg.initDataUnsafe?.user?.id;
            
            if (!userId) {
                throw new Error('User ID is undefined');
            }

            const response = await fetch('/api/game/win', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount: totalWin })
            });

            if (response.ok) {
                window.tg.showAlert(`Congratulations! You won ${formatBalance(totalWin)} VAI!`);
            }
        } catch (error) {
            console.error('Error processing win:', error);
            window.tg.showAlert('Error processing win');
        }
    } else {
        window.tg.showAlert('No win this time. Try again!');
    }
    
    setTimeout(() => {
        const gameContainer = document.getElementById('high-stakes-game');
        const startContainer = document.getElementById('high-stakes-start');
        
        if (gameContainer && startContainer) {
            gameContainer.classList.add('hidden');
            startContainer.classList.remove('hidden');
        }
    }, 1000);
}

function updateBalanceDisplay() {
    const balanceElement = document.querySelector('.balance-amount');
    if (balanceElement) {
        balanceElement.textContent = formatBalance(getBalance());
    }
}

// Инициализация страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded');
    
    // Инициализируем Telegram WebApp
    if (tg) {
        tg.ready();
        tg.expand();
    }

    // Показываем контейнер
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) {
        mainContainer.classList.remove('hidden');
    }

    // Добавляем обработчик на кнопку возврата
    const clickButton = document.querySelector('.click-button');
    if (clickButton) {
        clickButton.addEventListener('click', () => {
            window.location.href = '../games/games.html';
        });
    }

    // Добавляем обработчик на кнопку игры
    const gambleButton = document.querySelector('.white-button');
    console.log('gambleButton:', gambleButton);
    if (gambleButton) {
        gambleButton.addEventListener('click', startGame);
    }
});

// Функция для обработки выигрыша
async function handleWin(amount) {
    try {
        const userId = tg.initDataUnsafe?.user?.id;
        if (!userId) {
            console.error('User ID is undefined');
            return;
        }

        const response = await fetch('/api/game/win', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, amount })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Обновляем баланс
            const balanceElement = document.querySelector('.balanceАmount');
            if (balanceElement) {
                balanceElement.textContent = data.balance.toLocaleString();
            }

            // Показываем сообщение о выигрыше
            tg.showAlert(`Congratulations! You won ${amount} VAI!`);
        }
    } catch (error) {
        tg.showAlert('Error processing win');
    }
}