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

    // 🎯 Определяем имя кадра из атласа (циклически по количеству кадров)
    const totalFrames = 72; // Количество сквишей в атласе
    const frameIndex = ((item.level - 1) % totalFrames) + 1;
    const frameName = String(frameIndex); // Имена кадров: "1", "2", ... "72"

    // 🎯 Загружаем спрайт из атласа
    const squish = this.scene.add.image(0, 0, "squishes", frameName);
    squish.setOrigin(0.5); // Центрируем относительно контейнера

    // 🎯 Скейлим по наибольшей стороне, чтобы вписался в клетку
    const targetSize = this.cellSize - this.padding - 10; // 80px (немного меньше клетки для отступа)
    const maxDimension = Math.max(squish.width, squish.height);
    const targetScale = targetSize / maxDimension;
    // squish.setScale(targetScale);

    squish.setScale(0);

    container.add([squish]);

    // 🎯 Увеличиваем хитбокс для удобства (радиус 45px = диаметр 90px)
    const hitArea = new Phaser.Geom.Circle(0, 0, 45);
    container.setInteractive({
      draggable: true,
      hitArea: hitArea,
      hitAreaCallback: Phaser.Geom.Circle.Contains,
    });

    this.setupDraggable(container);
    this.sprites.set(item.id, container);

    //  АНИМАЦИЯ ПОЯВЛЕНИЯ: эффект капли/пружинки
    this.scene.tweens.add({
      targets: squish,
      scale: { from: 0, to: targetScale * 1.15 },
      duration: 200, // Быстрее
      ease: "Back.easeOut",
      delay: 0,
      onComplete: () => {
        this.scene.tweens.add({
          targets: squish,
          scale: targetScale,
          duration: 100,
          ease: "Power2.out",
        });
      },
    });
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
