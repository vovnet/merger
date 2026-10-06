export type AchievementType =
  | "MERGE_COUNT"
  | "CONTRACT_COMPLETED"
  | "ROULETTE_SPINS"
  | "SQUISHIES_CREATED"
  | "RARE_COLLECTED"
  | "RANKS_EARNED";

// Отдельный шаг (уровень) внутри достижения
export interface AchievementTier {
  targetValue: number;
  rewardCoins: number;
  rewardSpins: number;
}

// Вся категория достижения (например, "Мастер слияний")
export interface AchievementCategory {
  id: string; // "merges", "contracts"
  titleKey: string; // Ключ локализации заголовка
  descKeyTemplate: string; // Шаблон описания: "Сделай {current} из {target} слияний"
  icon: string; // Спрайт иконки
  type: AchievementType;
  tiers: AchievementTier[]; // Массив шагов: 100, 500, 2000...
}

// Прогресс игрока по конкретной категории
export interface AchievementProgress {
  currentTierIndex: number; // На каком мы сейчас шаге (0, 1, 2...)
  currentValue: number; // Текущее значение из GameState
  isTierClaimed: boolean; // Забрал ли игрок награду за ТЕКУЩИЙ шаг
}

export type AchievementsSaveData = Record<string, AchievementProgress>;
