import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents, UIEvents } from "../types/GameEvents";
import { GameState } from "../core/GameState";
import { Grid } from "../core/Grid";
import { ItemRegistry } from "../core/ItemRegistry";

export class FillButton {
  private scene: Phaser.Scene;
  private gameState: GameState;
  private grid: Grid;

  private container!: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Image;
  private text!: Phaser.GameObjects.BitmapText;
  private item!: Phaser.GameObjects.Image;

  private isDisabled: boolean = false;
  private readonly ACTIVE_TEXT_TINT = 0xffffff;
  private readonly DISABLED_TINT = 0x888888;

  constructor(scene: Phaser.Scene, x: number, y: number, gameState: GameState, grid: Grid) {
    this.scene = scene;
    this.gameState = gameState;
    this.grid = grid;

    this.create(x, y);
    this.setupListeners();
    this.updateText();
  }

  private create(x: number, y: number): void {
    this.container = this.scene.add.container(x, y).setDepth(100);

    this.bg = this.scene.add.image(0, 0, "ui", "spawn_btn").setOrigin(0.5);

    this.text = this.scene.add
      .bitmapText(0, 40, "russo", "x0", 62)
      .setOrigin(0.5)
      .setTint(this.ACTIVE_TEXT_TINT);

    this.item = this.scene.add.image(
      0,
      -36,
      "squishes",
      ItemRegistry.getFrameName(this.gameState.level),
    );

    this.container.add([this.bg, this.text, this.item]);

    // Исходный масштаб кнопки
    this.container.setScale(0.8);

    // 🎯 Делаем интерактивным ТОЛЬКО фон (зону клика)
    this.bg.setInteractive({ useHandCursor: true });

    // 🎯 ОБЪЕДИНЕННЫЙ обработчик нажатия на фон
    this.bg.on("pointerdown", () => {
      if (this.isDisabled) return;

      // 1. Анимация нажатия (уменьшаем с 0.8 до 0.7 и возвращаем обратно)
      this.scene.tweens.add({
        targets: this.container,
        scale: 0.7, // Заметное уменьшение для эффекта "вдавливания"
        duration: 100,
        yoyo: true, // Автоматически возвращает масштаб к исходному (0.8)
        ease: "Quad.easeOut",
      });

      // 2. Игровая логика
      EventBus.emit(UIEvents.FILL_REQUESTED);
    });

    // 🎯 Дополнительно: если игрок нажал, но увел мышь с кнопки, возвращаем масштаб
    this.bg.on("pointerupoutside", () => {
      if (!this.isDisabled) {
        this.scene.tweens.add({
          targets: this.container,
          scale: 0.8,
          duration: 100,
          ease: "Quad.easeOut",
        });
      }
    });

    this.bg.on("pointerover", () => {
      if (this.isDisabled) return;
      this.bg.setTint(0xdddddd);
      this.item.setTint(0x599bff);
      this.text.setTint(0xdddddd);
    });

    this.bg.on("pointerout", () => {
      if (this.isDisabled) return;
      this.bg.clearTint();
      this.item.clearTint();
      this.text.setTint(this.ACTIVE_TEXT_TINT);
    });
  }

  public updateText(): void {
    const coins = this.gameState.coins;
    const emptyCells = this.grid.getEmptyCells().length;
    const spawnCount = Math.min(coins, emptyCells);

    this.text.setText(`x${spawnCount}`);

    this.setDisabled(spawnCount === 0);
  }

  private setDisabled(disabled: boolean): void {
    if (this.isDisabled === disabled) return;
    this.isDisabled = disabled;

    if (disabled) {
      this.bg.disableInteractive();

      // 🎯 Убираем любой цветной тинт и делаем полупрозрачными
      this.bg.clearTint();
      this.bg.setAlpha(0.6); // Кнопка становится "призрачной"

      this.item.clearTint();
      this.item.setAlpha(0.4);

      this.text.setAlpha(0.4);
      this.text.setTint(0xffffff); // Белый текст на полупрозрачном фоне читается лучше
    } else {
      this.bg.setInteractive({ useHandCursor: true });

      // 🎯 Возвращаем полную яркость и цвет
      this.bg.setAlpha(1);
      this.bg.clearTint();

      this.item.setAlpha(1);
      this.item.clearTint();

      this.text.setAlpha(1);
      this.text.setTint(this.ACTIVE_TEXT_TINT);
    }
  }

  private setupListeners(): void {
    this.handleGridChange = () => this.updateText();
    this.handleCoinsChange = () => this.updateText();

    EventBus.on(GameEvents.GRID_ITEM_CHANGED, this.handleGridChange);
    EventBus.on(GameEvents.COINS_CHANGED, this.handleCoinsChange);
  }

  private handleGridChange!: () => void;
  private handleCoinsChange!: () => void;

  public destroy(): void {
    EventBus.off(GameEvents.GRID_ITEM_CHANGED, this.handleGridChange);
    EventBus.off(GameEvents.COINS_CHANGED, this.handleCoinsChange);
    this.container.destroy();
  }
}
