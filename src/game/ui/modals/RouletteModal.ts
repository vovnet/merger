import * as Phaser from "phaser";
import { BaseModal } from "./BaseModal";
import { RouletteService } from "../../core/RouletteService";
import { GameState } from "../../core/GameState";
import { RoulettePrize } from "../../types/Rulette";

export class RouletteModal extends BaseModal {
  private rouletteService: RouletteService;
  private gameState: GameState;

  private rouletteContainer: Phaser.GameObjects.Container;
  private spinButton: Phaser.GameObjects.Rectangle;
  private spinButtonText: Phaser.GameObjects.Text;
  private pointer: Phaser.GameObjects.Triangle;
  private pointerBottom: Phaser.GameObjects.Triangle;

  // 🎯 Ссылки на элементы экрана победы, чтобы мы могли их удалить при сбросе
  private resultOverlay!: Phaser.GameObjects.Rectangle;
  private resultText!: Phaser.GameObjects.Text;
  private claimButton!: Phaser.GameObjects.Text;

  private readonly ITEM_WIDTH = 120;
  private readonly ITEM_GAP = 10;
  private readonly TOTAL_ITEMS = 80;
  private readonly SPIN_DURATION = 10000;

  private isSpinning = false;

  constructor(scene: Phaser.Scene) {
    super(scene);
    this.rouletteService = new RouletteService();
    this.gameState = scene.registry.get("gameState") as GameState;
  }

  protected buildUI(): void {
    const screenWidth = this.scene.scale.width;
    const halfWidth = screenWidth / 2;
    const modalHeight = 440;

    // 1. Фон модалки
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x2a2a3e, 1);
    bg.fillRoundedRect(-halfWidth, -220, screenWidth, modalHeight, 20);
    this.container.add(bg);

    // 2. Заголовок
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

    // 4. Генерируем элементы ленты (сразу с рандомной стартовой позицией)
    this.generateStrip();

    // 5. Указатели
    this.pointer = this.scene.add.triangle(0, -100, 0, 0, 15, 20, -15, 20, 0xff0000);
    this.container.add(this.pointer);

    this.pointerBottom = this.scene.add.triangle(0, 120, 0, 0, 15, -20, -15, -20, 0xff0000);
    this.container.add(this.pointerBottom);

    // 6. Золотая рамка
    const framePadding = 40;
    const frameWidth = screenWidth - framePadding;
    const frameHeight = 170;

    const stripFrame = this.scene.add.graphics();
    stripFrame.lineStyle(3, 0xffd700, 1);
    stripFrame.strokeRoundedRect(-frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight, 10);
    this.container.add(stripFrame);

    // 7. Шторки по краям
    const coverColor = 0x2a2a3e;
    const coverDepth = 5;
    const coverWidth = 40;

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

    // 9. Кнопка закрытия
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

    this.setRandomStartPosition();
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

    const winningIndex = 70;

    // 🎯 ПЕРЕГЕНЕРАЦИЯ ЛЕНТЫ ПРЯМО ПЕРЕД СПИНОМ
    // Это создает эффект "перетасовки" барабана перед новым вращением
    this.generateStrip();

    this.spinToItem(winningIndex);
  }

  private spinToItem(winningIndex: number): void {
    const cellWidth = this.ITEM_WIDTH + this.ITEM_GAP;

    // Небольшой рандом, чтобы указатель не всегда был идеально по центру
    const endRandomOffset = Phaser.Math.Between(-this.ITEM_WIDTH / 4, this.ITEM_WIDTH / 4);
    const targetX = -(winningIndex * cellWidth) + endRandomOffset;

    // 🎯 ЭТАП 1: Плавное, длинное замедление БЕЗ отскока
    this.scene.tweens.add({
      targets: this.rouletteContainer,
      x: targetX,
      duration: this.SPIN_DURATION, // 10000 мс
      ease: "Cubic.easeOut", // Просто плавное торможение до полной остановки

      onComplete: () => {
        this.isSpinning = false;

        // 🎯 ЭТАП 2: МИКРО-ОТСКАК (ровно на 8 пикселей)
        this.scene.tweens.add({
          targets: this.rouletteContainer,
          x: targetX + 8, // Сдвигаем контейнер назад всего на 8 пикселей
          duration: 120, // Очень быстрый "щелчок"
          ease: "Sine.easeOut",

          onComplete: () => {
            // 🎯 ЭТАП 3: ЗАДЕРЖКА ПЕРЕД ПОКАЗОМ ПОБЕДЫ
            // Даем игроку 800 мс, чтобы он сам осознал результат, прежде чем мы его "объявим"
            this.scene.time.delayedCall(800, () => {
              this.showResult(winningIndex);
            });
          },
        });
      },
    });
  }

  private setRandomStartPosition(): void {
    const cellWidth = this.ITEM_WIDTH + this.ITEM_GAP;
    const startRandomIndex = 5;
    const startRandomOffset = -20;
    this.rouletteContainer.x = -(startRandomIndex * cellWidth) + startRandomOffset;
  }

  // 🎯 НОВЫЙ МЕТОД: Показывает результат и готовит модалку к следующему спину
  private showResult(winningIndex: number): void {
    const screenWidth = this.scene.scale.width;
    const modalHeight = 440;

    this.resultOverlay = this.scene.add
      .rectangle(0, 0, screenWidth, modalHeight, 0x000000, 0.7)
      .setDepth(50);
    this.container.add(this.resultOverlay);

    this.resultText = this.scene.add
      .text(0, -50, "🎉 ПОБЕДА!", {
        fontSize: "48px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(51);
    this.container.add(this.resultText);

    this.claimButton = this.scene.add
      .text(0, 50, "ЗАБРАТЬ", {
        fontSize: "24px",
        color: "#4caf50",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(52);

    this.claimButton.on("pointerdown", () => {
      this.claimPrizeAndReset();
    });
    this.claimButton.on("pointerover", () => this.claimButton.setColor("#66bb6a"));
    this.claimButton.on("pointerout", () => this.claimButton.setColor("#4caf50"));

    this.container.add(this.claimButton);
  }

  // 🎯 НОВЫЙ МЕТОД: Логика после нажатия "ЗАБРАТЬ"
  private claimPrizeAndReset(): void {
    // 1. Очищаем экран победы
    if (this.resultOverlay) this.resultOverlay.destroy();
    if (this.resultText) this.resultText.destroy();
    if (this.claimButton) this.claimButton.destroy();

    // TODO: Здесь будет логика добавления приза в инвентарь
    // EventBus.emit(GameEvents.ROULETTE_WON, prize);

    // 2. Проверяем, остались ли спины
    if (this.gameState.spins <= 0) {
      // Спинов нет, закрываем модалку.
      // ActionButtons на главном экране подхватит это и станет серой.
      this.close();
      return;
    }

    // 3. Если спины есть, готовим модалку к новому вращению!
    // Обновляем текст кнопки с актуальным количеством спинов
    this.spinButtonText.setText(`🎟️ КРУТИТЬ (${this.gameState.spins})`);

    // Показываем кнопку снова
    this.spinButton.setVisible(true);
    this.spinButtonText.setVisible(true);

    // (Лента уже будет перегенерирована при следующем нажатии на "Крутить" в startSpin)
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

    // 🎯 Гарантированная очистка элементов результата при закрытии
    if (this.resultOverlay) this.resultOverlay.destroy();
    if (this.resultText) this.resultText.destroy();
    if (this.claimButton) this.claimButton.destroy();

    super.close();
  }

  public destroy(): void {
    if (this.isSpinning) return;

    if (this.resultOverlay) this.resultOverlay.destroy();
    if (this.resultText) this.resultText.destroy();
    if (this.claimButton) this.claimButton.destroy();

    super.destroy();
  }
}
