import * as Phaser from "phaser";
import { Cell, GridConfig, GridPosition, ItemData } from "../types/Item";
import { ItemRegistry } from "./ItemRegistry";
import { EventBus } from "./EventBus";
import { GameEvents } from "../types/GameEvents";

export enum MergeResult {
  INVALID = "invalid",
  MERGED = "merged",
  PRESTIGE = "prestige",
}

export interface GridSnapshot {
  cells: (ItemData | null)[][];
  nextId: number;
}

export class Grid extends Phaser.Events.EventEmitter {
  private cells: Cell[][];
  private readonly config: GridConfig;
  private nextId = 0;

  constructor(config: GridConfig) {
    super();
    this.config = config;
    this.cells = this.createEmptyGrid();
  }

  private createEmptyGrid(): Cell[][] {
    const grid: Cell[][] = [];
    for (let y = 0; y < this.config.rows; y++) {
      grid.push(new Array(this.config.cols).fill(null));
    }
    return grid;
  }

  get cols(): number {
    return this.config.cols;
  }
  get rows(): number {
    return this.config.rows;
  }
  get totalCells(): number {
    return this.config.cols * this.config.rows;
  }

  getCell(pos: GridPosition): Cell {
    if (!this.isValidPosition(pos)) return null;
    return this.cells[pos.y][pos.x];
  }

  isValidPosition(pos: GridPosition): boolean {
    return pos.x >= 0 && pos.x < this.config.cols && pos.y >= 0 && pos.y < this.config.rows;
  }

  isEmpty(pos: GridPosition): boolean {
    return this.getCell(pos) === null;
  }

  getEmptyCells(): GridPosition[] {
    const empty: GridPosition[] = [];
    for (let y = 0; y < this.config.rows; y++) {
      for (let x = 0; x < this.config.cols; x++) {
        if (this.cells[y][x] === null) {
          empty.push({ x, y });
        }
      }
    }
    return empty;
  }

  hasEmptyCell(): boolean {
    return this.getEmptyCells().length > 0;
  }

  getRandomEmptyCell(): GridPosition | null {
    const emptyCells = this.getEmptyCells();
    if (emptyCells.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    return emptyCells[randomIndex];
  }

  createItem(level: number = 1): ItemData {
    return {
      id: `item_${this.nextId++}`,
      level,
    };
  }

  setItem(pos: GridPosition, item: ItemData): boolean {
    if (!this.isValidPosition(pos) || !this.isEmpty(pos)) {
      return false;
    }
    this.cells[pos.y][pos.x] = item;
    EventBus.emit(GameEvents.GRID_ITEM_ADDED, { position: pos, item });
    EventBus.emit(GameEvents.GRID_ITEM_CHANGED);
    return true;
  }

  removeItem(pos: GridPosition): ItemData | null {
    if (!this.isValidPosition(pos)) return null;

    const item = this.cells[pos.y][pos.x];
    if (item) {
      this.cells[pos.y][pos.x] = null;
      EventBus.emit(GameEvents.GRID_ITEM_REMOVED, { position: pos, item });
      EventBus.emit(GameEvents.GRID_ITEM_CHANGED);
    }
    return item;
  }

  tryMerge(
    from: GridPosition,
    to: GridPosition,
  ): {
    result: MergeResult;
    newItem?: ItemData;
    itemFrom?: ItemData | null;
    itemTo?: ItemData | null;
    isPrestige?: boolean; // 🎯 НОВОЕ: флаг престиж-слияния
  } {
    const itemFrom = this.getCell(from);
    const itemTo = this.getCell(to);

    if (!itemFrom || !this.isValidPosition(to)) {
      return { result: MergeResult.INVALID, itemFrom, itemTo };
    }

    // Перемещение на пустую клетку запрещено
    if (!itemTo) {
      return { result: MergeResult.INVALID, itemFrom, itemTo };
    }

    // Проверка соседства и равенства уровней
    const dx = Math.abs(from.x - to.x);
    const dy = Math.abs(from.y - to.y);
    const isAdjacent = Math.max(dx, dy) === 1;

    if (!isAdjacent || itemFrom.level !== itemTo.level) {
      return { result: MergeResult.INVALID, itemFrom, itemTo };
    }

    // 🎯 СОХРАНЯЕМ ИСТОРИЮ ПЕРЕД ЛЮБЫМ СЛИЯНИЕМ
    EventBus.emit(GameEvents.HISTORY_CHECKPOINT);

    const maxLevel = ItemRegistry.getMaxLevel();
    const isPrestige = itemFrom.level >= maxLevel;

    // Выполняем слияние: удаляем оба старых предмета
    this.removeItem(from);
    this.removeItem(to);

    // 🎯 ОПРЕДЕЛЯЕМ НОВЫЙ УРОВЕНЬ
    // Если это престиж-слияние → предмет 1-го уровня
    // Иначе → обычный level + 1
    const newLevel = isPrestige ? 1 : itemFrom.level + 1;
    const newItem = this.createItem(newLevel);
    this.setItem(to, newItem);

    // 🎯 ЭМИТИМ СООТВЕТСТВУЮЩЕЕ СОБЫТИЕ
    if (isPrestige) {
      EventBus.emit(GameEvents.GRID_PRESTIGE_MERGED, {
        newLevel,
        item: { ...newItem, pos: to },
        itemFrom: { ...itemFrom, pos: from },
        itemTo: { ...itemTo, pos: to },
      });
    } else {
      EventBus.emit(GameEvents.GRID_ITEM_MERGED, {
        newLevel,
        item: { ...newItem, pos: to },
        itemFrom: { ...itemFrom, pos: from },
        itemTo: { ...itemTo, pos: to },
      });
    }

    EventBus.emit(GameEvents.GRID_ITEM_CHANGED);

    return {
      result: isPrestige ? MergeResult.PRESTIGE : MergeResult.MERGED,
      newItem,
      itemFrom,
      itemTo,
      isPrestige,
    };
  }

  spawnRandomItem(level: number = 1): ItemData | null {
    const emptyCell = this.getRandomEmptyCell();
    if (!emptyCell) {
      EventBus.emit(GameEvents.GRID_FULL);
      return null;
    }

    EventBus.emit(GameEvents.HISTORY_CHECKPOINT);

    const item = this.createItem(level);
    this.setItem(emptyCell, item);
    return item;
  }

  getAllItems(): Array<{ position: GridPosition; item: ItemData }> {
    const items: Array<{ position: GridPosition; item: ItemData }> = [];
    for (let y = 0; y < this.config.rows; y++) {
      for (let x = 0; x < this.config.cols; x++) {
        const item = this.cells[y][x];
        if (item) {
          items.push({ position: { x, y }, item });
        }
      }
    }
    return items;
  }

  fillEmptyCells(level: number, count: number): number {
    const emptyCells = this.getEmptyCells();

    // Если пустых ячеек нет или запрошено 0 (или меньше) предметов — выходим
    if (emptyCells.length === 0 || count <= 0) {
      return 0;
    }

    // 🎯 Ограничиваем количество реально доступными пустыми ячейками
    const itemsToSpawn = Math.min(count, emptyCells.length);

    EventBus.emit(GameEvents.HISTORY_CHECKPOINT);

    let filledCount = 0;

    // Создаем копию массива доступных ячеек.
    // (getEmptyCells и так возвращает новый массив, но [...emptyCells] делает намерение явным)
    const availableCells = [...emptyCells];

    for (let i = 0; i < itemsToSpawn; i++) {
      // 🎯 Выбираем случайный индекс из оставшихся доступных ячеек
      const randomIndex = Math.floor(Math.random() * availableCells.length);

      // Извлекаем ячейку по этому индексу и УДАЛЯЕМ её из массива доступных.
      // Это гарантирует, что мы никогда не выберем одну и ту же ячейку дважды.
      const cell = availableCells.splice(randomIndex, 1)[0];

      const item = this.createItem(level);
      this.setItem(cell, item);
      filledCount++;
    }

    EventBus.emit(GameEvents.GRID_FILLED, { count: filledCount });
    EventBus.emit(GameEvents.GRID_ITEM_CHANGED);

    return filledCount;
  }

  removeItemsBelowLevel(minLevel: number): ItemData[] {
    const removedItems: ItemData[] = [];
    let hasChanges = false;

    // Сначала проверяем, есть ли что удалять, чтобы не сохранять лишние снимки
    for (let y = 0; y < this.config.rows; y++) {
      for (let x = 0; x < this.config.cols; x++) {
        if (this.cells[y][x] && this.cells[y][x]!.level < minLevel) {
          hasChanges = true;
          break;
        }
      }
      if (hasChanges) break;
    }

    for (let y = 0; y < this.config.rows; y++) {
      for (let x = 0; x < this.config.cols; x++) {
        const item = this.cells[y][x];
        if (item && item.level < minLevel) {
          removedItems.push(item);
          this.cells[y][x] = null;
          EventBus.emit(GameEvents.GRID_ITEM_REMOVED, { position: { x, y }, item });
        }
      }
    }

    if (removedItems.length > 0) {
      EventBus.emit(GameEvents.GRID_ITEMS_CLEANED, {
        count: removedItems.length,
        items: removedItems,
      });
      EventBus.emit(GameEvents.GRID_ITEM_CHANGED);
    }

    return removedItems;
  }

  countItemsByLevel(level: number): number {
    let count = 0;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.cells[y][x]?.level === level) {
          count++;
        }
      }
    }
    return count;
  }

  clear(): void {
    for (let y = 0; y < this.config.rows; y++) {
      for (let x = 0; x < this.config.cols; x++) {
        this.cells[y][x] = null;
      }
    }
    EventBus.emit(GameEvents.GRID_CLEARED);
    EventBus.emit(GameEvents.GRID_ITEM_CHANGED);
  }

  getSnapshot(): GridSnapshot {
    return {
      // Глубокое копирование 2D-массива, чтобы изменения в игре не меняли снимок
      cells: this.cells.map((row) => row.map((cell) => (cell ? { ...cell } : null))),
      nextId: this.nextId,
    };
  }

  restoreSnapshot(snapshot: GridSnapshot): void {
    // Восстанавливаем клетки (опять глубокое копирование для безопасности)
    this.cells = snapshot.cells.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
    console.log("restore to: ", this.cells);
    // Восстанавливаем служебные переменные
    this.nextId = snapshot.nextId;

    // 🎯 3. Сообщаем рендереру, что нужно перерисовать поле
    EventBus.emit(GameEvents.GRID_RESTORED, snapshot);
    EventBus.emit(GameEvents.GRID_ITEM_CHANGED);
  }

  serialize(): string {
    return JSON.stringify(this.getSnapshot());
  }

  deserialize(data: string): void {
    try {
      const snapshot = JSON.parse(data) as GridSnapshot;
      this.restoreSnapshot(snapshot);
    } catch (e) {
      console.error("Ошибка десериализации Grid:", e);
    }
  }
}
