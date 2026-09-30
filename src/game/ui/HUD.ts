import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { ItemChain } from "./ItemChain";
import { GameState } from "../core/GameState";

export class HUD {
  private scene: Phaser.Scene;
  private gameState: GameState;
  private coinContainer: Phaser.GameObjects.Container;
  private coinsSprite: Phaser.GameObjects.Sprite;
  private coinsText: Phaser.GameObjects.BitmapText;
  private roundText: Phaser.GameObjects.BitmapText;
  private scoreText: Phaser.GameObjects.BitmapText;
  private itemChain: ItemChain;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gameState = this.scene.registry.get("gameState") as GameState;

    this.create();
    this.setupListeners();
  }

  private create(): void {
    this.coinsSprite = this.scene.add
      .sprite(18, 6, "ui", "coin")
      .setScale(0.8)
      .setOrigin(0.5)
      .setAngle(-20);
    this.coinsText = this.scene.add
      .bitmapText(40, 0, "russo", "", 32)
      .setOrigin(0, 0.5)
      .setDepth(100)
      .setTint(0x1ac729);
    this.coinContainer = this.scene.add.container(1040, 42, [this.coinsText, this.coinsSprite]);

    const roundIcon = this.scene.add
      .image(-20, 0, "ranks", `rank${Math.min(this.gameState.round, 37)}`)
      .setOrigin(0.5)
      .setScale(0.2);
    this.roundText = this.scene.add
      .bitmapText(0, 0, "russo", `${this.gameState.round}`, 22)
      .setOrigin(0, 0.5)
      .setDepth(100);
    this.scene.add.container(520, 20, [roundIcon, this.roundText]);

    const scoreIcon = this.scene.add.image(-20, 0, "ui", "score_icon").setScale(0.6);
    this.scoreText = this.scene.add
      .bitmapText(0, 0, "russo", this.gameState.score.toString(), 22)
      .setOrigin(0, 0.5)
      .setTint(0xffdd1c);
    this.scene.add.container(this.scene.scale.width / 2, 20, [scoreIcon, this.scoreText]);

    EventBus.on(GameEvents.SCORE_CHANGED, (score: number) => {
      this.scoreText.setText(score.toString());
    });

    this.itemChain = new ItemChain(this.scene, this.scene.scale.width / 2, 70);

    this.syncUI();
  }

  private setupListeners(): void {
    EventBus.on(GameEvents.COINS_CHANGED, () => {
      this.syncUI(); // Сначала обновляем текст, чтобы новый номер был виден во время анимации
      this.playCoinPopAnimation(); // Затем проигрываем "сочный" эффект
    });

    EventBus.on(GameEvents.LEVEL_CHANGED, () => this.syncUI());

    EventBus.on(GameEvents.PRESTIGE_OCCURRED, (data: { newRound: number }) => {
      this.playPrestigeAnimation(data.newRound);
    });
  }

  private syncUI(): void {
    this.coinsText.setText(`💰 ${this.gameState.coins}`);
  }

  // 🎯 НОВАЯ МЕТОД: Анимация "прилета" монеты
  private playCoinPopAnimation(): void {
    // 1. Мгновенно прерываем любые текущие анимации этих объектов,
    // чтобы при быстром спаме монет не было рассинхрона или застревания масштаба
    this.scene.tweens.killTweensOf(this.coinContainer);
    this.scene.tweens.killTweensOf(this.coinsSprite);

    // Сбрасываем в исходное состояние перед началом новой анимации
    this.coinContainer.setScale(1);
    this.coinsSprite.setAngle(0);

    // 2. Анимация контейнера: резкий "удар" и упругий возврат
    this.scene.tweens.add({
      targets: this.coinContainer,
      scale: { from: 1, to: 1.25 }, // Увеличиваем на 25% (хорошо заметно)
      duration: 150, // Очень быстро (150 мс) для ощущения удара
      ease: "Back.easeOut", // Дает эффект "перелета" и пружинистого возврата
      yoyo: true, // Автоматически возвращаем масштаб к 1.0
      onComplete: () => {
        this.coinContainer.setScale(1); // Гарантируем идеальный сброс
      },
    });

    // 3. Дополнительный "сок": иконка монетки слегка наклоняется, как будто от удара
    this.scene.tweens.add({
      targets: this.coinsSprite,
      angle: { from: 0, to: 20 }, // Наклон на 20 градусов
      duration: 150,
      ease: "Quad.easeOut",
      yoyo: true,
      onComplete: () => {
        this.coinsSprite.setAngle(-20);
      },
    });
  }

  private playPrestigeAnimation(newRound: number): void {
    this.roundText.setText(`🔄 Раунд ${newRound}`);

    this.scene.tweens.add({
      targets: this.roundText,
      scale: { from: 1, to: 1.8 },
      duration: 400,
      yoyo: true,
      ease: "Back.easeOut",
    });

    const flash = this.scene.add
      .circle(
        this.roundText.x + this.roundText.width / 2,
        this.roundText.y + this.roundText.height / 2,
        10,
        0xffffff,
        0.8,
      )
      .setDepth(99);

    this.scene.tweens.add({
      targets: flash,
      scale: { from: 1, to: 8 },
      alpha: { from: 0.8, to: 0 },
      duration: 600,
      ease: "Cubic.easeOut",
      onComplete: () => flash.destroy(),
    });

    this.scene.tweens.add({
      targets: this.coinsText,
      x: { from: this.coinsText.x, to: this.coinsText.x + 3 },
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: "Sine.easeInOut",
    });
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.coinContainer);
    this.scene.tweens.killTweensOf(this.coinsSprite);
    this.coinsText.destroy();
    this.roundText.destroy();
    this.itemChain.destroy();
  }
}
