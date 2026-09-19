// core/ContractService.ts
import * as Phaser from "phaser";
import { EventBus } from "./EventBus";
import { GameEvents } from "../types/GameEvents";
import { Contract, ContractTask, ContractUpdateData } from "../types/Contract";
import { Grid } from "./Grid";

export class ContractService {
  private grid: Grid;
  private activeContract: Contract | null = null;
  private currentLevel: number = 1;

  constructor(grid: Grid) {
    this.grid = grid;
    this.bindEvents();
  }

  private bindEvents(): void {
    EventBus.on(GameEvents.LEVEL_CHANGED, this.handleLevelUp, this);
    EventBus.on(GameEvents.GRID_ITEM_MERGED, this.checkTasks, this);
    EventBus.on(GameEvents.GRID_ITEM_ADDED, this.checkTasks, this);
    EventBus.on(GameEvents.GRID_ITEM_REMOVED, this.checkTasks, this);
    EventBus.on(GameEvents.GRID_FILLED, this.checkTasks, this);
    EventBus.on(GameEvents.GRID_RESTORED, this.checkTasks, this);
  }

  public init(startLevel: number): void {
    this.currentLevel = startLevel;
    if (this.currentLevel >= 7) {
      this.generateNewContract();
    }
  }

  private handleLevelUp(newLevel: number): void {
    this.currentLevel = newLevel;
    if (this.currentLevel < 7) {
      this.activeContract = null;
      return;
    }
    this.generateNewContract();
  }

  private generateNewContract(): void {
    const tasks: ContractTask[] = [];
    const maxLevel = this.currentLevel - 1;
    const minLevel = Math.max(1, this.currentLevel - 5);

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
        isLocked: false, // Временно false, будет пересчитано при сортировке
      });
    }

    // 🎯 1. СОРТИРОВКА: По убыванию уровня (сначала высокий, потом ниже)
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
    } as ContractUpdateData);

    this.checkTasks();
  }

  private checkTasks(): void {
    if (!this.activeContract || this.activeContract.isCompleted) return;

    let changed = false;

    // 🎯 Находим ПЕРВУЮ задачу, которая не выполнена и не заблокирована
    const activeTask = this.activeContract.tasks.find((t) => !t.isCompleted && !t.isLocked);

    if (activeTask) {
      const countOnBoard = this.grid.countItemsByLevel(activeTask.targetLevel);

      if (activeTask.currentCount !== countOnBoard) {
        activeTask.currentCount = countOnBoard;
        changed = true;
      }

      // Если требуемое количество достигнуто
      if (countOnBoard >= activeTask.requiredCount && !activeTask.isCompleted) {
        activeTask.isCompleted = true;
        console.log(
          `✅ Задача выполнена: На поле есть ${activeTask.requiredCount}x Ур.${activeTask.targetLevel}`,
        );
        changed = true;

        // 🎯 Разблокируем следующую задачу
        const nextTaskIndex = this.activeContract.tasks.indexOf(activeTask) + 1;
        if (nextTaskIndex < this.activeContract.tasks.length) {
          const nextTask = this.activeContract.tasks[nextTaskIndex];
          nextTask.isLocked = false;
          nextTask.currentCount = 0; // Сбрасываем счетчик для новой активной задачи

          // 🎯 Рекурсивный вызов: вдруг на поле УЖЕ есть предметы для следующей задачи?
          // Это позволит выполнить несколько задач мгновенно, если игрок сделал массовое действие (например, Fill)
          this.checkTasks();
          return;
        }
      }
    }

    // 🎯 Пересчитываем статусы блокировки для всех задач (на случай отмены хода, которая могла "откатить" выполнение)
    this.updateLockStates();

    if (changed) {
      EventBus.emit(GameEvents.CONTRACT_UPDATED, {
        contract: this.activeContract,
      } as ContractUpdateData);
    }

    // Проверка на полное завершение контракта
    if (this.activeContract.tasks.every((t) => t.isCompleted)) {
      this.activeContract.isCompleted = true;
      console.log(`🎉 КОНТРАКТ ВЫПОЛНЕН!`);
      EventBus.emit(GameEvents.CONTRACT_COMPLETED, {
        contract: this.activeContract,
      } as ContractUpdateData);
    }
  }

  // 🎯 Отдельный метод для гарантированного обновления статусов isLocked
  private updateLockStates(): void {
    let isPreviousCompleted = true;
    for (const task of this.activeContract.tasks) {
      if (!isPreviousCompleted) {
        task.isLocked = true;
        task.currentCount = 0; // Сбрасываем визуальный прогресс заблокированных задач
      } else {
        task.isLocked = false;
      }

      // Если текущая задача не выполнена, все последующие должны быть заблокированы
      if (!task.isCompleted) {
        isPreviousCompleted = false;
      }
    }
  }

  public getActiveContract(): Contract | null {
    return this.activeContract;
  }

  public destroy(): void {
    EventBus.off(GameEvents.LEVEL_CHANGED, this.handleLevelUp, this);
    EventBus.off(GameEvents.GRID_ITEM_MERGED, this.checkTasks, this);
    EventBus.off(GameEvents.GRID_ITEM_ADDED, this.checkTasks, this);
    EventBus.off(GameEvents.GRID_ITEM_REMOVED, this.checkTasks, this);
    EventBus.off(GameEvents.GRID_FILLED, this.checkTasks, this);
    EventBus.off(GameEvents.GRID_RESTORED, this.checkTasks, this);
  }
}
