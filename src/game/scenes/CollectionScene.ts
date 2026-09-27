import * as Phaser from "phaser";
import { ItemRegistry } from "../core/ItemRegistry";
import { GameState } from "../core/GameState";

export class CollectionScene extends Phaser.Scene {
  private gameState!: GameState;

  private gridContainer!: Phaser.GameObjects.Container;

  private readonly CARD_W = 140;
  private readonly CARD_H = 170;
  private readonly CARD_GAP = 12;
  private readonly headerHeight = 120;
  private readonly COLUMN_HEADER_HEIGHT = 80;
  private readonly MAX_RANK_ICONS = 37;
  private readonly RARE_SQUISH_COUNT = 64;

  private scrollY = 0;
  private minScroll = 0;
  private lastPointerY = 0;

  constructor() {
    super({ key: "CollectionScene" });
  }

  create(): void {
    this.gameState = this.registry.get("gameState") as GameState;

    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.scene.pause("GameScene");
    this.scene.pause("UIScene");

    // Фон
    this.add
      .rectangle(0, 0, screenWidth, screenHeight, 0x1a1a2e)
      .setOrigin(0)
      .setInteractive()
      .setDepth(0);

    this.createCardTextures();

    this.gridContainer = this.add.container(0, 0).setDepth(1);
    this.renderCollection();
    this.setupScrolling();

    this.createHeader();
  }

  private getCellState(level: number): { discovered: boolean; rank: number } {
    const isRound1 = this.gameState.round === 1;

    if (isRound1) {
      const discovered = level <= this.gameState.level;
      return { discovered, rank: discovered ? 1 : 0 };
    }

    const rank = level <= this.gameState.level ? this.gameState.round : this.gameState.round - 1;
    return { discovered: true, rank };
  }

  private renderCollection(): void {
    this.gridContainer.removeAll(true);

    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    const halfWidth = screenWidth / 2;

    const cols = Math.max(2, Math.floor((halfWidth - 40) / (this.CARD_W + this.CARD_GAP)));
    const gridWidth = cols * (this.CARD_W + this.CARD_GAP) - this.CARD_GAP;

    const leftCenterX = halfWidth / 2;
    const rightCenterX = halfWidth + halfWidth / 2;

    const startXLeft = leftCenterX - gridWidth / 2 + this.CARD_W / 2;
    const startXRight = rightCenterX - gridWidth / 2 + this.CARD_W / 2;

    const contentTopY = this.headerHeight + 20;

    const maxLevel = ItemRegistry.getMaxLevel();
    const rareFrames = this.getRareSquishFrames();

    // 🎯 1. СОБИРАЕМ ДАННЫЕ ОБ ОБЫЧНЫХ СКВИШАХ
    const normalItems: { level: number; discovered: boolean; rank: number }[] = [];
    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      const { discovered, rank } = this.getCellState(lvl);
      normalItems.push({ level: lvl, discovered, rank });
    }

    // 🎯 2. СОБИРАЕМ ДАННЫЕ О РЕДКИХ СКВИШАХ
    const rareItems: { index: number; frameName: string; discovered: boolean; rank: number }[] = [];
    for (let i = 0; i < this.RARE_SQUISH_COUNT; i++) {
      const rank = this.gameState.getRareSquishRank(i);
      const discovered = rank > 0;
      rareItems.push({ index: i, frameName: rareFrames[i], discovered, rank });
    }

    // 🎯 3. СОРТИРОВКА: открытые по убыванию ранга → закрытые в конец
    const sortByRankDesc = <T extends { discovered: boolean; rank: number }>(
      a: T,
      b: T,
    ): number => {
      if (a.discovered && !b.discovered) return -1; // a идёт раньше
      if (!a.discovered && b.discovered) return 1; // b идёт раньше
      if (a.discovered && b.discovered) return b.rank - a.rank; // убывание ранга
      return 0; // оба закрыты — порядок не важен
    };

    normalItems.sort(sortByRankDesc);
    rareItems.sort(sortByRankDesc);

    // 🎯 4. СЧИТАЕМ ВЫСОТУ КОНТЕНТА ПО ОТРИСОВАННЫМ РЯДАМ
    const normalRows = Math.ceil(normalItems.length / cols);
    const rareRows = Math.ceil(rareItems.length / cols);
    const maxRows = Math.max(normalRows, rareRows);

    const bgHeight = this.COLUMN_HEADER_HEIGHT + maxRows * (this.CARD_H + this.CARD_GAP) + 200;
    const bgTopY = contentTopY - 100;

    // 🎯 5. ФОН КОЛОНОК
    const normalBg = this.add.rectangle(
      leftCenterX,
      bgTopY + bgHeight / 2,
      halfWidth,
      bgHeight,
      0x1e1e34,
      0.6,
    );
    this.gridContainer.add(normalBg);

    const rareBg = this.add.rectangle(
      rightCenterX,
      bgTopY + bgHeight / 2,
      halfWidth,
      bgHeight,
      0x241a36,
      0.6,
    );
    this.gridContainer.add(rareBg);

    // Заголовки колонок
    this.renderColumnHeader(leftCenterX, contentTopY, "📦 ОБЫЧНЫЕ", this.getNormalSubtitle());
    this.renderColumnHeader(rightCenterX, contentTopY, "✨ РЕДКИЕ", this.getRareSubtitle());

    // Вертикальная разделительная линия
    const separatorLine = this.add.rectangle(
      halfWidth,
      bgTopY + bgHeight / 2,
      2,
      bgHeight,
      0xffffff,
      0.08,
    );
    this.gridContainer.add(separatorLine);

    const gridTopY = contentTopY + this.COLUMN_HEADER_HEIGHT;

    //  6. ОТРИСОВКА В ОТСОРТИРОВАННОМ ПОРЯДКЕ
    // Обычные сквиши
    normalItems.forEach((item, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);

      const x = startXLeft + col * (this.CARD_W + this.CARD_GAP);
      const y = gridTopY + row * (this.CARD_H + this.CARD_GAP) + this.CARD_H / 2;

      this.createCell(item.level, x, y);
    });

    // Редкие сквиши
    rareItems.forEach((item, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);

      const x = startXRight + col * (this.CARD_W + this.CARD_GAP);
      const y = gridTopY + row * (this.CARD_H + this.CARD_GAP) + this.CARD_H / 2;

      this.createRareCell(item.index, item.frameName, x, y);
    });

    // 🎯 7. СКРОЛЛ
    const contentHeight = this.COLUMN_HEADER_HEIGHT + maxRows * (this.CARD_H + this.CARD_GAP) + 40;
    const viewHeight = screenHeight - this.headerHeight;
    this.minScroll = Math.min(0, viewHeight - contentHeight);
  }

  // 🎯 Заголовок одной колонки
  private renderColumnHeader(centerX: number, y: number, title: string, subtitle: string): void {
    const titleText = this.add
      .text(centerX, y + 20, title, {
        fontSize: "22px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.gridContainer.add(titleText);

    const subtitleText = this.add
      .text(centerX, y + 48, subtitle, {
        fontSize: "14px",
        color: "#a8e6ff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);
    this.gridContainer.add(subtitleText);
  }

  private getNormalSubtitle(): string {
    const maxLevel = ItemRegistry.getMaxLevel();
    const isRound1 = this.gameState.round === 1;
    const discovered = isRound1 ? this.gameState.level : maxLevel;
    return `Открыто: ${discovered} / ${maxLevel}`;
  }

  private getRareSubtitle(): string {
    const discovered = this.gameState.getDiscoveredRareSquishCount();
    return `Открыто: ${discovered} / ${this.RARE_SQUISH_COUNT}`;
  }

  private getRareSquishFrames(): string[] {
    const texture = this.textures.get("rare-squishes");
    if (!texture) {
      console.warn("Атлас 'rare-squishes' не загружен");
      return [];
    }

    let keys: string[] = [];
    keys = texture.getFrameNames();

    return keys
      .filter((k) => k !== "__BASE" && k !== "__DEFAULT" && k !== "__default")
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || "0");
        const numB = parseInt(b.match(/\d+/)?.[0] || "0");
        return numA - numB;
      });
  }

  private createCardTextures(): void {
    if (this.textures.exists("card_fill")) return;

    const w = this.CARD_W;
    const h = this.CARD_H;
    const r = 18;

    const fillGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    fillGraphics.fillStyle(0xffffff);
    fillGraphics.fillRoundedRect(0, 0, w, h, r);
    fillGraphics.generateTexture("card_fill", w, h);
    fillGraphics.destroy();

    const borderGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    borderGraphics.lineStyle(2, 0xffffff, 1);
    borderGraphics.strokeRoundedRect(1, 1, w - 2, h - 2, r);
    borderGraphics.generateTexture("card_border", w, h);
    borderGraphics.destroy();
  }

  private createCell(level: number, x: number, y: number): void {
    const { discovered, rank } = this.getCellState(level);

    const fill = this.add.image(x, y, "card_fill");
    fill.setTint(discovered ? 0x3a3a5e : 0x26263c);
    this.gridContainer.add(fill);

    const border = this.add.image(x, y, "card_border");
    border.setTint(discovered ? 0xffffff : 0x444466);
    border.setAlpha(discovered ? 0.35 : 0.2);
    this.gridContainer.add(border);

    if (discovered) {
      const icon = this.add.image(x, y - 55, "ranks", `rank${Math.min(rank, this.MAX_RANK_ICONS)}`);
      icon.setScale(40 / Math.max(icon.width, icon.height));
      this.gridContainer.add(icon);

      const rankText = this.add
        .text(x, y - 25, `РАНГ ${rank}`, {
          fontSize: "15px",
          color: "#ffd700",
          fontFamily: "Arial",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.gridContainer.add(rankText);

      const shadow = this.add.ellipse(x, y + 66, 80, 18, 0x000000, 0.3);
      this.gridContainer.add(shadow);

      const squish = this.add.image(x, y + 28, "squishes", ItemRegistry.getFrameName(level));
      squish.setScale(85 / Math.max(squish.width, squish.height));
      this.gridContainer.add(squish);
    } else {
      const placeholder = this.add
        .text(x, y - 5, "?", {
          fontSize: "64px",
          color: "#3d3d5c",
          fontFamily: "Arial",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.gridContainer.add(placeholder);
    }
  }

  private createRareCell(index: number, frameName: string, x: number, y: number): void {
    const rank = this.gameState.getRareSquishRank(index);
    const discovered = rank > 0;

    const fill = this.add.image(x, y, "card_fill");
    fill.setTint(discovered ? 0x4a2c6a : 0x2d1b4e);
    this.gridContainer.add(fill);

    const border = this.add.image(x, y, "card_border");
    border.setTint(discovered ? 0xffd700 : 0x6a4a8a);
    border.setAlpha(discovered ? 0.75 : 0.3);
    this.gridContainer.add(border);

    if (discovered) {
      const icon = this.add.image(x, y - 55, "ranks", `rank${Math.min(rank, this.MAX_RANK_ICONS)}`);
      icon.setScale(40 / Math.max(icon.width, icon.height));
      this.gridContainer.add(icon);

      const rankText = this.add
        .text(x, y - 25, `РАНГ ${rank}`, {
          fontSize: "15px",
          color: "#ff9edb",
          fontFamily: "Arial",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.gridContainer.add(rankText);

      const shadow = this.add.ellipse(x, y + 66, 80, 18, 0x000000, 0.4);
      this.gridContainer.add(shadow);

      const squish = this.add.image(x, y + 28, "rare-squishes", frameName);
      squish.setScale(85 / Math.max(squish.width, squish.height));
      this.gridContainer.add(squish);
    } else {
      const placeholder = this.add
        .text(x, y - 5, "?", {
          fontSize: "64px",
          color: "#6a4a8a",
          fontFamily: "Arial",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.gridContainer.add(placeholder);
    }
  }

  private setupScrolling(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    // 1. Создаем форму маски (Graphics объект)
    // Используем this.add.graphics, чтобы объект корректно инициализировался в сцене
    const maskShape = this.add.graphics();
    maskShape.fillStyle(0xffffff); // Цвет не важен, важна полная непрозрачность (alpha = 1)
    maskShape.fillRect(0, this.headerHeight, screenWidth, screenHeight - this.headerHeight);

    // 🎯 Делаем саму форму невидимой. Нам нужна только её геометрия для обрезки,
    // рисовать белый прямоугольник на экране не нужно.
    maskShape.setVisible(false);

    this.gridContainer.enableFilters();

    // 2. 🎯 ПРИМЕНЯЕМ МАСКУ ЧЕРЕЗ ФИЛЬТР (Новый способ для WebGL)
    if (this.gridContainer.filters) {
      // internal.addMask применяет маску в локальных координатах контейнера
      this.gridContainer.filters.internal.addMask(maskShape);
    } else {
      // Фоллбэк на случай, если игра вдруг запустится в Canvas-режиме (редкость)
      // this.gridContainer.setMask(new Phaser.Display.Masks.GeometryMask(this, maskShape));
    }

    // 3. Логика скроллинга (остается без изменений)
    this.input.on("wheel", (_p: any, _x: any, _y: any, deltaY: number) => {
      this.setScrollY(this.scrollY - deltaY * 0.5);
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.lastPointerY = pointer.y;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      const dy = pointer.y - this.lastPointerY;
      this.lastPointerY = pointer.y;
      this.setScrollY(this.scrollY + dy);
    });
  }

  private setScrollY(y: number): void {
    this.scrollY = Phaser.Math.Clamp(y, this.minScroll, 0);
    this.gridContainer.y = this.scrollY;
  }

  private createHeader(): void {
    const screenWidth = this.scale.width;
    const maxLevel = ItemRegistry.getMaxLevel();

    this.add.rectangle(0, 0, screenWidth, this.headerHeight, 0x22223a).setOrigin(0).setDepth(5);

    const backBtn = this.add
      .rectangle(80, 60, 120, 50, 0x4a4a6e)
      .setInteractive({ useHandCursor: true })
      .setDepth(6);
    backBtn.setStrokeStyle(2, 0xffffff, 0.5);

    this.add
      .text(80, 60, "← НАЗАД", {
        fontSize: "20px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(6);

    backBtn.on("pointerdown", () => this.close());
    backBtn.on("pointerover", () => backBtn.setFillStyle(0x5a5a7e));
    backBtn.on("pointerout", () => backBtn.setFillStyle(0x4a4a6e));

    this.add
      .text(screenWidth / 2, 45, "📚 КОЛЛЕКЦИЯ", {
        fontSize: "32px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(6);

    // Общий счётчик открытий
    const isRound1 = this.gameState.round === 1;
    const rareDiscovered = this.gameState.getDiscoveredRareSquishCount();
    const normalDiscovered = isRound1 ? this.gameState.level : maxLevel;
    const totalDiscovered = normalDiscovered + rareDiscovered;
    const totalItems = maxLevel + this.RARE_SQUISH_COUNT;

    this.add
      .text(screenWidth / 2, 85, `Всего открыто: ${totalDiscovered} / ${totalItems}`, {
        fontSize: "18px",
        color: "#a8e6ff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setDepth(6);
  }

  private close(): void {
    this.scene.resume("GameScene");
    this.scene.resume("UIScene");

    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop();
    });
  }
}
