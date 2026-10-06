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
      { targetValue: 100, rewardCoins: 100, rewardSpins: 0 },
      { targetValue: 500, rewardCoins: 500, rewardSpins: 0 },
      { targetValue: 2000, rewardCoins: 2000, rewardSpins: 0 },
      {
        targetValue: 10000,
        rewardCoins: 10000,
        rewardSpins: 10,
      },
    ],
  },

  {
    id: "contracts",
    titleKey: "ACH_CONTRACT_TITLE", // "Исполнительный директор"
    descKeyTemplate: "ACH_CONTRACT_DESC", // "Контрактов: {current} / {target}"
    icon: "ach_contract",
    type: "CONTRACT_COMPLETED",
    tiers: [
      { targetValue: 5, rewardCoins: 200, rewardSpins: 0 },
      { targetValue: 10, rewardCoins: 1000, rewardSpins: 0 },
      { targetValue: 20, rewardCoins: 1000, rewardSpins: 0 },
      { targetValue: 35, rewardCoins: 1000, rewardSpins: 0 },
      { targetValue: 60, rewardCoins: 1000, rewardSpins: 0 },
      { targetValue: 100, rewardCoins: 1000, rewardSpins: 0 },
      { targetValue: 150, rewardCoins: 1000, rewardSpins: 0 },
      { targetValue: 250, rewardCoins: 1000, rewardSpins: 0 },
    ],
  },

  {
    id: "spins",
    titleKey: "ACH_ROULETTE_SPINS_TITLE",
    descKeyTemplate: "ACH_ROULETTE_SPINS_DESC",
    icon: "ach_spin",
    type: "ROULETTE_SPINS",
    tiers: [
      { targetValue: 10, rewardCoins: 10, rewardSpins: 0 },
      { targetValue: 50, rewardCoins: 50, rewardSpins: 0 },
      { targetValue: 250, rewardCoins: 50, rewardSpins: 0 },
      { targetValue: 1000, rewardCoins: 50, rewardSpins: 0 },
    ],
  },

  {
    id: "squishies",
    titleKey: "ACH_SQUISHIES_CREATED_TITLE",
    descKeyTemplate: "ACH_SQUISHIES_CREATED_DESC",
    icon: "ach_squishies",
    type: "SQUISHIES_CREATED",
    tiers: [
      { targetValue: 20, rewardCoins: 10, rewardSpins: 0 },
      { targetValue: 100, rewardCoins: 20, rewardSpins: 0 },
      { targetValue: 300, rewardCoins: 20, rewardSpins: 0 },
      { targetValue: 1000, rewardCoins: 20, rewardSpins: 0 },
      { targetValue: 2000, rewardCoins: 20, rewardSpins: 0 },
    ],
  },

  {
    id: "rare",
    titleKey: "ACH_RARE_COLLECTED_TITLE",
    descKeyTemplate: "ACH_RARE_COLLECTED_DESC",
    icon: "ach_rare",
    type: "RARE_COLLECTED",
    tiers: [
      { targetValue: 1, rewardCoins: 10, rewardSpins: 0 },
      { targetValue: 5, rewardCoins: 20, rewardSpins: 0 },
      { targetValue: 15, rewardCoins: 20, rewardSpins: 0 },
      { targetValue: 30, rewardCoins: 20, rewardSpins: 0 },
      { targetValue: 50, rewardCoins: 20, rewardSpins: 0 },
      { targetValue: 60, rewardCoins: 20, rewardSpins: 0 },
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
      { targetValue: 2, rewardCoins: 10, rewardSpins: 0 },
      { targetValue: 3, rewardCoins: 20, rewardSpins: 0 },
      { targetValue: 5, rewardCoins: 20, rewardSpins: 0 },
      { targetValue: 10, rewardCoins: 20, rewardSpins: 0 },
      { targetValue: 15, rewardCoins: 20, rewardSpins: 0 },
      { targetValue: 20, rewardCoins: 20, rewardSpins: 0 },
    ],
  },
];
