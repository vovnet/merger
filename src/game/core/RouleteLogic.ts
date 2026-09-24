import * as Phaser from "phaser";
import { ItemRegistry } from "./ItemRegistry";
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
  maxRankIcons?: number;
}

export interface RouletteWinData {
  level: number;
  isRare: boolean;
  rank: number;
  container: Phaser.GameObjects.Container;
}

export class RouletteLogic {
  public reelContainer!: Phaser.GameObjects.Container;

  private scene: Phaser.Scene;
  private gameState: GameState;
  private config: Required<RouletteConfig>;

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
      maxRankIcons: config.maxRankIcons ?? 37,
    };
  }

  // 🎯 Полный сброс состояния и очистка
  public reset(): void {
    this.currentState = RouletteState.IDLE;
    this.reelItems = [];
    this.spinTween?.stop();
    this.particlesCleanupTimer?.destroy();
  }

  // 🎯 Генерация (или перегенерация) ленты в переданный контейнер
  public generateReel(container: Phaser.GameObjects.Container): void {
    // Очищаем старые элементы, если они есть
    container.removeAll(true);
    this.reelItems = [];

    const startX = -this.config.cardW / 2;

    for (let i = 0; i < this.config.totalItems; i++) {
      const x = startX + i * (this.config.cardW + this.config.cardGap);
      const item = this.createReelItem(i, x, 0);
      container.add(item);
      this.reelItems.push(item);
    }
  }

  private createReelItem(index: number, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const isRare = Math.random() < 0.3;
    const level = isRare
      ? Phaser.Math.Between(1, 64)
      : Phaser.Math.Between(1, ItemRegistry.getMaxLevel());
    const rank = Phaser.Math.Between(1, 10);

    container.setData({ level, isRare, rank });

    const bg = this.scene.add.rectangle(
      0,
      0,
      this.config.cardW,
      this.config.cardH,
      isRare ? 0x4a2c6a : 0x3a3a5e,
    );
    bg.setStrokeStyle(2, isRare ? 0xffd700 : 0xffffff, isRare ? 0.8 : 0.4);
    container.add(bg);

    const textureKey = isRare ? "rare-squishes" : "squishes";
    const frameName = isRare ? `rare_${level}` : ItemRegistry.getFrameName(level);

    const squish = this.scene.add.image(0, -20, textureKey, frameName);
    squish.setScale(60 / Math.max(squish.width, squish.height));
    container.add(squish);

    const rankIcon = this.scene.add.image(
      0,
      -60,
      "ranks",
      `rank${Math.min(rank, this.config.maxRankIcons)}`,
    );
    rankIcon.setScale(30 / Math.max(rankIcon.width, rankIcon.height));
    container.add(rankIcon);

    container.add(
      this.scene.add
        .text(0, -35, `Ранг ${rank}`, {
          fontSize: "12px",
          color: isRare ? "#ff9edb" : "#ffd700",
          fontFamily: "Arial",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    return container;
  }

  // 🎯 Запуск анимации с колбэком на результат
  public startSpin(onComplete: (winData: RouletteWinData) => void): void {
    if (this.currentState === RouletteState.SPINNING) return;
    this.currentState = RouletteState.SPINNING;

    const screenWidth = this.scene.scale.width;
    const winnerIndex = Phaser.Math.Between(35, 45); // Рандомный выигрыш в конце ленты
    const winnerItem = this.reelItems[winnerIndex];

    const targetX = -(winnerItem.x - screenWidth / 2 + this.config.cardW / 2);
    const finalX = targetX + Phaser.Math.Between(-20, 20);

    this.spinTween = this.scene.tweens.add({
      targets: this.reelContainer, // Доступ к контейнеру через публичное свойство или передачу
      x: finalX,
      duration: 5000,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.currentState = RouletteState.RESULT;
        onComplete({
          level: winnerItem.getData("level"),
          isRare: winnerItem.getData("isRare"),
          rank: winnerItem.getData("rank"),
          container: winnerItem,
        });
      },
    });
  }

  // 🎯 Подготовка рулетки к повторному запуску без закрытия сцены
  public resetForNextSpin(): void {
    this.currentState = RouletteState.IDLE; // Возвращаем состояние в исходное

    if (this.reelContainer) {
      this.reelContainer.x = 0; // Мгновенно возвращаем ленту в начало
      this.generateReel(this.reelContainer); // Генерируем новую ленту со свежими предметами
    }
  }

  // 🎯 Визуальные эффекты выигрыша (логика частиц и подсветки)
  public highlightWinner(winData: RouletteWinData): void {
    const { container } = winData;

    const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;
    bg.setStrokeStyle(4, 0xffd700, 1);
    bg.setFillStyle(0xffd700, 0.3);

    this.scene.tweens.add({
      targets: container,
      scale: { from: 1, to: 1.15 },
      duration: 400,
      yoyo: true,
      repeat: 3,
      ease: "Sine.easeInOut",
    });

    const particles = this.scene.add.particles(
      container.x, // Относительно контейнера ленты
      container.y,
      "fireworks",
      {
        frame: ["star_1", "star_2", "confetti_1"],
        speed: { min: 100, max: 300 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 1000,
        tint: 0xffd700,
        blendMode: "ADD",
        emitting: false,
      },
    );
    particles.explode(30);
    this.particlesCleanupTimer = this.scene.time.delayedCall(1000, () => particles.destroy());
  }

  // 🎯 Гарантированная очистка при уничтожении сцены
  public destroy(): void {
    this.reset();
    this.reelItems.forEach((item) => item.destroy());
    this.reelItems = [];
  }
}
