import { EventBus } from "./EventBus";
import { GameEvents } from "../types/GameEvents";

export interface GameStateData {
  coins: number;
  level: number;
  // В будущем здесь будут: inventory, completedContracts, settings и т.д.
}

export class GameState {
  private data: GameStateData;

  constructor() {
    // Значения по умолчанию для новой игры
    this.data = {
      coins: 500,
      level: 15,
    };
  }

  // --- ГЕТТЕРЫ (для чтения) ---
  public get coins(): number {
    return this.data.coins;
  }
  public get level(): number {
    return this.data.level;
  }

  // --- МЕТОДЫ ИЗМЕНЕНИЯ (с автоматическим оповещением) ---
  public setCoins(value: number): void {
    if (this.data.coins !== value) {
      const previous = this.data.coins;
      this.data.coins = value;
      EventBus.emit(GameEvents.COINS_CHANGED, { value, previousValue: previous });
    }
  }

  public addCoins(amount: number): void {
    this.setCoins(this.data.coins + amount);
  }

  public setLevel(value: number): void {
    console.log("set leve: ", value);
    if (this.data.level !== value) {
      this.data.level = value;
      EventBus.emit(GameEvents.LEVEL_CHANGED, value);
    }
  }

  // --- СОХРАНЕНИЕ И ЗАГРУЗКА (Самое важное!) ---

  // Превращает состояние в обычный объект для JSON
  public serialize(): GameStateData {
    return { ...this.data };
  }

  // Загружает данные и рассылает события, чтобы UI обновился
  public deserialize(savedData: Partial<GameStateData>): void {
    this.data = { ...this.data, ...savedData };

    // Оповещаем всех, кто слушает, что данные загружены
    EventBus.emit(GameEvents.COINS_CHANGED, { value: this.data.coins, previousValue: 0 });
    EventBus.emit(GameEvents.LEVEL_CHANGED, this.data.level);
    EventBus.emit(GameEvents.GAME_STATE_LOADED);
  }
}
