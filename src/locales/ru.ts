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

  SHOP_TITLE: "МАГАЗИН",
} as const;

export type TranslationKey = keyof typeof ru;
