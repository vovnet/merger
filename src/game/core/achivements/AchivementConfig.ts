// core/AchievementConfig.ts

import { AchievementCategory } from "./types";

export const ACHIEVEMENTS_CONFIG: AchievementCategory[] = [
  {
    id: "merges",
    titleKey: "ACH_MERGE_TITLE", // "Мастер слияний"
    descKeyTemplate: "ACH_MERGE_DESC", // "Слияний: {current} / {target}"
    icon: "ach_merge",
    type: "MERGE_COUNT",
    tiers: [
      { targetValue: 500, rewardCoins: 5, rewardSpins: 0 },
      { targetValue: 1500, rewardCoins: 10, rewardSpins: 0 },
      { targetValue: 5000, rewardCoins: 15, rewardSpins: 1 },
      { targetValue: 15000, rewardCoins: 25, rewardSpins: 1 },
      { targetValue: 30000, rewardCoins: 50, rewardSpins: 2 },
      { targetValue: 60000, rewardCoins: 80, rewardSpins: 2 },
      { targetValue: 100000, rewardCoins: 120, rewardSpins: 3 },
      { targetValue: 150000, rewardCoins: 180, rewardSpins: 4 },
      { targetValue: 225000, rewardCoins: 250, rewardSpins: 5 },
      { targetValue: 300000, rewardCoins: 320, rewardSpins: 10 },
    ],
  },

  {
    id: "contracts",
    titleKey: "ACH_CONTRACT_TITLE", // "Исполнительный директор"
    descKeyTemplate: "ACH_CONTRACT_DESC", // "Контрактов: {current} / {target}"
    icon: "ach_contract",
    type: "CONTRACT_COMPLETED",
    tiers: [
      { targetValue: 5, rewardCoins: 5, rewardSpins: 0 },
      { targetValue: 15, rewardCoins: 10, rewardSpins: 0 },
      { targetValue: 35, rewardCoins: 15, rewardSpins: 0 }, // 1 час
      { targetValue: 75, rewardCoins: 20, rewardSpins: 0 },
      { targetValue: 150, rewardCoins: 25, rewardSpins: 0 },
      { targetValue: 350, rewardCoins: 35, rewardSpins: 0 },
      { targetValue: 750, rewardCoins: 50, rewardSpins: 0 },
      { targetValue: 1500, rewardCoins: 75, rewardSpins: 0 },
      { targetValue: 2500, rewardCoins: 100, rewardSpins: 0 },
      { targetValue: 3500, rewardCoins: 150, rewardSpins: 0 },
    ],
  },

  {
    id: "spins",
    titleKey: "ACH_ROULETTE_SPINS_TITLE",
    descKeyTemplate: "ACH_ROULETTE_SPINS_DESC",
    icon: "ach_spin",
    type: "ROULETTE_SPINS",
    tiers: [
      { targetValue: 10, rewardCoins: 10, rewardSpins: 0 }, // 1 час (возврат 10%)
      { targetValue: 25, rewardCoins: 15, rewardSpins: 0 }, // 2.5 часа
      { targetValue: 50, rewardCoins: 20, rewardSpins: 0 }, // 5 часов
      { targetValue: 100, rewardCoins: 25, rewardSpins: 0 }, // 10 часов (Круглая цифра!)
      { targetValue: 200, rewardCoins: 40, rewardSpins: 0 }, // 20 часов
      { targetValue: 350, rewardCoins: 50, rewardSpins: 0 }, // 35 часов
      { targetValue: 500, rewardCoins: 75, rewardSpins: 0 }, // 50 часов (ЭКВАТОР! 🎯)
      { targetValue: 700, rewardCoins: 100, rewardSpins: 0 }, // 70 часов
      { targetValue: 850, rewardCoins: 140, rewardSpins: 0 }, // 85 часов
      { targetValue: 1000, rewardCoins: 200, rewardSpins: 0 },
    ],
  },

  {
    id: "squishies",
    titleKey: "ACH_SQUISHIES_CREATED_TITLE",
    descKeyTemplate: "ACH_SQUISHIES_CREATED_DESC",
    icon: "ach_squishies",
    type: "SQUISHIES_CREATED",
    tiers: [
      { targetValue: 20, rewardCoins: 5, rewardSpins: 0 },
      { targetValue: 50, rewardCoins: 10, rewardSpins: 0 },
      { targetValue: 180, rewardCoins: 15, rewardSpins: 0 }, // 1 час
      { targetValue: 400, rewardCoins: 20, rewardSpins: 0 },
      { targetValue: 1000, rewardCoins: 25, rewardSpins: 0 },
      { targetValue: 2500, rewardCoins: 30, rewardSpins: 0 },
      { targetValue: 5000, rewardCoins: 50, rewardSpins: 0 },
      { targetValue: 8000, rewardCoins: 70, rewardSpins: 0 },
      { targetValue: 12000, rewardCoins: 100, rewardSpins: 0 },
      { targetValue: 18000, rewardCoins: 150, rewardSpins: 0 },
    ],
  },

  {
    id: "rare",
    titleKey: "ACH_RARE_COLLECTED_TITLE",
    descKeyTemplate: "ACH_RARE_COLLECTED_DESC",
    icon: "ach_rare",
    type: "RARE_COLLECTED",
    tiers: [
      { targetValue: 1, rewardCoins: 5, rewardSpins: 0 }, // Первый редкий!
      { targetValue: 5, rewardCoins: 10, rewardSpins: 0 }, // Начало коллекции
      { targetValue: 12, rewardCoins: 15, rewardSpins: 0 }, // Разгон
      { targetValue: 20, rewardCoins: 20, rewardSpins: 0 }, // Почти треть
      { targetValue: 30, rewardCoins: 25, rewardSpins: 0 }, // Почти половина
      { targetValue: 40, rewardCoins: 30, rewardSpins: 0 }, // Больше половины
      { targetValue: 50, rewardCoins: 40, rewardSpins: 0 }, // Серьезная коллекция
      { targetValue: 56, rewardCoins: 50, rewardSpins: 0 }, // Осталось чуть-чуть
      { targetValue: 60, rewardCoins: 75, rewardSpins: 0 }, // Финальный рывок (осталось 4!)
      { targetValue: 64, rewardCoins: 100, rewardSpins: 0 },
    ],
  },

  {
    id: "ranks",
    titleKey: "ACH_RANKS_EARNED_TITLE",
    descKeyTemplate: "ACH_RANKS_EARNED_DESC",
    icon: "ach_rank",
    type: "RANKS_EARNED",
    startFrom: 1,
    tiers: [
      { targetValue: 2, rewardCoins: 30, rewardSpins: 0 }, // 2.5 часа
      { targetValue: 3, rewardCoins: 40, rewardSpins: 0 }, // 5 часов
      { targetValue: 5, rewardCoins: 60, rewardSpins: 0 }, // 10 часов
      { targetValue: 8, rewardCoins: 100, rewardSpins: 0 }, // 17 часов
      { targetValue: 12, rewardCoins: 150, rewardSpins: 0 }, // 26 часов
      { targetValue: 17, rewardCoins: 200, rewardSpins: 0 }, // 38 часов
      { targetValue: 23, rewardCoins: 260, rewardSpins: 0 }, // 52 часа
      { targetValue: 30, rewardCoins: 350, rewardSpins: 0 }, // 68 часов
      { targetValue: 36, rewardCoins: 440, rewardSpins: 0 }, // 82 часа
      { targetValue: 42, rewardCoins: 500, rewardSpins: 0 }, // 100 часов (ЛЕГЕНДА)
    ],
  },
];
