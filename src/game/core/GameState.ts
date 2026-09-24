import * as Phaser from "phaser";
import { EventBus } from "./EventBus";
import { GameEvents } from "../types/GameEvents";

export interface GameStateData {
  coins: number;
  level: number;
  spins: number;
  round: number; // 🎯 НОВОЕ: текущий раунд
  totalMerges: number; // 🎯 НОВОЕ: общее количество слияний (для статистики)
  highestLevel: number; // 🎯 НОВОЕ: максимальный достигнутый уровень за всё время
  rareSquishRanks: number[];
}

export class GameState {
  private data: GameStateData;

  // 🎯 Константы для престижа
  private readonly MAX_LEVEL = 72; // Максимальный уровень
  private readonly RARE_SQUISH_COUNT = 64;

  constructor() {
    this.data = {
      coins: 10000,
      level: 1,
      spins: 0,
      round: 1,
      totalMerges: 0,
      highestLevel: 1,
      rareSquishRanks: new Array(this.RARE_SQUISH_COUNT).fill(0),
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

  public spendSpin(): void {
    if (this.data.spins > 0) {
      this.data.spins--;
      EventBus.emit(GameEvents.SPINS_CHANGED, this.data.spins);
    }
  }

  public getRareSquishRank(index: number): number {
    if (index < 0 || index >= this.RARE_SQUISH_COUNT) {
      console.warn(`Invalid rare squish index: ${index}`);
      return 0;
    }
    return this.data.rareSquishRanks[index];
  }

  public isRareSquishDiscovered(index: number): boolean {
    return this.getRareSquishRank(index) > 0;
  }

  public getDiscoveredRareSquishCount(): number {
    return this.data.rareSquishRanks.filter((rank) => rank > 0).length;
  }

  public incrementMerges(): void {
    this.data.totalMerges++;
  }

  public hasReachedMaxLevel(): boolean {
    return this.data.level >= this.MAX_LEVEL;
  }

  public prestige(): void {
    const previousRound = this.data.round;
    const bonus = 100 * this.data.round;

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

  public setRareSquishRank(index: number, rank: number): void {
    if (index < 0 || index >= this.RARE_SQUISH_COUNT) {
      console.warn(`Invalid rare squish index: ${index}`);
      return;
    }

    const previousRank = this.data.rareSquishRanks[index];
    if (previousRank !== rank) {
      this.data.rareSquishRanks[index] = rank;

      EventBus.emit(GameEvents.RARE_SQUISH_RANK_CHANGED, {
        index,
        rank,
        previousRank,
      });

      console.log(`💎 Редкий сквиш #${index + 1}: ранг ${previousRank} → ${rank}`);
    }
  }

  public upgradeRandomRareSquish(): { index: number } {
    const index = Phaser.Math.Between(0, this.RARE_SQUISH_COUNT - 1);
    this.discoverRareSquish(index);
    return { index };
  }

  public discoverRareSquish(index: number): void {
    this.setRareSquishRank(index, this.data.round);
  }

  // --- СОХРАНЕНИЕ И ЗАГРУЗКА ---
  public serialize(): GameStateData {
    return {
      ...this.data,
      rareSquishRanks: [...this.data.rareSquishRanks], // Копия массива
    };
  }

  public deserialize(savedData: Partial<GameStateData>): void {
    this.data = {
      ...this.data,
      ...savedData,
      rareSquishRanks: savedData.rareSquishRanks
        ? [...savedData.rareSquishRanks]
        : new Array(this.RARE_SQUISH_COUNT).fill(0),
    };

    EventBus.emit(GameEvents.COINS_CHANGED, { value: this.data.coins, previousValue: 0 });
    EventBus.emit(GameEvents.LEVEL_CHANGED, { value: this.data.level, previousValue: 0 });
    EventBus.emit(GameEvents.SPINS_CHANGED, this.data.spins);
    EventBus.emit(GameEvents.GAME_STATE_LOADED);
  }
}
