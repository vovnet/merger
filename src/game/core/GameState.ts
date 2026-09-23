import { EventBus } from "./EventBus";
import { GameEvents } from "../types/GameEvents";

export interface GameStateData {
  coins: number;
  level: number;
  spins: number;
  round: number; // 🎯 НОВОЕ: текущий раунд
  totalMerges: number; // 🎯 НОВОЕ: общее количество слияний (для статистики)
  highestLevel: number; // 🎯 НОВОЕ: максимальный достигнутый уровень за всё время
}

export class GameState {
  private data: GameStateData;

  // 🎯 Константы для престижа
  private readonly MAX_LEVEL = 72; // Максимальный уровень

  constructor() {
    this.data = {
      coins: 500,
      level: 1,
      spins: 10,
      round: 1,
      totalMerges: 200,
      highestLevel: 6,
    };
  }

  // --- ГЕТТЕРЫ ---
  public get coins(): number {
    return this.data.coins;
  }
  public get level(): number {
    return this.data.level;
  }
  public get spins(): number {
    return this.data.spins;
  }
  public get round(): number {
    return this.data.round;
  }
  public get totalMerges(): number {
    return this.data.totalMerges;
  }
  public get highestLevel(): number {
    return this.data.highestLevel;
  }

  // --- МЕТОДЫ ИЗМЕНЕНИЯ ---
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
    if (this.data.level !== value) {
      const previous = this.data.level;
      this.data.level = value;

      // Обновляем highestLevel
      if (value > this.data.highestLevel) {
        this.data.highestLevel = value;
      }

      EventBus.emit(GameEvents.LEVEL_CHANGED, { value, previousValue: previous });
    }
  }

  public addSpins(amount: number): void {
    if (amount > 0) {
      this.data.spins += amount;
      EventBus.emit(GameEvents.SPINS_CHANGED, this.data.spins);
    }
  }

  // 🎯 НОВОЕ: Увеличиваем счётчик слияний
  public incrementMerges(): void {
    this.data.totalMerges++;
  }

  // 🎯 НОВОЕ: Проверка, достигнут ли максимальный уровень
  public hasReachedMaxLevel(): boolean {
    return this.data.level >= this.MAX_LEVEL;
  }

  public prestige(): void {
    const previousRound = this.data.round;
    const bonus = 100 * this.data.round;

    // 🎯 ИСПРАВЛЕНО: используем setLevel() вместо прямого присваивания
    // Это эмитит событие LEVEL_CHANGED, и все подписчики обновятся
    this.setLevel(1);

    this.data.round++;
    this.data.coins += bonus;
    this.data.spins += 10;

    console.log(`🔄 ПРЕСТИЖ! Раунд ${previousRound} → ${this.data.round}`);
    console.log(`💰 Бонус: +${bonus} монет, +10 спинов`);

    EventBus.emit(GameEvents.PRESTIGE_OCCURRED, {
      newRound: this.data.round,
      previousRound: previousRound,
      bonusCoins: bonus,
    });
  }

  // --- СОХРАНЕНИЕ И ЗАГРУЗКА ---
  public serialize(): GameStateData {
    return { ...this.data };
  }

  public deserialize(savedData: Partial<GameStateData>): void {
    this.data = { ...this.data, ...savedData };

    EventBus.emit(GameEvents.COINS_CHANGED, { value: this.data.coins, previousValue: 0 });
    EventBus.emit(GameEvents.LEVEL_CHANGED, { value: this.data.level, previousValue: 0 });
    EventBus.emit(GameEvents.SPINS_CHANGED, this.data.spins);
    EventBus.emit(GameEvents.GAME_STATE_LOADED);
  }
}
