import * as Phaser from "phaser";
import { EventBus } from "./EventBus";
import { GameEvents } from "../types/GameEvents";
import { Contract, ContractTask, ContractUpdateData } from "../types/Contract";
import { Grid } from "./Grid";
import { GameState } from "./GameState";

export interface ContractSaveData {
  id: string;

  tasks: Array<{
    id: string;
    targetLevel: number;
    requiredCount: number;
    isCompleted: boolean;
  }>;

  isCompleted: boolean;
}

export class ContractService {
  private readonly UNLOCK_LEVEL = 7;
  private readonly TASK_COUNT = 3;

  private readonly grid: Grid;
  private readonly gameState: GameState;

  private activeContract: Contract | null = null;

  private isRestoring = false;

  constructor(grid: Grid, gameState: GameState) {
    this.grid = grid;
    this.gameState = gameState;

    this.bindEvents();
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  private bindEvents(): void {
    EventBus.on(GameEvents.LEVEL_CHANGED, this.handleLevelChanged, this);

    EventBus.on(GameEvents.GRID_ITEM_MERGED, this.checkTasks, this);

    EventBus.on(GameEvents.GRID_ITEM_ADDED, this.checkTasks, this);

    EventBus.on(GameEvents.GRID_ITEM_REMOVED, this.checkTasks, this);

    EventBus.on(GameEvents.GRID_FILLED, this.checkTasks, this);

    EventBus.on(GameEvents.GRID_RESTORED, this.checkTasks, this);
  }

  private handleLevelChanged(): void {
    if (this.isRestoring) {
      return;
    }

    if (this.gameState.level < this.UNLOCK_LEVEL) {
      this.clearContract();
      return;
    }

    if (!this.activeContract) {
      this.generateNewContract();
    }
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Вызывается после создания новой игры.
   */
  public initialize(): void {
    if (this.gameState.level < this.UNLOCK_LEVEL) {
      return;
    }

    if (this.activeContract) {
      return;
    }

    this.generateNewContract();
  }

  /**
   * Вызывается ПОСЛЕ полного восстановления save.
   *
   * Если в save не было контракта, но уровень уже позволяет
   * использовать контракты — создаём новый.
   */
  public finishRestore(): void {
    if (!this.activeContract) {
      if (this.gameState.level >= this.UNLOCK_LEVEL) {
        this.generateNewContract();
      }

      return;
    }

    this.updateLockStates();
    this.checkTasks();
    this.emitContractUpdated();
  }

  // ===========================================================================
  // GENERATION
  // ===========================================================================

  private generateNewContract(): void {
    if (this.gameState.level < this.UNLOCK_LEVEL) {
      return;
    }

    const tasks: ContractTask[] = [];

    const maxLevel = this.gameState.level - 1;
    const minLevel = Math.max(1, this.gameState.level - 5);

    const levelPool: number[] = [];

    for (let level = minLevel; level <= maxLevel; level++) {
      levelPool.push(level);
    }

    const taskCount = Math.min(this.TASK_COUNT, levelPool.length);

    for (let i = 0; i < taskCount; i++) {
      const randomIndex = Phaser.Math.Between(0, levelPool.length - 1);

      const targetLevel = levelPool.splice(randomIndex, 1)[0];

      tasks.push({
        id: `task_${Date.now()}_${i}`,
        targetLevel,
        requiredCount: Phaser.Math.Between(2, 6),
        currentCount: 0,
        isCompleted: false,
        isLocked: i > 0,
      });
    }

    tasks.sort((a, b) => b.targetLevel - a.targetLevel);

    tasks.forEach((task, index) => {
      task.isLocked = index > 0;
    });

    this.activeContract = {
      id: `contract_${Date.now()}`,
      tasks,
      isCompleted: false,
    };

    EventBus.emit(GameEvents.CONTRACT_CREATED, {
      contract: this.activeContract,
      activeTargetLevel: this.getActiveTargetLevel(),
    } as ContractUpdateData);

    this.checkTasks();
  }

  // ===========================================================================
  // TASKS
  // ===========================================================================

  private checkTasks = (): void => {
    if (this.isRestoring) {
      return;
    }

    if (!this.activeContract) {
      return;
    }

    if (this.activeContract.isCompleted) {
      return;
    }

    let changed = false;
    let shouldContinue = true;

    while (shouldContinue) {
      shouldContinue = false;

      const activeTask = this.activeContract.tasks.find(
        (task) => !task.isCompleted && !task.isLocked,
      );

      if (!activeTask) {
        break;
      }

      const countOnBoard = this.grid.countItemsByLevel(activeTask.targetLevel);

      if (activeTask.currentCount !== countOnBoard) {
        activeTask.currentCount = countOnBoard;
        changed = true;
      }

      if (countOnBoard >= activeTask.requiredCount) {
        activeTask.isCompleted = true;
        changed = true;

        const currentIndex = this.activeContract.tasks.indexOf(activeTask);

        const nextTask = this.activeContract.tasks[currentIndex + 1];

        if (nextTask) {
          nextTask.isLocked = false;
          nextTask.currentCount = 0;

          shouldContinue = true;
        }
      }
    }

    this.updateLockStates();

    if (
      this.activeContract.tasks.length > 0 &&
      this.activeContract.tasks.every((task) => task.isCompleted)
    ) {
      this.activeContract.isCompleted = true;
      changed = true;

      EventBus.emit(GameEvents.CONTRACT_COMPLETED, {
        contract: this.activeContract,
      } as ContractUpdateData);
    }

    if (changed) {
      this.emitContractUpdated();
    }
  };

  private updateLockStates(): void {
    if (!this.activeContract) {
      return;
    }

    let previousCompleted = true;

    for (const task of this.activeContract.tasks) {
      if (!previousCompleted) {
        task.isLocked = true;
        task.currentCount = 0;
      } else {
        task.isLocked = false;
      }

      if (!task.isCompleted) {
        previousCompleted = false;
      }
    }
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  public getActiveContract(): Contract | null {
    return this.activeContract;
  }

  public getActiveTargetLevel(): number | null {
    if (!this.activeContract || this.activeContract.isCompleted) {
      return null;
    }

    const activeTask = this.activeContract.tasks.find(
      (task) => !task.isCompleted && !task.isLocked,
    );

    return activeTask ? activeTask.targetLevel : null;
  }

  // ===========================================================================
  // RESTORE
  // ===========================================================================

  public beginRestore(): void {
    this.isRestoring = true;
  }

  public endRestore(): void {
    this.isRestoring = false;
  }

  public serialize(): ContractSaveData | null {
    if (!this.activeContract) {
      return null;
    }

    return {
      id: this.activeContract.id,

      tasks: this.activeContract.tasks.map((task) => ({
        id: task.id,
        targetLevel: task.targetLevel,
        requiredCount: task.requiredCount,
        isCompleted: task.isCompleted,
      })),

      isCompleted: this.activeContract.isCompleted,
    };
  }

  public deserialize(data: ContractSaveData | null): void {
    if (!data) {
      this.activeContract = null;
      return;
    }

    this.activeContract = {
      id: data.id,

      tasks: data.tasks.map(
        (task): ContractTask => ({
          id: task.id,
          targetLevel: task.targetLevel,
          requiredCount: task.requiredCount,

          // Будет пересчитан после restore.
          currentCount: 0,

          isCompleted: task.isCompleted,

          // Будет пересчитан после restore.
          isLocked: false,
        }),
      ),

      isCompleted: data.isCompleted,
    };
  }

  // ===========================================================================
  // UTILS
  // ===========================================================================

  private clearContract(): void {
    if (!this.activeContract) {
      return;
    }

    this.activeContract = null;

    this.emitContractUpdated();
  }

  private emitContractUpdated(): void {
    EventBus.emit(GameEvents.CONTRACT_UPDATED, {
      contract: this.activeContract,
      activeTargetLevel: this.getActiveTargetLevel(),
    } as ContractUpdateData);
  }

  // ===========================================================================
  // DESTROY
  // ===========================================================================

  public destroy(): void {
    EventBus.off(GameEvents.LEVEL_CHANGED, this.handleLevelChanged, this);

    EventBus.off(GameEvents.GRID_ITEM_MERGED, this.checkTasks, this);

    EventBus.off(GameEvents.GRID_ITEM_ADDED, this.checkTasks, this);

    EventBus.off(GameEvents.GRID_ITEM_REMOVED, this.checkTasks, this);

    EventBus.off(GameEvents.GRID_FILLED, this.checkTasks, this);

    EventBus.off(GameEvents.GRID_RESTORED, this.checkTasks, this);
  }
}
