import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { ItemChain } from "./ItemChain";
import { GameState } from "../core/GameState";

export class HUD {
  private scene: Phaser.Scene;
  private gameState: GameState;
  private coinsText: Phaser.GameObjects.Text;
  private roundText: Phaser.GameObjects.Text; // 🎯 НОВОЕ: отображение раунда
  private itemChain: ItemChain;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gameState = this.scene.registry.get("gameState") as GameState;

    this.create();
    this.setupListeners();
  }

  private create(): void {
    // 💰 Текст монет (слева сверху)
    this.coinsText = this.scene.add
      .text(20, 20, `💰 0`, {
        fontSize: "24px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0, 0)
      .setDepth(100);

    // 🎯 НОВОЕ: Текст раунда (ниже монет)
    this.roundText = this.scene.add
      .text(150, 20, `🔄 Раунд 1`, {
        fontSize: "22px",
        color: "#a8e6ff", // Мягкий голубой цвет
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0, 0)
      .setDepth(100);

    this.itemChain = new ItemChain(this.scene);

    this.syncUI();
  }

  private setupListeners(): void {
    EventBus.on(GameEvents.COINS_CHANGED, () => this.syncUI());
    EventBus.on(GameEvents.LEVEL_CHANGED, () => this.syncUI());

    // 🎯 НОВОЕ: слушаем событие престижа
    EventBus.on(GameEvents.PRESTIGE_OCCURRED, (data: { newRound: number }) => {
      this.playPrestigeAnimation(data.newRound);
    });
  }

  private syncUI(): void {
    this.coinsText.setText(`💰 ${this.gameState.coins}`);
    this.roundText.setText(`🔄 Раунд ${this.gameState.round}`);
  }

  // 🎯 НОВОЕ: анимация "перерождения" при престиже
  private playPrestigeAnimation(newRound: number): void {
    // 1. Обновляем текст
    this.roundText.setText(`🔄 Раунд ${newRound}`);

    // 2. Эффект "вспышки": текст резко увеличивается и возвращается
    this.scene.tweens.add({
      targets: this.roundText,
      scale: { from: 1, to: 1.8 },
      duration: 400,
      yoyo: true,
      ease: "Back.easeOut",
    });

    // 3. Вспышка белого круга вокруг текста (опционально)
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

    // 4. Лёгкий shake монет, чтобы подчеркнуть бонус
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
    this.coinsText.destroy();
    this.roundText.destroy();
    this.itemChain.destroy();
  }
}
