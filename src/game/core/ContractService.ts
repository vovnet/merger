// core/ContractService.ts
import * as Phaser from "phaser";
import { EventBus } from "./EventBus";
import { GameEvents } from "../types/GameEvents";
import { Contract, ContractTask, ContractUpdateData } from "../types/Contract";
import { Grid } from "./Grid";
import { GameState } from "./GameState"; // 🎯 Импортируем GameState

export class ContractService {
  private grid: Grid;
  private gameState: GameState; // 🎯 Ссылка на единый источник истины
  private activeContract: Contract | null = null;

  constructor(grid: Grid, gameState: GameState) {
    this.grid = grid;
    this.gameState = gameState;

    this.bindEvents();

    // 🎯 Проверяем начальный уровень при создании.
    // Если игра загрузилась сразу с 7+ уровня, контракт создастся автоматически.
    if (this.gameState.level >= 7) {
      this.generateNewContract();
    }
  }

  private bindEvents(): void {
    // 🎯 При изменении уровня (включая загрузку сохранения) генерируем новый контракт
    EventBus.on(GameEvents.LEVEL_CHANGED, this.handleLevelChanged, this);

    // Проверяем поле при любом изменении
    EventBus.on(GameEvents.GRID_ITEM_MERGED, this.checkTasks, this);
    EventBus.on(GameEvents.GRID_ITEM_ADDED, this.checkTasks, this);
    EventBus.on(GameEvents.GRID_ITEM_REMOVED, this.checkTasks, this);
    EventBus.on(GameEvents.GRID_FILLED, this.checkTasks, this);
    EventBus.on(GameEvents.GRID_RESTORED, this.checkTasks, this);
  }

  private handleLevelChanged(newLevel: number): void {
    if (this.gameState.level < 7) {
      console.log(`📜 Уровень ${this.gameState.level}. Контракты откроются на 7 уровне.`);
      this.activeContract = null;
      return;
    }

    console.log(`📜 Уровень повышен до ${this.gameState.level}. Генерация нового контракта...`);
    this.generateNewContract();
  }

  private generateNewContract(): void {
    const tasks: ContractTask[] = [];

    // 🎯 Берем уровень напрямую из GameState
    const maxLevel = this.gameState.level - 1;
    const minLevel = Math.max(1, this.gameState.level - 5);

    const levelPool: number[] = [];
    for (let i = minLevel; i <= maxLevel; i++) {
      levelPool.push(i);
    }

    for (let i = 0; i < 3; i++) {
      const randomIndex = Phaser.Math.Between(0, levelPool.length - 1);
      const targetLevel = levelPool.splice(randomIndex, 1)[0];
      const requiredCount = Phaser.Math.Between(2, 6);

      tasks.push({
        id: `task_${Date.now()}_${i}`,
        targetLevel,
        requiredCount,
        currentCount: 0,
        isCompleted: false,
        isLocked: false,
      });
    }

    // 🎯 1. СОРТИРОВКА: По убыванию уровня
    tasks.sort((a, b) => b.targetLevel - a.targetLevel);

    // 🎯 2. БЛОКИРОВКА: Первая задача активна, остальные заблокированы
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

  getActiveTargetLevel(): number | null {
    if (!this.activeContract || this.activeContract.isCompleted) return null;
    const activeTask = this.activeContract.tasks.find((t) => !t.isCompleted && !t.isLocked);
    return activeTask ? activeTask.targetLevel : null;
  }

  private checkTasks(): void {
    if (!this.activeContract || this.activeContract.isCompleted) return;

    let changed = false;
    let keepChecking = true;

    while (keepChecking) {
      keepChecking = false;

      const activeTask = this.activeContract.tasks.find((t) => !t.isCompleted && !t.isLocked);
      if (!activeTask) break;

      const countOnBoard = this.grid.countItemsByLevel(activeTask.targetLevel);

      if (activeTask.currentCount !== countOnBoard) {
        activeTask.currentCount = countOnBoard;
        changed = true;
      }

      if (countOnBoard >= activeTask.requiredCount && !activeTask.isCompleted) {
        activeTask.isCompleted = true;
        console.log(
          `✅ Задача выполнена: На поле есть ${activeTask.requiredCount}x Ур.${activeTask.targetLevel}`,
        );
        changed = true;

        const nextTaskIndex = this.activeContract.tasks.indexOf(activeTask) + 1;
        if (nextTaskIndex < this.activeContract.tasks.length) {
          const nextTask = this.activeContract.tasks[nextTaskIndex];
          nextTask.isLocked = false;
          nextTask.currentCount = 0;
          keepChecking = true;
        }
      }
    }

    this.updateLockStates();

    if (changed) {
      EventBus.emit(GameEvents.CONTRACT_UPDATED, {
        contract: this.activeContract,
        activeTargetLevel: this.getActiveTargetLevel(),
      } as ContractUpdateData);
    }

    if (this.activeContract.tasks.every((t) => t.isCompleted)) {
      this.activeContract.isCompleted = true;
      console.log(`🎉 КОНТРАКТ ВЫПОЛНЕН!`);
      EventBus.emit(GameEvents.CONTRACT_COMPLETED, {
        contract: this.activeContract,
      } as ContractUpdateData);
    }
  }

  private updateLockStates(): void {
    let isPreviousCompleted = true;
    for (const task of this.activeContract.tasks) {
      if (!isPreviousCompleted) {
        task.isLocked = true;
        task.currentCount = 0;
      } else {
        task.isLocked = false;
      }
      if (!task.isCompleted) {
        isPreviousCompleted = false;
      }
    }
  }

  public getActiveContract(): Contract | null {
    return this.activeContract;
  }

  public destroy(): void {
    EventBus.off(GameEvents.LEVEL_CHANGED, this.handleLevelChanged, this);
    EventBus.off(GameEvents.GRID_ITEM_MERGED, this.checkTasks, this);
    EventBus.off(GameEvents.GRID_ITEM_ADDED, this.checkTasks, this);
    EventBus.off(GameEvents.GRID_ITEM_REMOVED, this.checkTasks, this);
    EventBus.off(GameEvents.GRID_FILLED, this.checkTasks, this);
    EventBus.off(GameEvents.GRID_RESTORED, this.checkTasks, this);
  }
}
