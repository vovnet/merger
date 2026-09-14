import * as Phaser from "phaser";
import { Grid, MergeResult } from "./Grid";
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
          0.8,
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

  private setupDraggable(container: Phaser.GameObjects.Container): void {
    const hitArea = new Phaser.Geom.Circle(0, 0, 40);

    container.setInteractive({
      draggable: true,
      hitArea: hitArea,
      hitAreaCallback: Phaser.Geom.Circle.Contains,
    });

    container.on("dragstart", () => {
      container.setDepth(100);
    });

    container.on("drag", (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      container.x = dragX;
      container.y = dragY;
    });

    container.on("dragend", () => {
      container.setDepth(0);

      const startPos = container.getData("gridPos");
      const targetPos = this.pixelToGrid(container.x, container.y);

      if (!targetPos || (targetPos.x === startPos.x && targetPos.y === startPos.y)) {
        this.snapBack(container, startPos);
        return;
      }

      const mergeResult = this.grid.tryMerge(startPos, targetPos);

      if (mergeResult.result === MergeResult.INVALID) {
        this.snapBack(container, startPos);
      } else if (mergeResult.result === MergeResult.MOVED) {
        // Анимацию сделает moveItemSprite через событие itemMoved
        this.snapBack(container, startPos);
      } else if (mergeResult.result === MergeResult.MERGED && mergeResult.newItem) {
        // Слияние произошло — спрайты уже обновлены через события
      }
    });
  }

  private createItemSprite(pos: GridPosition, item: ItemData): void {
    const { px, py } = this.gridToPixel(pos);
    const container = this.scene.add.container(px, py);

    container.setData("gridPos", { ...pos });
    container.setData("itemId", item.id);

    // 🎯 Расширенная палитра для 37 уровней (от тусклых к легендарным)
    const colors = [
      0xe74c3c, // 🔴 Красный
      0xf39c12, // 🟠 Оранжевый
      0xf1c40f, // 🟡 Жёлтый
      0x2ecc71, // 🟢 Зелёный
      0x1abc9c, // 🟦 Бирюзовый
      0x3498db, // 🔵 Синий
      0x9b59b6, // 🟣 Фиолетовый
      0xe91e63, // 🌸 Маджента
    ];
    const color = colors[(item.level - 1) % colors.length];

    const circle = this.scene.add.circle(0, 0, 40, color);
    circle.setStrokeStyle(3, 0xffffff);

    const levelText = this.scene.add
      .text(0, 0, `${item.level}`, {
        fontSize: "28px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    container.add([circle, levelText]);
    this.setupDraggable(container);

    this.sprites.set(item.id, container);
  }

  private snapBack(container: Phaser.GameObjects.Container, pos: GridPosition): void {
    console.log("back item");
    const { px, py } = this.gridToPixel(pos);
    container.x = px;
    container.y = py;
  }

  private moveItemSprite(from: GridPosition, to: GridPosition): void {
    const { px, py } = this.gridToPixel(to);

    for (const sprite of this.sprites.values()) {
      const spritePos = sprite.getData("gridPos");
      if (spritePos && spritePos.x === from.x && spritePos.y === from.y) {
        sprite.setData("gridPos", { ...to });
        sprite.x = px;
        sprite.y = py;
        break;
      }
    }
  }

  private removeItemSprite(pos: GridPosition): void {
    for (const [id, sprite] of this.sprites.entries()) {
      const spritePos = sprite.getData("gridPos");
      if (spritePos && spritePos.x === pos.x && spritePos.y === pos.y) {
        sprite.destroy();
        this.sprites.delete(id);
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
