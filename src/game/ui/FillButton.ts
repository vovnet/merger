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

  // 🎯 Добавляем контейнер
  private container!: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Image;
  private text!: Phaser.GameObjects.BitmapText;

  private item: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, gameState: GameState, grid: Grid) {
    this.scene = scene;
    this.gameState = gameState;
    this.grid = grid;

    this.create(x, y);
    this.setupListeners();
    this.updateText();
  }

  private create(x: number, y: number): void {
    // 1. 🎯 Создаем контейнер в нужных координатах сцены
    this.container = this.scene.add.container(x, y).setDepth(100).setScale(0.8);

    // 2. Создаем фон кнопки.
    // ВАЖНО: координаты (0, 0) теперь относительны центра контейнера!
    this.bg = this.scene.add
      .image(0, 0, "ui", "spawn_btn")
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // 3. Создаем текст.
    // Он тоже помещается в (0, 0) контейнера и идеально центрируется благодаря setOrigin(0.5)
    this.text = this.scene.add.bitmapText(0, 40, "russo", "x0", 62).setOrigin(0.5);
    this.text.setTint(0x54b1fd);

    this.item = this.scene.add.image(
      0,
      -36,
      "squishes",
      ItemRegistry.getFrameName(this.gameState.level),
    );

    this.container.add([this.bg, this.text, this.item]);

    // 5. Обработчики событий вешаем на фоновую картинку (она является зоной клика)
    this.bg.on("pointerdown", () => {
      EventBus.emit(UIEvents.FILL_REQUESTED);
    });

    this.bg.on("pointerover", () => {
      this.bg.setTint(0xdddddd);
      this.item.setTint(0x599bff);
      this.text.setTint(0xdddddd);
    });

    this.bg.on("pointerout", () => {
      this.bg.clearTint();
      this.item.clearTint();
      this.text.clearTint();
    });
  }

  public updateText(): void {
    const spawnCount = Math.min(this.gameState.coins, this.grid.getEmptyCells().length);
    this.text.setText(`x${spawnCount}`);
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
    // Отписываемся от событий
    EventBus.off(GameEvents.GRID_ITEM_CHANGED, this.handleGridChange);
    EventBus.off(GameEvents.COINS_CHANGED, this.handleCoinsChange);

    // 🎯 Уничтожение контейнера автоматически уничтожает все дочерние объекты (bg и text)
    this.container.destroy();
  }
}
