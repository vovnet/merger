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
          currentValue: config.startFrom ?? 0,
          isTierClaimed: false,
        });
      }
    });
  }

  private setupListeners(): void {
    EventBus.on(GameEvents.SCORE_CHANGED, () => this.checkProgress("MERGE_COUNT"));
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
        case "RANKS_EARNED":
          currentValue = this.gameState.round;
          break;
        case "ROULETTE_SPINS":
          currentValue = this.gameState.spendedSpins;
          break;
        case "RARE_COLLECTED":
          currentValue = this.gameState.getDiscoveredRareSquishCount();
          break;
        case "SQUISHIES_CREATED":
          currentValue = this.gameState.createdSquishies;
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

    // Защита: если конфиг не найден или все тиры уже пройдены
    if (!config || progress.currentTierIndex >= config.tiers.length) return;

    let totalCoins = 0;
    let totalSpins = 0;
    let lastClaimedTier = null;

    // 🎯 ЦИКЛ МАССОВОГО СБОРА:
    // Проходим по всем тирам, начиная с текущего, которые УЖЕ выполнены по значению (currentValue >= targetValue)
    while (
      progress.currentTierIndex < config.tiers.length &&
      progress.currentValue >= config.tiers[progress.currentTierIndex].targetValue
    ) {
      const tier = config.tiers[progress.currentTierIndex];

      // Накапливаем награды
      totalCoins += tier.rewardCoins;
      totalSpins += tier.rewardSpins;

      // Запоминаем последний выданный тир (для корректного обновления UI и логов)
      lastClaimedTier = tier;

      // Переходим к следующему тиру
      progress.currentTierIndex++;
    }

    // 🎯 Выдаем СУММАРНУЮ награду за все пропущенные/текущие тиры разом
    if (totalCoins > 0) {
      this.gameState.addCoins(totalCoins);
    }
    if (totalSpins > 0) {
      this.gameState.addSpins(totalSpins);
    }

    // Сбрасываем флаг для нового текущего уровня (он еще не забран, так как цикл остановился на невыполненном тире)
    progress.isTierClaimed = false;

    // 🎯 Уведомляем UI об обновлении (перерисует карточки, уберет кнопку "Забрать", обновит прогресс)
    // Тост при этом НЕ вызывается, так как мы не вызываем onTierCompleted
    if (lastClaimedTier) {
      EventBus.emit(GameEvents.ACHIEVEMENT_CLAIMED, { config, tier: lastClaimedTier });
    }
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

  // 🎯 Проверка: есть ли хотя бы одна незaбранная награда за выполненное достижение
  public hasUnclaimedRewards(): boolean {
    for (const config of ACHIEVEMENTS_CONFIG) {
      const progress = this.progress.get(config.id);
      if (!progress) continue;

      const isMaxedOut = progress.currentTierIndex >= config.tiers.length;

      // Если достижение еще не пройдено до конца
      if (!isMaxedOut) {
        const currentTier = config.tiers[progress.currentTierIndex];

        // Если текущее значение достигло цели, но награда еще не забрана
        if (progress.currentValue >= currentTier.targetValue && !progress.isTierClaimed) {
          return true; // Нашли хотя бы одну доступную награду!
        }
      }
    }

    return false; // Незабранных наград нет
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
