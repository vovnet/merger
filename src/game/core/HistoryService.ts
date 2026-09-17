import { Events } from "phaser";
import { Grid, GridSnapshot } from "./Grid";

export class HistoryService extends Events.EventEmitter {
  private historyStack: GridSnapshot[] = [];
  private grid: Grid | null = null;

  constructor() {
    super();
  }

  // 🎯 Привязываем сервис к Grid ОДИН раз при старте
  bind(grid: Grid): void {
    this.grid = grid;

    // Слушаем маркер: "Эй, сейчас будет действие игрока, сохрани состояние!"
    this.grid.on("historyCheckpoint", () => {
      this.save();
    });

    // Слушаем повышение уровня: "Эй, уровень повышен, историю надо обнулить!"
    this.grid.on("newLevelUnlocked", () => {
      this.clear();
    });
  }

  private save(): void {
    if (!this.grid) return;
    this.historyStack.push(this.grid.getSnapshot());
    this.emit("historyChanged", this.canUndo());
  }

  // 🎯 Единственный метод, который мы вызываем извне (по кнопке)
  undo(): boolean {
    if (this.historyStack.length === 0 || !this.grid) {
      return false;
    }

    const snapshot = this.historyStack.pop()!;
    this.grid.restoreSnapshot(snapshot);

    this.emit("historyChanged", this.canUndo());
    return true;
  }

  canUndo(): boolean {
    return this.historyStack.length > 0;
  }

  clear(): void {
    this.historyStack = [];
    this.emit("historyChanged", false);
  }
}
