const tg = window.tg || window.Telegram?.WebApp;

document.addEventListener('DOMContentLoaded', () => {
    try {
        tg.ready();
        tg.expand();
    } catch (error) {
        console.error('Error initializing Telegram WebApp:', error);
    }

    const gotchaButton = document.querySelector('.gotcha-button');
    if (gotchaButton) {
        gotchaButton.addEventListener('click', () => {
            window.location.href = '../high-stakes/high-stakes.html';
        });
    }
});

// Функция для рендеринга списка игр будет добавлена после получения JSON
function renderGames(games) {
    const gamesList = document.querySelector('.games-list');
    if (!gamesList || !games) return;
    
    gamesList.innerHTML = ''; // Очищаем список перед рендерингом
    // Здесь будет код для отображения игр из JSON
}