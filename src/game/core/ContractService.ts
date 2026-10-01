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
  private readonly MIN_REQUIRED_COUNT = 2;
  private readonly MAX_REQUIRED_COUNT = 6;

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
    if (!this.isUnlocked()) {
      this.contract = null;
      this.emitChanged();
      return;
    }

    if (this.contract) {
      this.recalculateProgress();
      this.emitChanged();
      return;
    }

    this.generateContract();
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

    this.generateContract();

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

    const minLevel = Math.max(1, playerLevel - 6);
    const maxLevel = playerLevel;

    const targetLevel = Phaser.Math.Between(minLevel, maxLevel);
    const minRequired = Math.max(this.MIN_REQUIRED_COUNT, this.MAX_REQUIRED_COUNT);
    const maxRequired = Math.max(minRequired, this.MAX_REQUIRED_COUNT);
    const requiredCount = Phaser.Math.Between(minRequired, maxRequired);

    return {
      targetLevel,
      requiredCount,
    };
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
  }
}
