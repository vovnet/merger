import * as Phaser from "phaser";
import { GameState } from "./GameState";

export enum RouletteState {
  IDLE = "IDLE",
  SPINNING = "SPINNING",
  RESULT = "RESULT",
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
  rareIndex?: number;
  container: Phaser.GameObjects.Container;
}

export class RouletteLogic {
  private scene: Phaser.Scene;
  private gameState: GameState;
  private config: Required<RouletteConfig>;

  public reelContainer!: Phaser.GameObjects.Container;
  public currentState: RouletteState = RouletteState.IDLE;
  public reelItems: Phaser.GameObjects.Container[] = [];

  private spinTween?: Phaser.Tweens.Tween;
  private particlesCleanupTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, gameState: GameState, config: RouletteConfig = {}) {
    this.scene = scene;
    this.gameState = gameState;
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

  public generateReel(): void {
    this.reelContainer.removeAll(true);
    this.reelItems = [];

    const startX = -this.config.cardW / 2;
    const total = this.config.totalItems;

    // 🎯 1. ВИЗУАЛЬНАЯ ПРОПОРЦИЯ (То, что видит игрок)
    // 50% редкие, остальные 50% делятся поровну между тремя типами монет (~16.6% каждый)
    const rareCount = Math.floor(total * 0.5); // 25 из 50
    const othersCount = total - rareCount; // 25 из 50

    const smallCount = Math.floor(othersCount / 3);
    const mediumCount = Math.floor(othersCount / 3);
    const largeCount = othersCount - smallCount - mediumCount; // Остаток (9)

    const pool: RouletteWinData["type"][] = [];
    for (let i = 0; i < rareCount; i++) pool.push("RARE_SQUISH");
    for (let i = 0; i < smallCount; i++) pool.push("COINS_SMALL");
    for (let i = 0; i < mediumCount; i++) pool.push("COINS_MEDIUM");
    for (let i = 0; i < largeCount; i++) pool.push("COINS_LARGE");

    // Перемешиваем пул (Алгоритм Фишера-Йетса)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Генерируем ленту
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
    let rareIndex = -1;
    const isRare = type === "RARE_SQUISH";

    switch (type) {
      case "COINS_SMALL":
        value = 50;
        displayText = "50 💰";
        displayColor = "#a8e6cf";
        subtitle = "Мало";
        break;
      case "COINS_MEDIUM":
        value = 250;
        displayText = "250 💰";
        displayColor = "#ffd93d";
        subtitle = "Средне";
        break;
      case "COINS_LARGE":
        value = 1000;
        displayText = "1000 💰";
        displayColor = "#ff8c42";
        subtitle = "Много";
        break;
      case "RARE_SQUISH":
        value = 0;
        displayText = "?";
        displayColor = "#ff9edb";
        subtitle = "РЕДКИЙ!";
        rareIndex = Phaser.Math.Between(0, 63);
        break;
    }

    container.setData({ type, value, rareIndex });

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

    // 🎯 2. РЕАЛЬНАЯ МАТЕМАТИКА ВЫИГРЫША (То, что получает игрок)
    // 10% Редкий, 30% Мало, 30% Средне, 30% Много
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

    // 🎯 3. ПОИСК ПОБЕДИТЕЛЯ НА ЛЕНТЕ
    // Мы смотрим только на последние 15 позиций ленты (индексы 35-49),
    // чтобы прокрутка была долгой и драматичной.
    const minIndex = 35;
    const maxIndex = minIndex + 10;

    const candidateIndices: number[] = [];
    for (let i = minIndex; i <= maxIndex; i++) {
      if (this.reelItems[i].getData("type") === actualWinType) {
        candidateIndices.push(i);
      }
    }

    // Выбираем случайный подходящий индекс из кандидатов.
    // (При 50% заполнении редкими, там гарантированно будет много кандидатов).
    const winnerIndex =
      candidateIndices.length > 0
        ? candidateIndices[Math.floor(Math.random() * candidateIndices.length)]
        : maxIndex; // Фолбэк на всякий случай

    const winnerItem = this.reelItems[winnerIndex];

    // 🎯 4. АНИМАЦИЯ ОСТАНОВКИ
    const targetX = -(winnerItem.x - screenWidth / 2 + this.config.cardW / 2);
    const finalX = targetX + Phaser.Math.Between(-20, 20); // Небольшой рандом для реализма

    this.spinTween = this.scene.tweens.add({
      targets: this.reelContainer,
      x: finalX,
      duration: 5000,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.currentState = RouletteState.RESULT;
        onComplete({
          type: winnerItem.getData("type"),
          value: winnerItem.getData("value"),
          rareIndex: winnerItem.getData("rareIndex"),
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
