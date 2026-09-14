import Phaser from "phaser";
import { Grid } from "./Grid";
import { GridPosition, ItemData } from "../types/Item";

export class GridRenderer {
  private scene: Phaser.Scene;
  private grid: Grid;
  private sprites: Map<string, Phaser.GameObjects.Container> = new Map();

  private readonly cellSize: number = 100;
  private readonly padding: number = 10;
  private readonly offsetX: number;
  private readonly offsetY: number;

  constructor(scene: Phaser.Scene, grid: Grid) {
    this.scene = scene;
    this.grid = grid;

    const totalWidth = grid.cols * this.cellSize;
    const totalHeight = grid.rows * this.cellSize;
    this.offsetX = (scene.scale.width - totalWidth) / 2;
    this.offsetY = (scene.scale.height - totalHeight) / 2;

    this.drawGridBackground();
    this.bindGridEvents();
  }

  private drawGridBackground(): void {
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        const { px, py } = this.gridToPixel({ x, y });

        const cell = this.scene.add.rectangle(
          px,
          py,
          this.cellSize - this.padding,
          this.cellSize - this.padding,
          0x2a2a3e,
          0.5,
        );
        cell.setStrokeStyle(2, 0x4a4a6e);
      }
    }
  }

  private bindGridEvents(): void {
    this.grid.on("itemAdded", ({ position, item }: { position: GridPosition; item: ItemData }) => {
      this.createItemSprite(position, item);
    });

    this.grid.on("itemRemoved", ({ position }: { position: GridPosition }) => {
      this.removeItemSprite(position);
    });

    this.grid.on("itemMoved", ({ from, to }: { from: GridPosition; to: GridPosition }) => {
      this.moveItemSprite(from, to);
    });

    this.grid.on("gridCleared", () => {
      this.clearAllSprites();
    });
  }

  gridToPixel(pos: GridPosition): { px: number; py: number } {
    return {
      px: this.offsetX + pos.x * this.cellSize + this.cellSize / 2,
      py: this.offsetY + pos.y * this.cellSize + this.cellSize / 2,
    };
  }

  pixelToGrid(px: number, py: number): GridPosition | null {
    const x = Math.floor((px - this.offsetX) / this.cellSize);
    const y = Math.floor((py - this.offsetY) / this.cellSize);
    const pos = { x, y };
    return this.grid.isValidPosition(pos) ? pos : null;
  }

  // 🎯 Создание спрайта предмета с поддержкой текстур
  private createItemSprite(pos: GridPosition, item: ItemData): void {
    const { px, py } = this.gridToPixel(pos);

    const container = this.scene.add.container(px, py);

    // Проверяем, есть ли текстура для этого уровня
    const textureKey = `item_level_${item.level}`;
    let visual: Phaser.GameObjects.GameObject;

    if (this.scene.textures.exists(textureKey)) {
      // Используем текстуру
      visual = this.scene.add.image(0, 0, textureKey);
    } else {
      // Fallback: программная отрисовка (разные цвета по уровню)
      visual = this.createFallbackVisual(item.level);
    }

    // Текст уровня
    const levelText = this.scene.add
      .text(0, 0, `${item.level}`, {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    container.add([visual, levelText]);

    // Анимация появления
    container.setY(py - 200);
    container.setAlpha(0);
    this.scene.tweens.add({
      targets: container,
      y: py,
      alpha: 1,
      duration: 300,
      ease: "Bounce.easeOut",
    });

    this.sprites.set(item.id, container);
  }

  // Fallback визуал (если нет текстуры)
  private createFallbackVisual(level: number): Phaser.GameObjects.Shape {
    const colors = [
      0x95a5a6, // ур.1 - серый
      0x3498db, // ур.2 - синий
      0x9b59b6, // ур.3 - фиолетовый
      0xe74c3c, // ур.4 - красный
      0xf39c12, // ур.5 - оранжевый
      0x2ecc71, // ур.6 - зелёный
      0xf1c40f, // ур.7 - золотой
    ];

    const color = colors[level - 1] || 0x95a5a6;
    const circle = this.scene.add.circle(0, 0, 40, color);
    circle.setStrokeStyle(3, 0xffffff);
    return circle;
  }

  private removeItemSprite(pos: GridPosition): void {
    for (const [id, sprite] of this.sprites.entries()) {
      const { px, py } = this.gridToPixel(pos);
      if (Math.abs(sprite.x - px) < 5 && Math.abs(sprite.y - py) < 5) {
        this.scene.tweens.add({
          targets: sprite,
          alpha: 0,
          scale: 0,
          duration: 200,
          onComplete: () => sprite.destroy(),
        });
        this.sprites.delete(id);
        break;
      }
    }
  }

  private moveItemSprite(from: GridPosition, to: GridPosition): void {
    const { px, py } = this.gridToPixel(to);
    for (const sprite of this.sprites.values()) {
      const fromPos = this.gridToPixel(from);
      if (Math.abs(sprite.x - fromPos.px) < 5 && Math.abs(sprite.y - fromPos.py) < 5) {
        this.scene.tweens.add({
          targets: sprite,
          x: px,
          y: py,
          duration: 200,
          ease: "Power2",
        });
        break;
      }
    }
  }

  private clearAllSprites(): void {
    for (const sprite of this.sprites.values()) {
      sprite.destroy();
    }
    this.sprites.clear();
  }

  destroy(): void {
    this.clearAllSprites();
    this.grid.removeAllListeners();
  }
}
