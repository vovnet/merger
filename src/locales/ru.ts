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
} as const;

export type TranslationKey = keyof typeof ru;
