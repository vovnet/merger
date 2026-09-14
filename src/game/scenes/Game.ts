import * as Phaser from "phaser";
import { Grid } from "../core/Grid";
import { GridRenderer } from "../core/GridRenderer";

export class Game extends Phaser.Scene {
  private grid!: Grid;
  private gridRenderer!: GridRenderer;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    // 1. Создаём логику поля 4×5
    this.grid = new Grid({ cols: 4, rows: 5 });

    // 2. Создаём рендерер
    this.gridRenderer = new GridRenderer(this, this.grid);

    // 3. Создаём UI
    this.createUI();

    // 4. Слушаем события
    this.setupEventListeners();

    // 5. Добавляем начальные предметы для теста
    // this.spawnInitialItems();
  }

  private createUI(): void {
    // Кнопка спауна
    const buttonBg = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height - 80,
      200,
      60,
      0x4a90e2,
    );
    buttonBg.setStrokeStyle(2, 0xffffff);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.add
      .text(this.scale.width / 2, this.scale.height - 80, "СПАУН (10💰)", {
        fontSize: "20px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    buttonBg.on("pointerdown", () => this.spawnRandomItem());
    buttonBg.on("pointerover", () => buttonBg.setFillStyle(0x5aa0f2));
    buttonBg.on("pointerout", () => buttonBg.setFillStyle(0x4a90e2));

    this.updateEmptyCellsCounter();
  }

  private setupEventListeners(): void {
    this.grid.on("itemAdded", () => this.updateEmptyCellsCounter());
    this.grid.on("itemRemoved", () => this.updateEmptyCellsCounter());
    this.grid.on("gridFull", () => this.showGridFullMessage());
  }

  private spawnInitialItems(): void {
    // Для теста: добавляем 3 предмета разных уровней
    this.grid.spawnRandomItem(1);
    this.grid.spawnRandomItem(2);
    this.grid.spawnRandomItem(1);
  }

  // 🎯 ГЛАВНЫЙ МЕТОД: Спаун случайного предмета
  private spawnRandomItem(): void {
    // Пока спауним только ур.1 (потом можно добавить магазин с разными уровнями)
    const item = this.grid.spawnRandomItem(1);

    if (item) {
      console.log(`✨ Создан предмет ур.${item.level}`);
      console.log(`📊 Пустых клеток: ${this.grid.getEmptyCells().length}`);
    }
  }

  private updateEmptyCellsCounter(): void {
    const emptyCount = this.grid.getEmptyCells().length;
    console.log(`📦 Свободно клеток: ${emptyCount} / ${this.grid.totalCells}`);
  }

  private showGridFullMessage(): void {
    const text = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "⚠️ ПОЛЕ ЗАПОЛНЕНО!", {
        fontSize: "32px",
        color: "#ff4757",
        fontFamily: "Arial",
        fontStyle: "bold",
        backgroundColor: "#000000",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 50,
      duration: 1500,
      onComplete: () => text.destroy(),
    });
  }
}
