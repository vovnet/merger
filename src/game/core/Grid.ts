import * as Phaser from "phaser";
import { Cell, GridConfig, GridPosition, ItemData } from "../types/Item";

export enum MergeResult {
  INVALID = "invalid", // Нельзя слить (разные уровни или недопустимая клетка)
  MOVED = "moved", // Просто переместили на пустую клетку
  MERGED = "merged", // Успешное слияние!
}

export interface GridSnapshot {
  cells: (ItemData | null)[][];
  nextId: number;
  maxUnlockedLevel: number;
}

const MAX_LEVEL = 72;

export class Grid extends Phaser.Events.EventEmitter {
  private cells: Cell[][];
  private readonly config: GridConfig;
  private nextId = 0;

  private maxUnlockedLevel: number = 1;

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

  // Геттеры
  get cols(): number {
    return this.config.cols;
  }
  get rows(): number {
    return this.config.rows;
  }
  get totalCells(): number {
    return this.config.cols * this.config.rows;
  }
  get currentMaxLevel(): number {
    return this.maxUnlockedLevel;
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

  // 🎯 Упрощённое создание предмета — только уровень
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
    this.emit("itemAdded", { position: pos, item });
    return true;
  }

  removeItem(pos: GridPosition): ItemData | null {
    if (!this.isValidPosition(pos)) return null;

    const item = this.cells[pos.y][pos.x];
    if (item) {
      this.cells[pos.y][pos.x] = null;
      this.emit("itemRemoved", { position: pos, item });
    }
    return item;
  }

  tryMerge(from: GridPosition, to: GridPosition): { result: MergeResult; newItem?: ItemData } {
    const itemFrom = this.getCell(from);
    const itemTo = this.getCell(to);

    if (!itemFrom || !this.isValidPosition(to)) {
      return { result: MergeResult.INVALID };
    }

    // 🎯 НОВОЕ ПРАВИЛО: Проверка соседства по 8 направлениям (Чебышёвское расстояние)
    const dx = Math.abs(from.x - to.x);
    const dy = Math.abs(from.y - to.y);
    const isAdjacent = Math.max(dx, dy) === 1;

    if (!isAdjacent) {
      // Нельзя слить предметы, которые не соседи (даже по диагонали)
      if (itemTo && itemFrom.level === itemTo.level) {
        return { result: MergeResult.INVALID };
      }
    }

    if (!itemTo || (itemFrom.level === itemTo.level && itemFrom.level < MAX_LEVEL)) {
      this.emit("historyCheckpoint");
    }

    // Дальше стандартная логика
    if (!itemTo) {
      this.moveItem(from, to);
      return { result: MergeResult.MOVED };
    }

    if (itemFrom.level === itemTo.level && itemFrom.level < MAX_LEVEL) {
      this.removeItem(from);
      this.removeItem(to);

      const newLevel = itemFrom.level + 1;
      const newItem = this.createItem(newLevel);
      this.setItem(to, newItem);

      this.emit("itemMerged", {
        newLevel,
        item: { ...newItem, pos: to },
        itemFrom: { ...itemFrom, pos: from },
        itemTo: { ...itemTo, pos: to },
      });

      if (newLevel > this.maxUnlockedLevel) {
        this.maxUnlockedLevel = newLevel;
        this.emit("newLevelUnlocked", { level: newLevel, item: newItem });
      }

      return { result: MergeResult.MERGED, newItem };
    }

    return { result: MergeResult.INVALID };
  }

  moveItem(from: GridPosition, to: GridPosition): boolean {
    const item = this.getCell(from);
    if (!item || this.isEmpty(to)) return false;

    this.cells[from.y][from.x] = null;
    this.cells[to.y][to.x] = item;
    this.emit("itemMoved", { from, to, item });
    return true;
  }

  spawnRandomItem(level: number = 1): ItemData | null {
    const emptyCell = this.getRandomEmptyCell();
    if (!emptyCell) {
      this.emit("gridFull");
      return null;
    }

    this.emit("historyCheckpoint");

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

  fillEmptyCells(level: number): number {
    const emptyCells = this.getEmptyCells();
    if (emptyCells.length === 0) return 0;

    this.emit("historyCheckpoint");

    let filledCount = 0;
    for (const cell of emptyCells) {
      const item = this.createItem(level);
      this.setItem(cell, item);
      filledCount++;
    }

    this.emit("gridFilled", { count: filledCount });
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
          this.emit("itemRemoved", { position: { x, y }, item });
        }
      }
    }

    if (removedItems.length > 0) {
      this.emit("itemsCleaned", { count: removedItems.length, items: removedItems });
    }

    return removedItems;
  }

  clear(): void {
    for (let y = 0; y < this.config.rows; y++) {
      for (let x = 0; x < this.config.cols; x++) {
        this.cells[y][x] = null;
      }
    }
    this.emit("gridCleared");
  }

  getSnapshot(): GridSnapshot {
    return {
      // Глубокое копирование 2D-массива, чтобы изменения в игре не меняли снимок
      cells: this.cells.map((row) => row.map((cell) => (cell ? { ...cell } : null))),
      nextId: this.nextId,
      maxUnlockedLevel: this.maxUnlockedLevel,
    };
  }

  restoreSnapshot(snapshot: GridSnapshot): void {
    // Восстанавливаем клетки (опять глубокое копирование для безопасности)
    this.cells = snapshot.cells.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
    console.log("restore to: ", this.cells);
    // Восстанавливаем служебные переменные
    this.nextId = snapshot.nextId;
    this.maxUnlockedLevel = snapshot.maxUnlockedLevel;

    // 🎯 3. Сообщаем рендереру, что нужно перерисовать поле
    this.emit("gridRestored", snapshot);
  }

  serialize(): string {
    return JSON.stringify(this.cells);
  }

  deserialize(data: string): void {
    this.cells = JSON.parse(data);
    this.emit("gridChanged");
  }
}
