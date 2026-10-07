export const ru = {
  // Общие
  TAP_TO_CONTINUE: "Нажмите, чтобы продолжить",

  // Рулетка
  ROULETTE_TITLE: "СКВИШ-ВЕРТУШКА",
  RARE_SQUISH: "РЕДКИЙ",

  // Коллекция
  COLLECTION_TITLE: "МОЯ КОЛЛЕКЦИЯ",
  NORMAL_SQUISHES: "ОБЫЧНЫЕ",
  RARE_SQUISHES: "РЕДКИЕ",
  DISCOVERED: "Открыто: {current} / {total}",
  TOTAL_DISCOVERED: "Всего открыто: {current} / {total}",

  // Контракты
  CONTRACT: "КОНТРАКТ",
  REWARD_RECEIVE: "ЗАБРАТЬ",

  // Награды
  RANK_LABEL: "РАНГ {rank}",
  AD_NOTIFICATION: "Рекламная пауза \n{seconds} сек...",
  LOADING: "ЗАГРУЗКА...",

  // Лидерборд
  LEADERBOARD_TITLE: "ЛУЧШИЕ ИГРОКИ",
  YOU: "ВЫ {name}",
  LEADERBOARD_EMPTY: "ЛИДЕРБОРД ПОКА ПУСТ",
  LEADERBOARD_FAIL_LOAD: "НЕ УДАЛОСЬ ЗАГРУЗИТЬ ЛИДЕРБОРД",

  // 🎯 Обучение (Туториал)
  TUTORIAL_MERGE_INTRO: "Привет! \nДавай заселим поле первыми сквишами!",
  TUTORIAL_MERGE_ACTION:
    "Супер! Перетащи одинаковых сквишей друг на друга, чтобы они объединились!",
  TUTORIAL_FACTORY_CREATE: "Нажми на фабрику, чтобы создать пачку!",
  TUTORIAL_ROULETTE_TICKET: "Ура! У тебя появился билет для Сквиш-Вертушки!",
  TUTORIAL_ROULETTE_OPEN: "Нажми сюда, чтобы открыть Сквиш-Вертушку!",
  TUTORIAL_ROULETTE_SPIN: "Давай проверим удачу! Крути вертушку и забирай награду!",
  TUTORIAL_CONTRACT_INTRO: "Собирай нужных сквишей на поле, выполняй контракты и получай призы!",
  TUTORIAL_CONTRACT_REWARD: "Отличная работа! Забирай награду за выполненный контракт!",

  // Оценка игры
  RATING_TITLE: "Оцени игру и получи награду!",
  RATING_BUTTON: "Оценить и получить",
  RATING_THANK_YOU: "СПАСИБО!",

  // Достижения (Achievements)
  ACHIEVEMENTS_TITLE: "ДОСТИЖЕНИЯ",
  ACH_REWARD: "Награда: \n{reward}",
  ACH_PROGRESS: "Прогресс: {current} / {total}",
  ACH_MAXED_OUT: "МАКСИМУМ!", // Вместо скучного "Выполнено"

  ACH_MERGE_TITLE: "Мердж-магнат",
  ACH_MERGE_DESC: "Склей {target} сквишей!",

  ACH_CONTRACT_TITLE: "Босс заказов",
  ACH_CONTRACT_DESC: "Закрой {target} контрактов!",

  ACH_ROULETTE_SPINS_TITLE: "Фортунчик",
  ACH_ROULETTE_SPINS_DESC: "Крутни рулетку {target} раз!",

  ACH_SQUISHIES_CREATED_TITLE: "Сквиш-мейкер",
  ACH_SQUISHIES_CREATED_DESC: "Создай {target} сквишей на фабрике!",

  ACH_RARE_COLLECTED_TITLE: "Охотник за рарками", // "Рарки" — понятный и классный геймерский сленг
  ACH_RARE_COLLECTED_DESC: "Найди {target} редких сквишей!",

  ACH_RANKS_EARNED_TITLE: "Легенда сквишей",
  ACH_RANKS_EARNED_DESC: "Покори {target} ранг!",

  SHOP_TITLE: "МАГАЗИН",
} as const;

export type TranslationKey = keyof typeof ru;
