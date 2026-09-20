import { EventBus } from "./EventBus";
import { GameEvents, ComboData } from "../types/GameEvents";

export class ComboService {
  private lastMergedItemId: string | null = null;
  private comboCount: number = 0;

  constructor() {
    this.bindEvents();
  }

  private bindEvents(): void {
    EventBus.on(GameEvents.GRID_ITEM_MERGED, this.handleMerge, this);
    EventBus.on(GameEvents.GRID_RESTORED, this.reset, this);
  }

  private handleMerge(data: { newLevel: number; item: any; itemFrom: any; itemTo: any }): void {
    const { itemFrom, itemTo, item: newItem } = data;

    // Проверяем, является ли текущее слияние продолжением цепочки.
    // Цепочка продолжается, если один из сливаемых предметов — это тот,
    // который был создан в предыдущем слиянии.
    const isChainContinued =
      this.lastMergedItemId !== null &&
      (this.lastMergedItemId === itemFrom.id || this.lastMergedItemId === itemTo.id);

    if (isChainContinued) {
      this.comboCount++;
    } else {
      // Цепочка разорвана или это первое слияние
      this.comboCount = 1;
    }

    // Запоминаем ID нового предмета для следующей проверки
    this.lastMergedItemId = newItem.id;

    // 🎯 Эмитим событие с актуальным множителем (x1, x2, x3...)
    EventBus.emit(GameEvents.COMBO_UPDATED, {
      multiplier: this.comboCount,
      itemId: this.lastMergedItemId,
    } as ComboData);
  }

  // 🎯 Публичный метод для принудительного сброса (например, при апе уровня)
  public reset(): void {
    if (this.comboCount > 0) {
      this.comboCount = 0;
      this.lastMergedItemId = null;
      EventBus.emit(GameEvents.COMBO_RESET);
    }
  }

  // Геттер для получения текущего состояния (полезно для UI при инициализации)
  public getCurrentCombo(): number {
    return this.comboCount;
  }

  public destroy(): void {
    EventBus.off(GameEvents.GRID_ITEM_MERGED, this.handleMerge, this);
    EventBus.off(GameEvents.GRID_RESTORED, this.reset, this);
    EventBus.off(GameEvents.LEVEL_CHANGED, this.reset, this);
  }
}
