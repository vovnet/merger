import * as Phaser from "phaser";

export class Economy {
  private registry: Phaser.Data.DataManager;

  constructor(registry: Phaser.Data.DataManager) {
    this.registry = registry;

    // 🎯 Снижаем стартовый капитал, чтобы дефицит чувствовался быстрее
    if (!this.registry.has("coins")) {
      this.registry.set("coins", 500);
    }
  }

  get currentCoins(): number {
    return this.registry.get("coins");
  }

  // 🎯 Формула стоимости спауна (растёт быстро)
  getSpawnCost(level: number): number {
    // Пример: Ур.1 = 65, Ур.2 = 110, Ур.3 = 185, Ур.4 = 290
    return 50 + Math.pow(level, 2) * 15;
  }

  // 🎯 Формула награды за слияние (растёт медленно, линейно или слабо квадратично)
  getMergeReward(newLevel: number): number {
    // Пример: Ур.2 = 12, Ур.3 = 27, Ур.4 = 48, Ур.5 = 75
    // Это даёт приятное "большое число" на экране, но математически всегда меньше затрат
    return Math.pow(newLevel, 2) * 3;
  }

  // 💰 Изменение монет
  addCoins(amount: number): boolean {
    const newBalance = this.currentCoins + amount;
    if (newBalance < 0) return false;

    this.registry.set("coins", newBalance);
    return true;
  }

  spendCoins(amount: number): boolean {
    return this.addCoins(-amount);
  }

  canAfford(amount: number): boolean {
    return this.currentCoins >= amount;
  }

  getSpawnRefund(level: number) {
    const cost = this.getSpawnCost(level);
    // Округляем вниз до целого числа, чтобы не было дробных монет (например, 2.5)
    return Math.floor(cost * 0.05);
  }

  addSpawnRefund(level: number): number {
    const refundAmount = this.getSpawnRefund(level);
    if (refundAmount > 0) {
      this.addCoins(refundAmount);
    }

    // Возвращаем фактическую добавленную сумму, чтобы UI мог её красиво показать игроку
    return refundAmount;
  }
}
