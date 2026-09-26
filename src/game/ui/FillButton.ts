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
    this.updateVisuals(); // 🎯 Переименовали для ясности: обновляет и текст, и картинку
  }

  private create(x: number, y: number): void {
    this.container = this.scene.add.container(x, y).setDepth(100);

    this.bg = this.scene.add.image(0, 0, "ui", "spawn_btn").setOrigin(0.5);

    this.text = this.scene.add
      .bitmapText(0, 40, "russo", "x0", 62)
      .setOrigin(0.5)
      .setTint(this.ACTIVE_TEXT_TINT);

    const targetSquishLevel = Math.max(1, this.gameState.level - 6);

    this.item = this.scene.add
      .image(0, -46, "squishes", ItemRegistry.getFrameName(targetSquishLevel))
      .setScale(0.9);

    this.container.add([this.bg, this.text, this.item]);
    this.container.setScale(0.8);

    this.bg.setInteractive({ useHandCursor: true });

    this.bg.on("pointerdown", () => {
      if (this.isDisabled) return;

      this.scene.tweens.add({
        targets: this.container,
        scale: 0.7,
        duration: 100,
        yoyo: true,
        ease: "Quad.easeOut",
      });

      EventBus.emit(UIEvents.FILL_REQUESTED);
    });

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
  }

  // 🎯 Этот метод теперь обновляет и текст, и картинку сквиша
  public updateVisuals(): void {
    // 1. Обновляем текст и состояние
    const coins = this.gameState.coins;
    const emptyCells = this.grid.getEmptyCells().length;
    const spawnCount = Math.min(coins, emptyCells);

    this.text.setText(`x${spawnCount}`);
    this.setDisabled(spawnCount === 0);

    // 2. 🎯 ОБНОВЛЯЕМ КАРТИНКУ СКВИША (на случай, если уровень игрока изменился)
    const targetSquishLevel = Math.max(1, this.gameState.level - 6);
    const frameName = ItemRegistry.getFrameName(targetSquishLevel);

    // setTexture мгновенно меняет кадр, не пересоздавая объект Image
    this.item.setTexture("squishes", frameName);
  }

  private setDisabled(disabled: boolean): void {
    if (this.isDisabled === disabled) {
      return;
    }

    this.isDisabled = disabled;

    if (disabled) {
      this.bg.disableInteractive();

      // Используем Alpha для чистого эффекта неактивности (вместо грязного tint)
      this.bg.clearTint();
      this.bg.setAlpha(0.4);

      this.item.clearTint();
      this.item.setAlpha(0.4);

      this.text.setAlpha(0.4);
      this.text.setTint(0xffffff);
    } else {
      this.bg.setInteractive({ useHandCursor: true });

      this.bg.setAlpha(1);
      this.bg.clearTint();

      this.item.setAlpha(1);
      this.item.clearTint();

      this.text.setAlpha(1);
      this.text.setTint(this.ACTIVE_TEXT_TINT);
    }
  }

  private setupListeners(): void {
    this.handleGridChange = () => this.updateVisuals();
    this.handleCoinsChange = () => this.updateVisuals();
    this.handleLevelChange = () => this.updateVisuals(); // 🎯 Добавили слушатель уровня

    EventBus.on(GameEvents.GRID_ITEM_CHANGED, this.handleGridChange);
    EventBus.on(GameEvents.COINS_CHANGED, this.handleCoinsChange);
    EventBus.on(GameEvents.LEVEL_CHANGED, this.handleLevelChange);
  }

  private handleGridChange!: () => void;
  private handleCoinsChange!: () => void;
  private handleLevelChange!: () => void; // 🎯 Новая ссылка на обработчик

  public destroy(): void {
    EventBus.off(GameEvents.GRID_ITEM_CHANGED, this.handleGridChange);
    EventBus.off(GameEvents.COINS_CHANGED, this.handleCoinsChange);
    EventBus.off(GameEvents.LEVEL_CHANGED, this.handleLevelChange); // 🎯 Чистим за собой

    this.container.destroy();
  }
}
