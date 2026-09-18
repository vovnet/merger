import { Events } from "phaser";
import { Grid, GridSnapshot } from "./Grid";
import { EventBus } from "./EventBus";
import { GameEvents } from "../types/GameEvents";

export class HistoryService extends Events.EventEmitter {
  private historyStack: GridSnapshot[] = [];
  private grid: Grid | null = null;

  constructor() {
    super();
  }

  bind(grid: Grid): void {
    this.grid = grid;

    EventBus.on(GameEvents.HISTORY_CHECKPOINT, () => {
      this.save();
    });

    EventBus.on(GameEvents.LEVEL_CHANGED, () => {
      this.clear();
    });
  }

  private save(): void {
    if (!this.grid) return;
    this.historyStack.push(this.grid.getSnapshot());
    EventBus.emit(GameEvents.HISTORY_CHANGED, this.canUndo());
  }

  undo(): boolean {
    if (this.historyStack.length === 0 || !this.grid) {
      return false;
    }

    const snapshot = this.historyStack.pop()!;
    this.grid.restoreSnapshot(snapshot);

    EventBus.emit(GameEvents.HISTORY_CHANGED, this.canUndo());
    return true;
  }

  canUndo(): boolean {
    return this.historyStack.length > 0;
  }

  clear(): void {
    this.historyStack = [];
    EventBus.emit(GameEvents.HISTORY_CHANGED, false);
  }
}
