const GAME_CONFIG = {
    // Основные параметры игры
    COST: 300,
    WINNING_CHANCE: 0.1, // Установлен шанс выигрыша 10%
    POSSIBLE_REWARDS: [3000, 5000, 10000],
    
    // Изображения карт
    CARD_IMAGES: {
        0: '../../images/card0.png',
        3000: '../../images/card3.png',
        5000: '../../images/card5.png',
        10000: '../../images/card10.png'
    },

    // Таймауты и задержки
    RESET_GAME_TIMEOUT: 2000,
    FLIP_ANIMATION_DURATION: 1000,
    RETURN_TO_MENU_DELAY: 2000,

    // Анимации и визуальные эффекты
    FIREWORKS: {
        SPREAD: 70,
        DURATION: 5000,
        PARTICLE_COUNT: 50,
        COLORS: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
    },

    // Игровые ограничения
    MAX_FLIPS: 2,
    CARDS_COUNT: 4,

    // Сообщения
    MESSAGES: {
        WIN: 'Congratulations! You won {amount} VAI!',
        NO_WIN: 'Better luck next time!',
        INSUFFICIENT_BALANCE: 'You need {cost} VAI to play. Current balance: {balance} VAI',
        ERROR: 'Something went wrong. Please try again.'
    },

    // Классы CSS для анимаций
    CSS_CLASSES: {
        FLIPPED: 'flipped',
        HIDDEN: 'hidden',
        DISABLED: 'disabled',
        CLICKED: 'clicked'
    }
};

window.GAME_CONFIG = GAME_CONFIG;