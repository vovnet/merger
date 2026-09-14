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
      // Уровни 1-5: Базовые / Камень / Глина (Тусклые)
      0x95a5a6, // 1. Серый (твой оригинальный)
      0xbdc3c7, // 2. Светло-серый
      0x7f8c8d, // 3. Темно-серый
      0x546e7a, // 4. Сине-серый
      0x34495e, // 5. Темный грифель

      // Уровни 6-10: Вода / Лед (Спокойные)
      0x3498db, // 6. Синий (твой оригинальный)
      0x2980b9, // 7. Глубокий синий
      0x1abc9c, // 8. Бирюзовый
      0x16a085, // 9. Темная бирюза
      0x00bcd4, // 10. Циан

      // Уровни 11-15: Природа / Растения (Свежие)
      0x2ecc71, // 11. Зеленый (твой оригинальный)
      0x27ae60, // 12. Темно-зеленый
      0x4caf50, // 13. Светло-зеленый
      0x8bc34a, // 14. Салатовый
      0xcddc39, // 15. Желто-зеленый (Лайм)

      // Уровни 16-20: Энергия / Свет (Теплые)
      0xf1c40f, // 16. Желтый (твой оригинальный)
      0xffeb3b, // 17. Ярко-желтый
      0xf39c12, // 18. Оранжевый (твой оригинальный)
      0xff9800, // 19. Светло-оранжевый
      0xe67e22, // 20. Темно-оранжевый

      // Уровни 21-25: Огонь / Опасность (Агрессивные)
      0xd35400, // 21. Тыквенный
      0xe74c3c, // 22. Красный (твой оригинальный)
      0xc0392b, // 23. Темно-красный
      0xff5252, // 24. Ярко-красный (Неон)
      0xe91e63, // 25. Розовый / Маджента

      // Уровни 26-30: Магия / Тайна (Мистические)
      0x9b59b6, // 26. Фиолетовый (твой оригинальный)
      0x8e44ad, // 27. Темно-фиолетовый
      0x9c27b0, // 28. Аметист
      0x673ab7, // 29. Глубокий фиолетовый
      0x3f51b5, // 30. Индиго

      // Уровни 31-37: Легендарные / Артефакты (Сверхъестественные)
      0x00e5ff, // 31. Неоновый циан (Магическое свечение)
      0x00e676, // 32. Неоновый зеленый (Токсичный/Радиоактивный)
      0xffd700, // 33. Золотой (Классическое золото)
      0xffea00, // 34. Яркое золото (Сияющее)
      0xffffff, // 35. Чистый белый (Алмаз / Эфир)
      0x00ffff, // 36. Голографический циан (Мифический)
      0xff00ff, // 37. Голографическая маджента (Легендарный)
    ];
    const color = colors[item.level - 1] || 0xffffff;

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
