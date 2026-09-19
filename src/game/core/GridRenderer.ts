import * as Phaser from "phaser";
import { Grid, GridSnapshot, MergeResult } from "./Grid";
import { GridPosition, ItemData } from "../types/Item";
import { ItemRegistry } from "./ItemRegistry";
import { EventBus } from "./EventBus";
import { GameEvents } from "../types/GameEvents";
import { ContractUpdateData } from "../types/Contract";

export class GridRenderer {
  private scene: Phaser.Scene;
  private grid: Grid;
  private sprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private activeContractLevel: number | null = null;

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

    EventBus.on(GameEvents.CONTRACT_UPDATED, this.onContractHighlightUpdated, this);
  }

  private drawGridBackground(): void {
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        const { px, py } = this.gridToPixel({ x, y });
        const cellSize = this.cellSize - this.padding;
        const cornerRadius = 12; // 🎯 Скругление углов

        const graphics = this.scene.add.graphics();
        graphics.setDepth(0);

        // 🎯 Полупрозрачный фон клетки (alpha 0.3 вместо 0.8)
        graphics.fillStyle(0x2a2a3e, 0.3);
        graphics.fillRoundedRect(
          px - cellSize / 2,
          py - cellSize / 2,
          cellSize,
          cellSize,
          cornerRadius,
        );

        // 🎯 Мягкая обводка (тоньше и светлее)
        graphics.lineStyle(1.5, 0x4a4a6e, 0.5); // alpha 0.5 вместо 1.0
        graphics.strokeRoundedRect(
          px - cellSize / 2,
          py - cellSize / 2,
          cellSize,
          cellSize,
          cornerRadius,
        );
      }
    }
  }

  private bindGridEvents(): void {
    EventBus.on(
      GameEvents.GRID_ITEM_ADDED,
      ({ position, item }: { position: GridPosition; item: ItemData }) => {
        this.createItemSprite(position, item);
      },
    );

    EventBus.on(GameEvents.GRID_ITEM_REMOVED, ({ position }: { position: GridPosition }) => {
      this.removeItemSprite(position);
    });

    EventBus.on(
      GameEvents.GRID_ITEM_MERGED,
      (data: { newLevel: number; item: any; itemFrom: any; itemTo: any }) => {
        // Создаем частицы в точке слияния (позиция нового предмета)
        this.createMergeParticles(data.item.pos, data.newLevel);
      },
    );

    EventBus.on(GameEvents.GRID_RESTORED, (snapshot: GridSnapshot) => {
      console.log("↩️ Отмена хода: точечное обновление");

      // 1. Собираем все ID предметов, которые ДОЛЖНЫ быть на поле согласно снимку
      const targetItemIds = new Set<string>();

      for (let y = 0; y < snapshot.cells.length; y++) {
        for (let x = 0; x < snapshot.cells[y].length; x++) {
          const item = snapshot.cells[y][x];
          if (item) {
            targetItemIds.add(item.id);

            const container = this.sprites.get(item.id);
            const targetPos = { x, y };

            if (container) {
              // Предмет есть и на экране, и в снимке. Проверяем, не сдвинулся ли он.
              const currentPos = container.getData("gridPos");
              if (currentPos.x !== x || currentPos.y !== y) {
                // 🎯 Предмет переместился! Обновляем данные и плавно двигаем визуал
                container.setData("gridPos", targetPos);
                const { px, py } = this.gridToPixel(targetPos);

                // Быстрая и плавная анимация возврата на место (150мс)
                this.scene.tweens.add({
                  targets: container,
                  x: px,
                  y: py,
                  duration: 150,
                  ease: "Power2.out",
                });
              }
            } else {
              // 🎯 Предмет есть в снимке, но нет на экране. Значит, его удалили, и теперь он восстановлен.
              // Создаем его заново (да, он проиграет анимацию появления, но это ТОЛЬКО он один!)
              this.createItemSprite(targetPos, item);
            }
          }
        }
      }

      // 2. Находим предметы, которые есть на экране, но НЕ должны быть там согласно снимку
      // (Это те, которые были добавлены после сохраненного снимка)
      for (const [id, container] of this.sprites.entries()) {
        if (!targetItemIds.has(id)) {
          // 🎯 Удаляем только лишние предметы
          container.destroy();
          this.sprites.delete(id);
        }
      }
    });

    EventBus.on(GameEvents.GRID_CLEARED, () => {
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

  private onContractHighlightUpdated(data: ContractUpdateData): void {
    this.activeContractLevel = data.activeTargetLevel;
    this.updateAllHighlights();
  }

  private updateAllHighlights(): void {
    this.sprites.forEach((container) => {
      const level = container.getData("level") as number;
      const mainSprite = container.getData("mainSprite") as Phaser.GameObjects.Image;

      if (!mainSprite) return;

      // 🎯 Получаем или создаем Graphics объект для свечения (один раз на контейнер)
      let glowGraphics = container.getData("glowGraphics") as Phaser.GameObjects.Graphics;

      if (!glowGraphics) {
        glowGraphics = this.scene.add.graphics();
        glowGraphics.setDepth(-1); // Рисуем ПОД основным спрайтом
        container.add(glowGraphics);
        container.setData("glowGraphics", glowGraphics);
      }

      // Очищаем предыдущее свечение
      glowGraphics.clear();

      // 🎯 Если это целевой айтем для текущего задания
      if (this.activeContractLevel !== null && level === this.activeContractLevel) {
        // Накладываем желтый tint на сам спрайт
        mainSprite.setTint(0xffff00);

        //  Рисуем мягкое золотое свечение позади спрайта
        const radius = 45; // Радиус свечения (чуть больше размера сквиша)

        // Внешнее мягкое свечение (полупрозрачное)
        glowGraphics.fillStyle(0xffd700, 0.3);
        glowGraphics.fillCircle(0, 0, radius + 10);

        // Внутреннее более яркое свечение
        glowGraphics.fillStyle(0xffff00, 0.5);
        glowGraphics.fillCircle(0, 0, radius);
      }
      //  Если это НЕ целевой айтем
      else {
        // Возвращаем оригинальные цвета
        mainSprite.clearTint();
      }
    });
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

    container.on("drag", (_: Phaser.Input.Pointer, dragX: number, dragY: number) => {
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
    container.setData("level", item.level);

    const frameName = ItemRegistry.getFrameName(item.level);

    // 🎯 Загружаем спрайт из атласа
    const squish = this.scene.add.image(0, 0, "squishes", frameName);
    squish.setOrigin(0.5); // Центрируем относительно контейнера

    // 🎯 Скейлим по наибольшей стороне, чтобы вписался в клетку
    const targetSize = this.cellSize - this.padding - 10; // 80px (немного меньше клетки для отступа)
    const maxDimension = Math.max(squish.width, squish.height);
    const targetScale = targetSize / maxDimension;

    squish.setScale(0);

    container.add([squish]);
    container.setData("mainSprite", squish);

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

    // 🎯 2. НАЗНАЧЕНИЕ АНИМАЦИИ БЕЗДЕЙСТВИЯ ПО КРУГУ
    // Используем остаток от деления уровня на количество анимаций (0, 1, 2 или 3)
    const animIndex = (item.level - 1) % IDLE_ANIMATIONS.length;

    // Получаем конфиг анимации, передавая текущий targetScale
    const idleConfig = IDLE_ANIMATIONS[animIndex](targetScale);

    // Запускаем твин.
    // ВАЖНО: delay должен быть больше, чем длительность анимации появления (200+100=300мс),
    // чтобы они не конфликтовали (особенно для анимации "Дыхание", которая меняет scale).
    this.scene.tweens.add({
      targets: squish,
      ...idleConfig,
      delay: 400 + Phaser.Math.Between(0, 800), // Начинаем парить после того, как предмет "упал"
    });
  }

  // В GridRenderer.ts добавь новый метод:

  private createMergeParticles(pos: GridPosition, level: number): void {
    const { px, py } = this.gridToPixel(pos);

    //  Определяем цвет частиц на основе уровня (можно использовать цвет сквиша)
    const particleColors = [
      0xff6b9d, // Розовый (уровень 1)
      0x4ecdc4, // Бирюзовый (уровень 2)
      0xffd93d, // Желтый (уровень 3)
      0xff8c42, // Оранжевый (уровень 4)
      0x9b59b6, // Фиолетовый (уровень 5)
      0xe74c3c, // Красный (уровень 6)
      0xffd700, // Золотой (уровень 7+)
    ];

    const color = particleColors[Math.min(level - 1, particleColors.length - 1)];

    // 🎯 Создаем эмиттер частиц
    const particles = this.scene.add.particles(px, py, "particle_blob", {
      speed: { min: 80, max: 160 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 }, // Уменьшаются до исчезновения
      lifespan: 500, // Живут 0.5 секунды
      gravityY: 250, // Слегка падают вниз (как брызги)
      tint: color, // Цвет на основе уровня
      alpha: { start: 1, end: 0.5 }, // Постепенно исчезают
      emitting: false, // Не эмитим постоянно
      blendMode: "ADD", // Режим смешивания для свечения
    });

    // 🎯 Выпускаем частицы одним "пшиком"
    particles.explode(20); // 12 частиц за раз

    // 🎯 Уничтожаем эмиттер после завершения анимации
    this.scene.time.delayedCall(600, () => {
      particles.destroy();
    });
  }

  private snapBack(container: Phaser.GameObjects.Container, pos: GridPosition): void {
    console.log("back item");
    const { px, py } = this.gridToPixel(pos);
    container.x = px;
    container.y = py;
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

const IDLE_ANIMATIONS = [
  // 1. Классическое парение (вверх-вниз)
  (scale: number) => ({
    y: -4,
    duration: 500 + Phaser.Math.Between(0, 500),
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  }),

  // 2. Легкое покачивание (поворот влево-вправо)
  () => ({
    angle: 5, // 5 градусов в каждую сторону
    duration: 1000 + Phaser.Math.Between(0, 500),
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  }),

  // 3. "Дыхание" (легкое пульсирование масштаба)
  (scale: number) => ({
    scale: scale * 1.05, // Увеличиваем на 5% от целевого размера
    duration: 800 + Phaser.Math.Between(0, 500),
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  }),

  // 4. Комбинированная: парение + микро-поворот
  (scale: number) => ({
    y: -3,
    angle: 3,
    duration: 1200 + Phaser.Math.Between(0, 500),
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  }),

  // 🎯 НОВОЕ: 5. Горизонтальное сплющивание/растягивание (как желе, которое сжимают сбоку)
  (scale: number) => ({
    scaleX: scale * 1.15, // Растягиваем по ширине на 15%
    scaleY: scale * 0.85, // Сжимаем по высоте на 15% (компенсация объема)
    duration: 600 + Phaser.Math.Between(0, 400),
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  }),

  // 🎯 НОВОЕ: 6. Вертикальное сплющивание/растягивание (как будто предмет подпрыгивает)
  (scale: number) => ({
    scaleX: scale * 0.85, // Сжимаем по ширине
    scaleY: scale * 1.15, // Растягиваем по высоте
    duration: 400 + Phaser.Math.Between(0, 400),
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  }),

  // 🎯 НОВОЕ: 7. Мягкое желеобразное колебание (комбо: парение + сплющивание)
  (scale: number) => ({
    y: -3,
    scaleX: scale * 1.1,
    scaleY: scale * 0.9,
    duration: 800 + Phaser.Math.Between(0, 500),
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  }),
];
