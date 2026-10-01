// core/ContractService.ts

import * as Phaser from "phaser";
import { Grid } from "./Grid";
import { GameState } from "./GameState";
import { EventBus } from "./EventBus";
import { GameEvents } from "../types/GameEvents";

export type ContractStatus = "active" | "completed";

export interface Contract {
  id: string;
  targetLevel: number;
  requiredCount: number;
  currentCount: number;
  status: ContractStatus;
}

export interface ContractSaveData {
  id: string;
  targetLevel: number;
  requiredCount: number;
  currentCount: number;
  status: ContractStatus;
}

export interface ContractChangedEvent {
  contract: Contract | null;
}

export interface ContractReward {
  coins: number;
}

export class ContractService {
  private readonly UNLOCK_LEVEL = 7;

  /**
   * Максимальное количество предметов
   * в требовании.
   */
  private readonly MIN_REQUIRED_COUNT = 3;
  private readonly MAX_REQUIRED_COUNT = 6;
  private readonly MERGES_BEFORE_NEW_CONTRACT = 10;

  private mergeCount = 0;

  /**
   * Награда.
   *
   * Пока оставил простой вариант.
   * Потом сюда можно вынести RewardService.
   */
  private readonly REWARD_COINS = 100;

  private readonly grid: Grid;
  private readonly gameState: GameState;

  private contract: Contract | null = null;

  constructor(grid: Grid, gameState: GameState) {
    this.grid = grid;
    this.gameState = gameState;

    EventBus.on(GameEvents.GRID_ITEM_CHANGED, this.checkProgress, this);
    EventBus.on(GameEvents.LEVEL_CHANGED, this.handleLevelChanged, this);
    EventBus.on(GameEvents.GRID_ITEM_MERGED, this.handleMerge, this);
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Вызывается один раз после создания новой игры
   * или после восстановления сохранения.
   *
   * Этот метод является единственной точкой,
   * которая решает: должен ли существовать контракт.
   */
  public initialize(): void {
    if (!this.isUnlocked() || !this.contract) {
      this.contract = null;
      this.emitChanged();
      return;
    }

    /**
     * Выполненный контракт никогда не инвалидируется
     * из-за изменения уровня игрока.
     */
    if (this.contract.status === "completed") {
      this.emitChanged();
      return;
    }

    /**
     * Незавершённый контракт мог устареть,
     * пока игра была закрыта.
     */
    if (this.isContractOutdated()) {
      this.contract = null;
      this.emitChanged();

      this.generateContract();
      return;
    }

    /**
     * Контракт всё ещё валиден.
     * Пересчитываем прогресс относительно текущего Grid.
     */
    this.recalculateProgress();
    this.emitChanged();
  }

  /**
   * Проверяет текущий прогресс контракта.
   *
   * Вызывать после любого изменения Grid.
   */
  public checkProgress(): void {
    if (!this.contract) {
      return;
    }

    if (this.contract.status === "completed") {
      return;
    }

    const currentCount = this.grid.countItemsByLevel(this.contract.targetLevel);

    if (this.contract.currentCount === currentCount) {
      return;
    }

    this.contract.currentCount = currentCount;

    if (currentCount >= this.contract.requiredCount) {
      this.contract.currentCount = this.contract.requiredCount;
      this.contract.status = "completed";

      EventBus.emit(GameEvents.CONTRACT_COMPLETED, {
        contract: this.getContractSnapshot(),
      });
    }

    this.emitChanged();
  }

  /**
   * Игрок забирает награду.
   *
   * Только здесь старый контракт уничтожается
   * и создаётся новый.
   */
  public claimReward(): ContractReward | null {
    if (!this.contract) {
      return null;
    }

    if (this.contract.status !== "completed") {
      return null;
    }

    const reward: ContractReward = {
      coins: this.REWARD_COINS,
    };

    const completedContract = this.getContractSnapshot();

    this.gameState.addCoins(reward.coins);

    EventBus.emit(GameEvents.CONTRACT_REWARD_CLAIMED, {
      contract: completedContract,
      reward,
    });

    this.contract = null;
    this.mergeCount = 0;

    this.emitChanged();

    return reward;
  }

  /**
   * Возвращает immutable-ish копию контракта.
   */
  public getContract(): Contract | null {
    return this.getContractSnapshot();
  }

  /**
   * Есть ли активный контракт.
   */
  public hasContract(): boolean {
    return this.contract !== null;
  }

  /**
   * Можно ли забрать награду.
   */
  public canClaimReward(): boolean {
    return this.contract?.status === "completed";
  }

  public handleLevelChanged(): void {
    if (!this.isUnlocked()) {
      this.contract = null;
      this.mergeCount = 0;
      this.emitChanged();
      return;
    }

    /**
     * Выполненный контракт никогда не трогаем.
     */
    if (this.contract?.status === "completed") {
      return;
    }

    /**
     * Если активный контракт ещё валиден —
     * ничего не делаем.
     */
    if (this.contract && !this.isContractOutdated()) {
      return;
    }

    /**
     * Контракт устарел.
     * Удаляем его и начинаем считать следующие мерджи.
     */
    this.contract = null;
    this.mergeCount = 0;

    this.emitChanged();
  }

  // ===========================================================================
  // GENERATION
  // ===========================================================================

  private generateContract(): void {
    if (!this.isUnlocked()) {
      this.contract = null;
      this.emitChanged();
      return;
    }

    const { targetLevel, requiredCount } = this.generateTarget();

    this.contract = {
      id: this.generateContractId(),
      targetLevel,
      requiredCount,
      currentCount: 0,
      status: "active",
    };

    this.recalculateProgress();

    EventBus.emit(GameEvents.CONTRACT_CREATED, {
      contract: this.getContractSnapshot(),
    });
  }

  private generateTarget(): {
    targetLevel: number;
    requiredCount: number;
  } {
    const playerLevel = this.gameState.level;

    const minLevel = Math.max(1, playerLevel - 4);
    const maxLevel = playerLevel;

    const targetLevel = Phaser.Math.Between(minLevel, maxLevel);
    const requiredCount = Phaser.Math.Between(this.MIN_REQUIRED_COUNT, this.MAX_REQUIRED_COUNT);

    return {
      targetLevel,
      requiredCount,
    };
  }

  private handleMerge(): void {
    if (!this.isUnlocked()) {
      return;
    }

    /**
     * Пока контракт существует, мержи нас не интересуют.
     */
    if (this.contract) {
      return;
    }

    this.mergeCount++;

    if (this.mergeCount < this.MERGES_BEFORE_NEW_CONTRACT) {
      return;
    }

    this.mergeCount = 0;
    this.generateContract();
  }

  // ===========================================================================
  // PROGRESS
  // ===========================================================================

  private recalculateProgress(): void {
    if (!this.contract) {
      return;
    }

    if (this.contract.status === "completed") {
      return;
    }

    const count = this.grid.countItemsByLevel(this.contract.targetLevel);

    this.contract.currentCount = Math.min(count, this.contract.requiredCount);

    if (this.contract.currentCount >= this.contract.requiredCount) {
      this.contract.currentCount = this.contract.requiredCount;
      this.contract.status = "completed";

      EventBus.emit(GameEvents.CONTRACT_COMPLETED, {
        contract: this.getContractSnapshot(),
      });
    }
  }

  // ===========================================================================
  // RESTORE
  // ===========================================================================

  /**
   * Восстанавливает контракт из save.
   *
   * Никаких событий здесь не эмитим.
   *
   * Restore — это изменение внутреннего состояния.
   * UI узнает о состоянии через initialize().
   */
  public deserialize(data: ContractSaveData | null): void {
    if (!data) {
      this.contract = null;
      return;
    }

    this.contract = {
      id: data.id,
      targetLevel: data.targetLevel,
      requiredCount: data.requiredCount,
      currentCount: data.currentCount,
      status: data.status,
    };
  }

  public serialize(): ContractSaveData | null {
    if (!this.contract) {
      return null;
    }

    return {
      id: this.contract.id,
      targetLevel: this.contract.targetLevel,
      requiredCount: this.contract.requiredCount,
      currentCount: this.contract.currentCount,
      status: this.contract.status,
    };
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private isUnlocked(): boolean {
    return this.gameState.level >= this.UNLOCK_LEVEL;
  }

  private generateContractId(): string {
    return `contract_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private getContractSnapshot(): Contract | null {
    if (!this.contract) {
      return null;
    }

    return {
      ...this.contract,
    };
  }

  private isContractOutdated(): boolean {
    if (!this.contract) {
      return false;
    }

    if (this.contract.status === "completed") {
      return false;
    }

    const currentLevel = this.gameState.level;
    const minimumValidTargetLevel = currentLevel - 5;

    return this.contract.targetLevel < minimumValidTargetLevel;
  }

  private emitChanged(): void {
    EventBus.emit(GameEvents.CONTRACT_UPDATED, {
      contract: this.getContractSnapshot(),
    } as ContractChangedEvent);
  }

  // ===========================================================================
  // DESTROY
  // ===========================================================================

  public destroy(): void {
    EventBus.off(GameEvents.GRID_ITEM_CHANGED, this.checkProgress, this);
    EventBus.off(GameEvents.LEVEL_CHANGED, this.handleLevelChanged, this);
    EventBus.on(GameEvents.GRID_ITEM_MERGED, this.handleMerge, this);
  }
}
