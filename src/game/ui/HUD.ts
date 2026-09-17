import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { ItemChain } from "./ItemChain";

export class HUD {
  private scene: Phaser.Scene;
  private coinsText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private itemChain: ItemChain;

  private currentCoins: number = 0;
  private currentLevel: number = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
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

    this.itemChain = new ItemChain(this.scene);
  }

  private setupListeners(): void {
    // 🎯 Слушаем Registry для монет (как было в GameScene)
    this.scene.registry.events.on(
      "changedata-coins",
      (parent: any, value: number, previousValue: number) => {
        this.updateCoins(value, previousValue);
      },
    );

    // 🎯 Слушаем EventBus для уровня
    EventBus.on(GameEvents.LEVEL_CHANGED, (level: number) => {
      this.updateLevel(level);
    });

    EventBus.on(GameEvents.LEVEL_CHANGED, (level: number) => {
      this.updateLevel(level);
    });
  }

  private updateCoins(value: number, previousValue: number): void {
    this.currentCoins = value;
    this.coinsText.setText(`💰 ${value}`);

    const delta = value - previousValue;
    if (delta !== 0) {
      // Анимация "пульса" при изменении
      this.scene.tweens.add({
        targets: this.coinsText,
        scale: { from: 1.3, to: 1 },
        duration: 300,
        ease: "Back.easeOut",
      });
    }
  }

  private updateLevel(level: number): void {
    this.currentLevel = level;
    this.itemChain.update(level);
  }

  // 🎯 Публичный метод для установки начальных значений (при загрузке сохранения)
  setInitialValues(coins: number, level: number): void {
    this.currentCoins = coins;
    this.currentLevel = level;
    this.coinsText.setText(`💰 ${coins}`);
    this.levelText.setText(` Макс. уровень: ${level}`);
  }

  destroy(): void {
    this.coinsText.destroy();
    this.levelText.destroy();
    this.itemChain.destroy();
  }
}
