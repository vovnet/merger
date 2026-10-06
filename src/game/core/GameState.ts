import * as Phaser from "phaser";
import { EventBus } from "./EventBus";
import { GameEvents } from "../types/GameEvents";

export interface GameStateData {
  coins: number;
  level: number;
  spins: number;
  round: number;
  totalMerges: number;
  rareSquishRanks: number[];
  contractsCompleted: number;
}

export class GameState {
  private data: GameStateData;

  // 🎯 Константы для престижа
  private readonly MAX_LEVEL = 72; // Максимальный уровень
  private readonly RARE_SQUISH_COUNT = 64;
  EventBus: any;

  constructor() {
    this.data = {
      coins: 200,
      level: 1,
      spins: 0,
      round: 1,
      totalMerges: 0,
      rareSquishRanks: new Array(this.RARE_SQUISH_COUNT).fill(0),
      contractsCompleted: 0,
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
  public get score(): number {
    return this.data.totalMerges;
  }
  public get contractsCompleted(): number {
    return this.data.contractsCompleted;
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

  public incContractsCompleted() {
    this.data.contractsCompleted += 1;
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
    EventBus.emit(GameEvents.SCORE_CHANGED, this.data.totalMerges);
  }

  public hasReachedMaxLevel(): boolean {
    return this.data.level >= this.MAX_LEVEL;
  }

  public prestige(): void {
    this.setLevel(1);
    this.setRound(this.data.round + 1);

    EventBus.emit(GameEvents.PRESTIGE_OCCURRED);
  }

  private setRound(round: number) {
    this.data.round = round;
    EventBus.emit(GameEvents.ROUND_CHANGED);
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
    const currentRank = this.data.rareSquishRanks[index];
    if (currentRank <= 0) {
      this.discoverRareSquish(index);
    }
    this.setRareSquishRank(index, currentRank + 1);
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
  }
}
