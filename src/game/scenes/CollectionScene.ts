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
  private readonly MAX_RANK_ICONS = 37;

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

  // 🎯 ИСПРАВЛЕННАЯ ЛОГИКА РАНГА
  // Раунд 1: открыты только до level, ранг = 1
  // Раунд 2+: все открыты
  //   - level <= gameState.level → ранг = round      (достигнуты в этом раунде)
  //   - level > gameState.level  → ранг = round - 1  (достигнуты в прошлых раундах)
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

    const maxLevel = ItemRegistry.getMaxLevel();
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    const cols = Math.max(3, Math.floor((screenWidth - 40) / (this.CARD_W + this.CARD_GAP)));
    const gridWidth = cols * (this.CARD_W + this.CARD_GAP) - this.CARD_GAP;
    const startX = (screenWidth - gridWidth) / 2 + this.CARD_W / 2;

    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      const index = lvl - 1;
      const col = index % cols;
      const row = Math.floor(index / cols);

      const x = startX + col * (this.CARD_W + this.CARD_GAP);
      const y = this.headerHeight + 20 + row * (this.CARD_H + this.CARD_GAP) + this.CARD_H / 2;

      this.createCell(lvl, x, y);
    }

    const rows = Math.ceil(maxLevel / cols);
    const contentHeight = rows * (this.CARD_H + this.CARD_GAP) + 40;
    const viewHeight = screenHeight - this.headerHeight;
    this.minScroll = Math.min(0, viewHeight - contentHeight);
  }

  // 🎯 Генерация скруглённых текстур карточки (вызывается один раз)
  private createCardTextures(): void {
    if (this.textures.exists("card_fill")) return;

    const w = this.CARD_W;
    const h = this.CARD_H;
    const r = 18; // радиус скругления

    // Текстура заливки
    const fillGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    fillGraphics.fillStyle(0xffffff);
    fillGraphics.fillRoundedRect(0, 0, w, h, r);
    fillGraphics.generateTexture("card_fill", w, h);
    fillGraphics.destroy();

    // Текстура обводки
    const borderGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    borderGraphics.lineStyle(2, 0xffffff, 1);
    borderGraphics.strokeRoundedRect(1, 1, w - 2, h - 2, r);
    borderGraphics.generateTexture("card_border", w, h);
    borderGraphics.destroy();
  }

  private createCell(level: number, x: number, y: number): void {
    const { discovered, rank } = this.getCellState(level);

    // Подложка карточки
    const fill = this.add.image(x, y, "card_fill");
    fill.setTint(discovered ? 0x3a3a5e : 0x26263c);
    this.gridContainer.add(fill);

    if (discovered) {
      // Иконка ранга над сквишем, по центру
      const icon = this.add.image(x, y - 55, "ranks", `rank${Math.min(rank, this.MAX_RANK_ICONS)}`);
      icon.setScale(40 / Math.max(icon.width, icon.height));
      this.gridContainer.add(icon);

      // Подпись "РАНГ №"
      const rankText = this.add
        .text(x, y - 25, `РАНГ ${rank}`, {
          fontSize: "15px",
          color: "#ffd700",
          fontFamily: "Arial",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.gridContainer.add(rankText);

      // 🎯 НОВОЕ: овальная тень под сквишем (добавляем ДО сквиша!)
      const shadow = this.add.ellipse(x, y + 66, 80, 18, 0x000000, 0.3);
      this.gridContainer.add(shadow);

      // Сквиш ниже (поверх тени)
      const squish = this.add.image(x, y + 28, "squishes", ItemRegistry.getFrameName(level));
      squish.setScale(85 / Math.max(squish.width, squish.height));
      this.gridContainer.add(squish);
    } else {
      // Заглушка вместо силуэта
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

  private setupScrolling(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    const shape = this.make.graphics();
    shape.fillStyle(0xffffff);
    shape.fillRect(0, this.headerHeight, screenWidth, screenHeight - this.headerHeight);
    this.gridContainer.setMask(shape.createGeometryMask());

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
    const isRound1 = this.gameState.round === 1;

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

    const subtitle = isRound1
      ? `Открыто: ${this.gameState.level} / ${maxLevel}`
      : `Ранг: ${this.gameState.round} · Все сквиши открыты`;

    this.add
      .text(screenWidth / 2, 85, subtitle, {
        fontSize: "18px",
        color: isRound1 ? "#a8e6ff" : "#ffd700",
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
