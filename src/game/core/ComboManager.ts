import { ItemData } from "../types/Item";

// Снимок состояния комбо
interface ComboSnapshot {
  lastMergedItemId: string | null;
  comboCount: number;
}

export class ComboManager {
  private lastMergedItemId: string | null = null;
  private comboCount: number = 0;

  // 🎯 Стек состояний комбо (синхронизируется с HistoryManager)
  private comboSnapshots: ComboSnapshot[] = [];

  processMerge(usedItems: ItemData[], newItem: ItemData): number {
    if (this.lastMergedItemId === null) {
      this.comboCount = 1;
    } else {
      const isChain = usedItems.some((item) => item.id === this.lastMergedItemId);
      this.comboCount = isChain ? this.comboCount + 1 : 1;
    }

    this.lastMergedItemId = newItem.id;
    return this.comboCount;
  }

  //  Сохранить текущее состояние комбо
  saveState(): void {
    this.comboSnapshots.push({
      lastMergedItemId: this.lastMergedItemId,
      comboCount: this.comboCount,
    });
  }

  //  Восстановить предыдущее состояние комбо
  restoreState(): boolean {
    if (this.comboSnapshots.length === 0) return false;

    const snapshot = this.comboSnapshots.pop()!;
    this.lastMergedItemId = snapshot.lastMergedItemId;
    this.comboCount = snapshot.comboCount;
    return true;
  }

  getCurrentMultiplier(): number {
    return this.comboCount;
  }

  clear(): void {
    this.lastMergedItemId = null;
    this.comboCount = 0;
    this.comboSnapshots = [];
  }
}
