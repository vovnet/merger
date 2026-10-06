import { t } from "../../../locales";
import { TranslationKey } from "../../../locales/ru";
import { GameEvents } from "../../types/GameEvents";
import { EventBus } from "../EventBus";
import { GameState } from "../GameState";
import { ACHIEVEMENTS_CONFIG } from "./AchivementConfig";
import {
  AchievementCategory,
  AchievementProgress,
  AchievementsSaveData,
  AchievementType,
} from "./types";

export class AchievementManager {
  private progress: Map<string, AchievementProgress> = new Map();
  private gameState: GameState;

  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.initProgress();
    this.setupListeners();
  }

  private initProgress(): void {
    ACHIEVEMENTS_CONFIG.forEach((config) => {
      if (!this.progress.has(config.id)) {
        this.progress.set(config.id, {
          currentTierIndex: 0,
          currentValue: 0,
          isTierClaimed: false,
        });
      }
    });
  }

  private setupListeners(): void {
    EventBus.on(GameEvents.GRID_ITEM_MERGED, () => this.checkProgress("MERGE_COUNT"));
    EventBus.on(GameEvents.CONTRACT_COMPLETED, () => this.checkProgress("CONTRACT_COMPLETED"));
    EventBus.on(GameEvents.ROUND_CHANGED, () => this.checkProgress("RANKS_EARNED"));
    EventBus.on(GameEvents.RARE_SQUISH_RANK_CHANGED, () => this.checkProgress("RARE_COLLECTED"));
    EventBus.on(GameEvents.SPINS_CHANGED, () => this.checkProgress("ROULETTE_SPINS"));
    EventBus.on(GameEvents.CREATED_COIN, () => this.checkProgress("SQUISHIES_CREATED"));
  }

  private checkProgress(type: AchievementType): void {
    ACHIEVEMENTS_CONFIG.forEach((config) => {
      if (config.type !== type) return;

      const progress = this.progress.get(config.id)!;

      // Если все уровни пройдены и забраны, дальше не проверяем
      if (progress.currentTierIndex >= config.tiers.length) return;

      // Получаем актуальное значение из GameState
      let currentValue = 0;
      switch (type) {
        case "MERGE_COUNT":
          currentValue = this.gameState.totalMerges;
          break;
        case "CONTRACT_COMPLETED":
          currentValue = this.gameState.contractsCompleted;
          break;
      }

      progress.currentValue = currentValue;

      // 🎯 Проверяем, достигли ли мы цели ТЕКУЩЕГО уровня
      const currentTier = config.tiers[progress.currentTierIndex];
      if (currentValue >= currentTier.targetValue && !progress.isTierClaimed) {
        this.onTierCompleted(config, progress.currentTierIndex);
      }
    });
  }

  private onTierCompleted(config: AchievementCategory, tierIndex: number): void {
    const tier = config.tiers[tierIndex];
    console.log(`🏆 Уровень достижения ${config.id} (${tier.targetValue}) выполнен!`);

    // Показываем Toast-уведомление
    EventBus.emit(GameEvents.ACHIEVEMENT_UNLOCKED, {
      config,
      tier,
      isMaxed: tierIndex === config.tiers.length - 1,
    });
  }

  // 🎯 Игрок нажимает "ЗАБРАТЬ НАГРАДУ"
  public claimReward(categoryId: string): void {
    const config = ACHIEVEMENTS_CONFIG.find((c) => c.id === categoryId);
    const progress = this.progress.get(categoryId)!;

    if (!config || progress.isTierClaimed) return;
    if (progress.currentTierIndex >= config.tiers.length) return;

    const currentTier = config.tiers[progress.currentTierIndex];

    // 1. Выдаем награду
    if (currentTier.rewardCoins > 0) this.gameState.addCoins(currentTier.rewardCoins);
    if (currentTier.rewardSpins > 0) this.gameState.addSpins(currentTier.rewardSpins);

    // 2. Помечаем текущий уровень как забранный
    progress.isTierClaimed = true;

    // 3. 🎯 ПЕРЕХОДИМ К СЛЕДУЮЩЕМУ УРОВНЮ
    progress.currentTierIndex++;
    progress.isTierClaimed = false; // Сбрасываем флаг для нового уровня

    // 4. Проверяем, не выполнен ли новый уровень УЖЕ (например, игрок накопил 600 слияний,
    // забрал награду за 500, и теперь сразу должен видеть прогресс до 2000 как 600/2000)
    this.checkProgress(config.type);

    EventBus.emit(GameEvents.ACHIEVEMENT_CLAIMED, { config, tier: currentTier });
  }

  // 🎯 Метод для UI: возвращает готовые данные для отрисовки
  public getAchievementsForUI() {
    return ACHIEVEMENTS_CONFIG.map((config) => {
      const progress = this.progress.get(config.id)!;
      const isMaxedOut = progress.currentTierIndex >= config.tiers.length;

      // Берем текущий активный уровень (или последний, если все пройдены)
      const currentTier = isMaxedOut
        ? config.tiers[config.tiers.length - 1]
        : config.tiers[progress.currentTierIndex];

      // Формируем красивый текст через вашу систему локализации с параметрами!
      const description = isMaxedOut
        ? t("ACH_MAXED_OUT") // "Максимальный уровень достигнут!"
        : t(config.descKeyTemplate as TranslationKey, {
            current: progress.currentValue,
            target: currentTier.targetValue,
          });

      return {
        ...config,
        progress,
        currentTier,
        isMaxedOut,
        description, // Готовый строковый текст для UI
        canClaim:
          !isMaxedOut &&
          progress.currentValue >= currentTier.targetValue &&
          !progress.isTierClaimed,
      };
    });
  }

  // Сериализация / Десериализация (как и раньше, но для новой структуры)
  public serialize(): AchievementsSaveData {
    return Object.fromEntries(this.progress);
  }

  public deserialize(data: AchievementsSaveData): void {
    if (!data) return;
    Object.entries(data).forEach(([id, progress]) => {
      if (this.progress.has(id)) {
        this.progress.set(id, progress);
      }
    });
  }
}
