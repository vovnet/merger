import { GameState } from "./GameState";

export class Economy {
  // 🎯 Внедряем GameState вместо registry
  constructor(private gameState: GameState) {}

  // Читаем актуальные монеты напрямую из GameState
  get currentCoins(): number {
    return this.gameState.coins;
  }

  // 🎯 Формула стоимости спауна (чистая функция)
  public getSpawnCost(level: number): number {
    return 50 + Math.pow(level, 2) * 15;
  }

  // 🎯 Формула награды за слияние (чистая функция)
  public getMergeReward(newLevel: number): number {
    return Math.pow(newLevel, 2) * 3;
  }

  // 🎯 Проверка возможности покупки
  public canAfford(amount: number): boolean {
    return this.currentCoins >= amount;
  }

  // 🎯 Трата монет (делегирование в GameState)
  public spendCoins(amount: number): boolean {
    if (!this.canAfford(amount)) {
      return false;
    }
    this.gameState.addCoins(-amount);
    return true;
  }

  // 🎯 Расчет возврата
  public getSpawnRefund(level: number): number {
    const cost = this.getSpawnCost(level);
    return Math.floor(cost * 0.05);
  }

  // 🎯 Начисление возврата (делегирование в GameState)
  public addSpawnRefund(level: number): number {
    const refundAmount = this.getSpawnRefund(level);
    if (refundAmount > 0) {
      this.gameState.addCoins(refundAmount);
    }
    return refundAmount;
  }
}
