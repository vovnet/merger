// ui/modals/RouletteModal.ts
import * as Phaser from "phaser";
import { BaseModal } from "./BaseModal";
import { RouletteService } from "../../core/RouletteService";
import { EventBus } from "../../core/EventBus";
import { GameEvents } from "../../types/GameEvents";
import { GameState } from "../../core/GameState";
import { RoulettePrize } from "../../types/Rulette";

export class RouletteModal extends BaseModal {
  private rouletteService: RouletteService;
  private gameState: GameState;

  private rouletteContainer!: Phaser.GameObjects.Container;
  private spinButton!: Phaser.GameObjects.Rectangle;
  private spinButtonText!: Phaser.GameObjects.Text;
  private pointer!: Phaser.GameObjects.Triangle;

  private readonly ITEM_WIDTH = 120;
  private readonly ITEM_GAP = 10;
  private readonly TOTAL_ITEMS = 30; // 🎯 Увеличили до 30, чтобы лента была длиннее для широкого экрана
  private readonly SPIN_DURATION = 5000;

  private isSpinning = false;

  constructor(scene: Phaser.Scene) {
    super(scene);
    this.rouletteService = new RouletteService();
    this.gameState = scene.registry.get("gameState") as GameState;
  }

  protected buildUI(): void {
    // 🎯 Получаем динамическую ширину экрана
    const screenWidth = this.scene.scale.width;
    const halfWidth = screenWidth / 2;
    const modalHeight = 440;

    // 1. Фон модалки (теперь на всю ширину)
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x2a2a3e, 1);
    bg.fillRoundedRect(-halfWidth, -220, screenWidth, modalHeight, 20);
    this.container.add(bg);

    // 2. Заголовок (остается по центру)
    const title = this.scene.add
      .text(0, -180, "🎰 РУЛЕТКА", {
        fontSize: "36px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.container.add(title);

    // 3. Контейнер для ленты
    this.rouletteContainer = this.scene.add.container(0, 0);
    this.container.add(this.rouletteContainer);

    // 4. Генерируем элементы ленты
    this.generateStrip();

    // 5. Указатели
    this.pointer = this.scene.add.triangle(0, -95, 0, 0, 15, 20, -15, 20, 0xff0000);
    this.container.add(this.pointer);

    const pointerBottom = this.scene.add.triangle(0, 95, 0, 0, 15, -20, -15, -20, 0xff0000);
    this.container.add(pointerBottom);

    // 6. 🎯 Динамическая золотая рамка (с отступом 40px от краев экрана)
    const framePadding = 40;
    const frameWidth = screenWidth - framePadding;
    const frameHeight = 170;

    const stripFrame = this.scene.add.graphics();
    stripFrame.lineStyle(3, 0xffd700, 1);
    stripFrame.strokeRoundedRect(-frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight, 10);
    this.container.add(stripFrame);

    // 7. 🎯 Динамические ШТОРКИ по краям
    const coverColor = 0x2a2a3e;
    const coverDepth = 5;
    const coverWidth = 40; // Ширина шторки, чтобы гарантированно перекрыть выходящие элементы

    const leftCover = this.scene.add
      .rectangle(-frameWidth / 2 - coverWidth / 2, 0, coverWidth, frameHeight + 20, coverColor)
      .setDepth(coverDepth);
    this.container.add(leftCover);

    const rightCover = this.scene.add
      .rectangle(frameWidth / 2 + coverWidth / 2, 0, coverWidth, frameHeight + 20, coverColor)
      .setDepth(coverDepth);
    this.container.add(rightCover);

    // 8. Кнопка "Крутить"
    this.createSpinButton();

    // 9. 🎯 Кнопка закрытия (сдвинута в правый верхний угол с учетом новой ширины)
    const closeBtn = this.scene.add
      .text(halfWidth - 40, -200, "✖", {
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.close());
    closeBtn.on("pointerover", () => closeBtn.setColor("#ff6b6b"));
    closeBtn.on("pointerout", () => closeBtn.setColor("#ffffff"));
    this.container.add(closeBtn);
  }

  private generateStrip(): void {
    this.rouletteContainer.removeAll(true);
    this.rouletteContainer.x = 0;

    const strip: RoulettePrize[] = [];
    for (let i = 0; i < this.TOTAL_ITEMS; i++) {
      strip.push(this.rouletteService.getRandomPrize());
    }

    const cellWidth = this.ITEM_WIDTH + this.ITEM_GAP;

    strip.forEach((prize, index) => {
      const x = index * cellWidth;
      const y = 0;

      const bgColor = this.getRarityColor(prize.rarity);
      const itemBg = this.scene.add.rectangle(x, y, this.ITEM_WIDTH, 150, bgColor);
      itemBg.setStrokeStyle(2, 0xffffff, 0.5);
      this.rouletteContainer.add(itemBg);

      const sprite = this.scene.add.image(x, y - 10, "squishes", prize.frameName);
      const maxDim = Math.max(sprite.width, sprite.height);
      sprite.setScale((100 / maxDim) * 0.9);
      this.rouletteContainer.add(sprite);

      const levelText = this.scene.add
        .text(x, y + 50, `Ур.${prize.level}`, {
          fontSize: "16px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5);
      this.rouletteContainer.add(levelText);
    });
  }

  private createSpinButton(): void {
    this.spinButton = this.scene.add
      .rectangle(0, 150, 250, 70, 0x4caf50)
      .setInteractive({ useHandCursor: true });
    this.spinButton.setStrokeStyle(3, 0xffffff);

    this.spinButtonText = this.scene.add
      .text(0, 150, `🎟️ КРУТИТЬ (${this.gameState.spins})`, {
        fontSize: "22px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.spinButton.on("pointerdown", () => {
      if (!this.isSpinning && this.gameState.spins > 0) {
        this.startSpin();
      }
    });
    this.spinButton.on("pointerover", () => this.spinButton.setFillStyle(0x5cbf60));
    this.spinButton.on("pointerout", () => this.spinButton.setFillStyle(0x4caf50));

    this.container.add(this.spinButton);
    this.container.add(this.spinButtonText);
  }

  private startSpin(): void {
    this.isSpinning = true;
    this.spinButton.setVisible(false);
    this.spinButtonText.setVisible(false);

    // 🎯 Выбираем выигрышный индекс ближе к концу ленты (например, 22-й из 30)
    const winningIndex = 22;

    this.spinToItem(winningIndex);
  }

  private spinToItem(winningIndex: number): void {
    this.rouletteContainer.x = 0;

    const cellWidth = this.ITEM_WIDTH + this.ITEM_GAP;
    const randomOffset = Phaser.Math.Between(-this.ITEM_WIDTH / 3, this.ITEM_WIDTH / 3);

    const targetX = -(winningIndex * cellWidth) + randomOffset;

    this.scene.tweens.add({
      targets: this.rouletteContainer,
      x: targetX,
      duration: this.SPIN_DURATION,
      ease: "Cubic.easeOut",
      onComplete: () => {
        console.log(`🎉 Рулетка остановилась! Выигрышный элемент: ${winningIndex}`);
        this.isSpinning = false;
        this.showResult(winningIndex);
      },
    });
  }

  private showResult(winningIndex: number): void {
    const screenWidth = this.scene.scale.width;
    const modalHeight = 440;

    // 🎯 Оверлей теперь тоже на всю ширину
    const overlay = this.scene.add.rectangle(0, 0, screenWidth, modalHeight, 0x000000, 0.7);
    this.container.add(overlay);

    const winText = this.scene.add
      .text(0, -50, "🎉 ПОБЕДА!", {
        fontSize: "48px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.container.add(winText);

    const closeBtn = this.scene.add
      .text(0, 50, "ЗАБРАТЬ", {
        fontSize: "24px",
        color: "#4caf50",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    closeBtn.on("pointerdown", () => {
      // this.gameState.spendSpin();
      // TODO: EventBus.emit(GameEvents.ROULETTE_WON, prize);
      this.close();
    });

    this.container.add(closeBtn);
  }

  private getRarityColor(rarity: RoulettePrize["rarity"]): number {
    switch (rarity) {
      case "common":
        return 0x4a4a6e;
      case "rare":
        return 0x2196f3;
      case "epic":
        return 0x9c27b0;
      case "legendary":
        return 0xffd700;
      default:
        return 0x4a4a6e;
    }
  }

  public close(): void {
    if (this.isSpinning) return;
    super.close();
  }

  public destroy(): void {
    if (this.isSpinning) return;
    super.destroy();
  }
}
