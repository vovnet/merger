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
    // 🎯 Генерируем новый контракт ТОЛЬКО при повышении уровня
    EventBus.on(GameEvents.LEVEL_CHANGED, this.handleLevelUp, this);

    // 🎯 Проверяем поле при ЛЮБОМ изменении, которое может повлиять на количество предметов
    EventBus.on(GameEvents.GRID_ITEM_MERGED, this.checkTasks, this);
    EventBus.on(GameEvents.GRID_ITEM_ADDED, this.checkTasks, this);
    EventBus.on(GameEvents.GRID_ITEM_REMOVED, this.checkTasks, this);
    EventBus.on(GameEvents.GRID_FILLED, this.checkTasks, this);
    EventBus.on(GameEvents.GRID_RESTORED, this.checkTasks, this);
  }

  // 🎯 Публичный метод для инициализации при старте игры
  public init(startLevel: number): void {
    this.currentLevel = startLevel;
    if (this.currentLevel >= 7) {
      this.generateNewContract();
    }
  }

  private handleLevelUp(newLevel: number): void {
    this.currentLevel = newLevel;

    // 🎯 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Контракты генерируются только с 7 уровня
    if (this.currentLevel < 7) {
      console.log(`📜 Уровень ${newLevel}. Контракты откроются на 7 уровне.`);
      this.activeContract = null; // Гарантируем отсутствие контракта
      return;
    }

    console.log(`📜 Уровень повышен до ${newLevel}. Генерация нового контракта...`);
    this.generateNewContract();
  }

  private generateNewContract(): void {
    const tasks: ContractTask[] = [];

    // 🎯 Диапазон уровней для заданий: от (currentLevel - 6) до (currentLevel - 1)
    // Но не ниже 1-го уровня.
    const maxLevel = this.currentLevel - 1;
    const minLevel = Math.max(1, this.currentLevel - 5);

    // Создаем пул доступных уровней
    const levelPool: number[] = [];
    for (let i = minLevel; i <= maxLevel; i++) {
      levelPool.push(i);
    }

    for (let i = 0; i < 3; i++) {
      //  ИЗМЕНЕНО: Используем splice, чтобы удалить выбранный уровень из пула
      // Это гарантирует, что один уровень не попадется дважды
      const randomIndex = Phaser.Math.Between(0, levelPool.length - 1);
      const targetLevel = levelPool.splice(randomIndex, 1)[0];

      // Требуется собрать от 2 до 6 штук
      const requiredCount = Phaser.Math.Between(2, 6);

      tasks.push({
        id: `task_${Date.now()}_${i}`,
        targetLevel,
        requiredCount,
        currentCount: 0,
        isCompleted: false,
      });
    }

    this.activeContract = {
      id: `contract_${Date.now()}`,
      tasks,
      isCompleted: false,
    };

    EventBus.emit(GameEvents.CONTRACT_CREATED, {
      contract: this.activeContract,
    } as ContractUpdateData);

    // Сразу проверяем, вдруг при апе уровня на поле уже есть нужные предметы
    this.checkTasks();
  }

  private checkTasks(): void {
    // 🎯 Если уровень < 7 или контракт уже выполнен, просто выходим
    if (!this.activeContract || this.activeContract.isCompleted) return;

    let allTasksCompleted = true;

    for (const task of this.activeContract.tasks) {
      // 🎯 КЛЮЧЕВОЕ ПРАВИЛО: Если задача уже выполнена, мы ее НЕ ПРОВЕРЯЕМ и НЕ МЕНЯЕМ
      if (!task.isCompleted) {
        // Спрашиваем у Grid реальное количество предметов на поле
        const countOnBoard = this.grid.countItemsByLevel(task.targetLevel);
        task.currentCount = countOnBoard;

        // Если требуемое количество достигнуто, фиксируем выполнение
        if (countOnBoard >= task.requiredCount) {
          task.isCompleted = true;
          console.log(
            `✅ Задача выполнена: На поле есть ${task.requiredCount}x Ур.${task.targetLevel}`,
          );
        } else {
          allTasksCompleted = false;
        }
      }
    }

    // Эмитим обновление для UI (даже если ничего не изменилось, UI должен знать актуальные currentCount)
    EventBus.emit(GameEvents.CONTRACT_UPDATED, {
      contract: this.activeContract,
    } as ContractUpdateData);

    // 🎯 Если все задачи помечены как выполненные, контракт завершен
    if (allTasksCompleted) {
      this.activeContract.isCompleted = true;
      console.log(`🎉 КОНТРАКТ ВЫПОЛНЕН!`);

      // Эмитим событие завершения. Game.ts подхватит его и начислит награду.
      EventBus.emit(GameEvents.CONTRACT_COMPLETED, {
        contract: this.activeContract,
      } as ContractUpdateData);
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
