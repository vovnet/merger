import * as Phaser from "phaser";
import { AudioService } from "./AudioService";
import { COIN_REWARDS } from "../config/CoinRewards";
import { inRange } from "../utils/math";

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

const CARDS_BG_COLORS = {
  COINS_SMALL: 0x314a5a,
  COINS_MEDIUM: 0x57523c,
  COINS_LARGE: 0x55322d,
  RARE_SQUISH: 0x4a2c6a,
};

export class RouletteLogic {
  private scene: Phaser.Scene;
  private config: Required<RouletteConfig>;

  public reelContainer!: Phaser.GameObjects.Container;
  public currentState: RouletteState = RouletteState.IDLE;
  public reelItems: Phaser.GameObjects.Container[] = [];

  private spinTween?: Phaser.Tweens.Tween;
  private particlesCleanupTimer?: Phaser.Time.TimerEvent;
  private audioService: AudioService;

  // 🎯 Убрали gameState и economy из конструктора, так как они больше не нужны
  constructor(scene: Phaser.Scene, config: RouletteConfig = {}) {
    this.scene = scene;

    this.config = {
      totalItems: config.totalItems ?? 50,
      cardW: config.cardW ?? 120,
      cardH: config.cardH ?? 150,
      cardGap: config.cardGap ?? 10,
    };

    this.audioService = this.scene.registry.get("audioService") as AudioService;
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

    const rareCount = Math.floor(total * 0.5); // 50% редких
    const othersCount = total - rareCount;

    const smallCount = Math.floor(othersCount / 3);
    const mediumCount = Math.floor(othersCount / 3);
    const largeCount = othersCount - smallCount - mediumCount;

    const pool: RouletteWinData["type"][] = [];
    for (let i = 0; i < rareCount; i++) pool.push("RARE_SQUISH");
    for (let i = 0; i < smallCount; i++) pool.push("COINS_SMALL");
    for (let i = 0; i < mediumCount; i++) pool.push("COINS_MEDIUM");
    for (let i = 0; i < largeCount; i++) pool.push("COINS_LARGE");

    // Перемешиваем пул
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
    let displayColor = 0xffffff;
    let subtitle = "";
    const isRare = type === "RARE_SQUISH";

    // 🎯 ФИКСИРОВАННЫЕ ЗНАЧЕНИЯ НАГРАД
    switch (type) {
      case "COINS_SMALL":
        value = COIN_REWARDS.SMALL;
        displayText = `${value}`;
        displayColor = 0x8e6cf;
        subtitle = `x${COIN_REWARDS.SMALL}`;
        break;
      case "COINS_MEDIUM":
        value = COIN_REWARDS.MEDIUM;
        displayText = `${value}`;
        displayColor = 0xffd93d;
        subtitle = `x${COIN_REWARDS.MEDIUM}`;
        break;
      case "COINS_LARGE":
        value = COIN_REWARDS.LARGE;
        displayText = `${value}`;
        displayColor = 0xff8c42;
        subtitle = `x${COIN_REWARDS.LARGE}`;
        break;
      case "RARE_SQUISH":
        value = 0;
        displayText = "RARE";
        displayColor = 0xff9edb;
        subtitle = "РЕДКИЙ!";
        break;
    }

    container.setData({ type, value });

    const bgColor = CARDS_BG_COLORS[isRare ? "RARE_SQUISH" : type];
    // const bgColor = isRare ? 0x4a2c6a : 0x3a3a5e;
    const borderColor = isRare ? 0xffd700 : 0xffffff;
    const borderAlpha = isRare ? 0.9 : 0.4;

    // Фон карточки
    const bg = this.scene.add.rectangle(0, 0, this.config.cardW, this.config.cardH, bgColor);
    bg.setStrokeStyle(2, borderColor, borderAlpha);
    container.add(bg);

    // 🎯 УСЛОВНОЕ ОТОБРАЖЕНИЕ: Картинка для редкого, Текст для монет
    if (isRare) {
      const rareIcon = this.scene.add.image(0, -10, "squish-pack", "squish_pack");
      rareIcon.setScale(0.7); // Подгони под свой спрайт
      container.add(rareIcon);
    } else {
      const coin = this.createCoinSprite(value);
      container.add(coin);
    }

    // Подпись типа награды
    container.add(
      this.scene.add.bitmapText(0, 45, "russo", subtitle, 18).setOrigin(0.5).setTint(displayColor),
    );

    return container;
  }

  private createCoinSprite(amount: number) {
    const isMedium = inRange(amount, COIN_REWARDS.MEDIUM, COIN_REWARDS.LARGE - 1);
    const isHight = inRange(amount, COIN_REWARDS.LARGE, 9999999);

    const framename = isHight ? "coin_pack_3" : isMedium ? "coin_pack_2" : "coin_pack_1";

    return this.scene.add.image(0, 0, "squish-pack", framename).setOrigin(0.5).setScale(0.28);
  }

  public startSpin(onComplete: (winData: RouletteWinData) => void): void {
    if (this.currentState === RouletteState.SPINNING) return;
    this.currentState = RouletteState.SPINNING;

    const screenWidth = this.scene.scale.width;

    const winRand = Math.random();
    let actualWinType: RouletteWinData["type"];

    if (winRand < 0.1) {
      actualWinType = "RARE_SQUISH";
    } else if (winRand < 0.6) {
      actualWinType = "COINS_SMALL";
    } else if (winRand < 0.8) {
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
    const targetX = screenWidth / 2 - winnerItem.x;
    const finalX = targetX + Phaser.Math.Between(-15, 15);

    // 🎯 НАСТРОЙКА ДЛЯ ЗВУКА ЩЕЛЧКА
    let lastX = this.reelContainer.x;
    // Расстояние, которое нужно проехать, чтобы сработал следующий щелчок
    const tickDistance = this.config.cardW + this.config.cardGap;
    let accumulatedDistance = 0;

    this.spinTween = this.scene.tweens.add({
      targets: this.reelContainer,
      x: finalX,
      duration: 5000,
      ease: "Cubic.easeOut", // Звук будет идеально замедляться вместе с этой функцией!

      onUpdate: () => {
        const currentX = this.reelContainer.x;
        const delta = Math.abs(currentX - lastX);
        accumulatedDistance += delta;
        lastX = currentX;

        // 🎯 1. Вычисляем, сколько пикселей осталось до финальной точки
        const remainingDistance = Math.abs(finalX - currentX);

        // 🎯 2. Условие для щелчка:
        // - накопили достаточно расстояния (с учетом компенсации задержки, если нужна)
        // - И мы еще не на самой финишной прямой (осталось больше половины карточки)
        const triggerOffset = 15; // Компенсация задержки звука (можно оставить 0, если файл чистый)

        if (
          accumulatedDistance >= tickDistance - triggerOffset &&
          remainingDistance > tickDistance / 2
        ) {
          this.audioService?.playTickSound();

          // Сбрасываем накопленное расстояние, сохраняя остаток
          accumulatedDistance = accumulatedDistance - tickDistance;

          if (accumulatedDistance < 0) {
            accumulatedDistance = 0;
          }
        }
      },

      onComplete: () => {
        this.currentState = RouletteState.RESULT;
        onComplete({
          type: winnerItem.getData("type"),
          value: winnerItem.getData("value"),
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
