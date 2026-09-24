import * as Phaser from "phaser";
import { GameState } from "./GameState";
import { Economy } from "./Economy"; // 🎯 Добавляем импорт Economy

const BASE_MULTIPLYERS = {
  LOW: 10,
  MIDDLE: 20,
  HIGHT: 40,
};

export enum RouletteState {
  IDLE = "IDLE",
  SPINNING = "SPINNING",
  RESULT = "RESULT",
  SHOWING_PRIZE = "SHOWING_PRIZE",
}

export interface RouletteConfig {
  totalItems?: number;
  cardW?: number;
  cardH?: number;
  cardGap?: number;
}

export interface RouletteWinData {
  type: "COINS_SMALL" | "COINS_MEDIUM" | "COINS_LARGE" | "RARE_SQUISH";
  value: number;
  container: Phaser.GameObjects.Container;
  rareIndex?: number;
}

export class RouletteLogic {
  private scene: Phaser.Scene;
  private gameState: GameState;
  private economy: Economy; // 🎯 Ссылка на экономику
  private config: Required<RouletteConfig>;

  public reelContainer!: Phaser.GameObjects.Container;
  public currentState: RouletteState = RouletteState.IDLE;
  public reelItems: Phaser.GameObjects.Container[] = [];

  private spinTween?: Phaser.Tweens.Tween;
  private particlesCleanupTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, gameState: GameState, config: RouletteConfig = {}) {
    this.scene = scene;
    this.gameState = gameState;
    // 🎯 Получаем Economy из реестра (как мы делали ранее)
    this.economy = scene.registry.get("economy") as Economy;

    this.config = {
      totalItems: config.totalItems ?? 50,
      cardW: config.cardW ?? 120,
      cardH: config.cardH ?? 150,
      cardGap: config.cardGap ?? 10,
    };
  }

  public initReel(screenWidth: number, screenHeight: number): void {
    this.reelContainer = this.scene.add.container(0, screenHeight / 2).setDepth(10);
    this.generateReel();
  }

  public reset(): void {
    this.currentState = RouletteState.IDLE;
    this.reelItems = [];
    this.spinTween?.stop();
    this.particlesCleanupTimer?.destroy();
  }

  // 🎯 НОВАЯ ФУНКЦИЯ: Округление до "красивых" чисел (всегда в большую сторону для щедрости)
  private roundToBeautiful(value: number): number {
    if (value <= 0) return 0;
    if (value < 500) return Math.ceil(value / 50) * 50; // 100, 150, 200... 450, 500
    if (value < 5000) return Math.ceil(value / 500) * 500; // 1000, 1500, 2000... 4500, 5000
    return Math.ceil(value / 1000) * 1000; // 6000, 7000, 10000...
  }

  public generateReel(): void {
    this.reelContainer.removeAll(true);
    this.reelItems = [];

    const startX = -this.config.cardW / 2;
    const total = this.config.totalItems;

    const rareCount = Math.floor(total * 0.5);
    const othersCount = total - rareCount;

    const smallCount = Math.floor(othersCount / 3);
    const mediumCount = Math.floor(othersCount / 3);
    const largeCount = othersCount - smallCount - mediumCount;

    const pool: RouletteWinData["type"][] = [];
    for (let i = 0; i < rareCount; i++) pool.push("RARE_SQUISH");
    for (let i = 0; i < smallCount; i++) pool.push("COINS_SMALL");
    for (let i = 0; i < mediumCount; i++) pool.push("COINS_MEDIUM");
    for (let i = 0; i < largeCount; i++) pool.push("COINS_LARGE");

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    for (let i = 0; i < total; i++) {
      const x = startX + i * (this.config.cardW + this.config.cardGap);
      const item = this.createReelItem(i, x, 0, pool[i]);
      this.reelContainer.add(item);
      this.reelItems.push(item);
    }
  }

  private createReelItem(
    index: number,
    x: number,
    y: number,
    type: RouletteWinData["type"],
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    let value = 0;
    let displayText = "";
    let displayColor = "#ffffff";
    let subtitle = "";
    const isRare = type === "RARE_SQUISH";

    // 🎯 ДИНАМИЧЕСКИЙ РАСЧЁТ НАГРАД
    const spawnCost = this.economy.getSpawnCost(this.gameState.level);

    // Базовые множители
    const rawSmall = spawnCost * BASE_MULTIPLYERS.LOW;
    const rawMedium = spawnCost * BASE_MULTIPLYERS.MIDDLE;
    const rawLarge = spawnCost * BASE_MULTIPLYERS.HIGHT;

    // Округляем до красивых значений
    const beautifulSmall = this.roundToBeautiful(rawSmall);
    const beautifulMedium = this.roundToBeautiful(rawMedium);
    const beautifulLarge = this.roundToBeautiful(rawLarge);

    switch (type) {
      case "COINS_SMALL":
        value = beautifulSmall;
        displayText = `${value} 💰`;
        displayColor = "#a8e6cf";
        subtitle = "Мало";
        break;
      case "COINS_MEDIUM":
        value = beautifulMedium;
        displayText = `${value} 💰`;
        displayColor = "#ffd93d";
        subtitle = "Средне";
        break;
      case "COINS_LARGE":
        value = beautifulLarge;
        displayText = `${value} 💰`;
        displayColor = "#ff8c42";
        subtitle = "Много";
        break;
      case "RARE_SQUISH":
        value = 0;
        displayText = "?";
        displayColor = "#ff9edb";
        subtitle = "РЕДКИЙ!";
        break;
    }

    container.setData({ type, value });

    const bgColor = isRare ? 0x4a2c6a : 0x3a3a5e;
    const borderColor = isRare ? 0xffd700 : 0xffffff;
    const borderAlpha = isRare ? 0.9 : 0.4;

    const bg = this.scene.add.rectangle(0, 0, this.config.cardW, this.config.cardH, bgColor);
    bg.setStrokeStyle(2, borderColor, borderAlpha);
    container.add(bg);

    const mockIcon = this.scene.add
      .text(0, -10, displayText, {
        fontSize: isRare ? "72px" : "28px",
        color: displayColor,
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: isRare ? 6 : 2,
      })
      .setOrigin(0.5);
    container.add(mockIcon);

    container.add(
      this.scene.add
        .text(0, 45, subtitle, {
          fontSize: "14px",
          color: "#cccccc",
          fontFamily: "Arial",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    return container;
  }

  public startSpin(onComplete: (winData: RouletteWinData) => void): void {
    if (this.currentState === RouletteState.SPINNING) return;
    this.currentState = RouletteState.SPINNING;

    const screenWidth = this.scene.scale.width;

    const winRand = Math.random();
    let actualWinType: RouletteWinData["type"];

    if (winRand < 0.1) {
      actualWinType = "RARE_SQUISH";
    } else if (winRand < 0.4) {
      actualWinType = "COINS_SMALL";
    } else if (winRand < 0.7) {
      actualWinType = "COINS_MEDIUM";
    } else {
      actualWinType = "COINS_LARGE";
    }

    const minIndex = 35;
    const maxIndex = minIndex + 10;

    const candidateIndices: number[] = [];
    for (let i = minIndex; i <= maxIndex; i++) {
      if (this.reelItems[i].getData("type") === actualWinType) {
        candidateIndices.push(i);
      }
    }

    const winnerIndex =
      candidateIndices.length > 0
        ? candidateIndices[Math.floor(Math.random() * candidateIndices.length)]
        : maxIndex;

    const winnerItem = this.reelItems[winnerIndex];

    const targetX = -(winnerItem.x - screenWidth / 2 + this.config.cardW / 2);
    const finalX = targetX + Phaser.Math.Between(-20, 20);

    this.spinTween = this.scene.tweens.add({
      targets: this.reelContainer,
      x: finalX,
      duration: 5000,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.currentState = RouletteState.RESULT;
        onComplete({
          type: winnerItem.getData("type"),
          value: winnerItem.getData("value"), // 🎯 Теперь здесь динамическое красивое число
          container: winnerItem,
        });
      },
    });
  }

  public resetForNextSpin(): void {
    this.currentState = RouletteState.IDLE;
    if (this.reelContainer) {
      this.reelContainer.x = 0;
      this.generateReel();
    }
  }

  public destroy(): void {
    this.reset();
    if (this.reelContainer) {
      this.reelContainer.destroy();
    }
    this.reelItems = [];
  }
}
