import * as Phaser from "phaser";
import { Cell, GridConfig, GridPosition, ItemData } from "../types/Item";

export enum MergeResult {
  INVALID = "invalid", // Нельзя слить (разные уровни или недопустимая клетка)
  MOVED = "moved", // Просто переместили на пустую клетку
  MERGED = "merged", // Успешное слияние!
}

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

    // 1. Проверка на валидность
    if (!itemFrom || !this.isValidPosition(to)) {
      return { result: MergeResult.INVALID };
    }

    // 2. Если целевая клетка пустая — просто двигаем
    if (!itemTo) {
      this.moveItem(from, to);
      return { result: MergeResult.MOVED };
    }

    // 3. Если уровни совпадают и это не максимальный уровень (например, 777) — сливаем!
    if (itemFrom.level === itemTo.level && itemFrom.level < 777) {
      // Удаляем оба старых предмета
      this.removeItem(from);
      this.removeItem(to);

      // Создаём новый предмет следующего уровня
      const newItem = this.createItem(itemFrom.level + 1);
      this.setItem(to, newItem);

      if (newItem.level > this.maxUnlockedLevel) {
        this.maxUnlockedLevel = newItem.level;
        this.emit("newLevelUnlocked", { level: newItem.level, item: newItem });
      }

      return { result: MergeResult.MERGED, newItem };
    }

    // 4. Уровни разные — слияние невозможно
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

  // 🎯 Упрощённый спаун — только уровень
  spawnRandomItem(level: number = 1): ItemData | null {
    const emptyCell = this.getRandomEmptyCell();
    if (!emptyCell) {
      this.emit("gridFull");
      return null;
    }

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

  clear(): void {
    for (let y = 0; y < this.config.rows; y++) {
      for (let x = 0; x < this.config.cols; x++) {
        this.cells[y][x] = null;
      }
    }
    this.emit("gridCleared");
  }

  serialize(): string {
    return JSON.stringify(this.cells);
  }

  deserialize(data: string): void {
    this.cells = JSON.parse(data);
    this.emit("gridChanged");
  }
}
