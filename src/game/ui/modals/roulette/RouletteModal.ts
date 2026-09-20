import * as Phaser from "phaser";
import { RouletteService } from "../../../core/RouletteService";
import { GameState } from "../../../core/GameState";
import { RouletteStrip } from "./RouletteStrip";
import { BaseModal } from "../BaseModal";
import { RouletteResultView } from "./RouletteResultView";
import { RouletteConfig } from "./config";

export class RouletteModal extends BaseModal {
  private rouletteService: RouletteService;
  private gameState: GameState;

  private rouletteContainer!: Phaser.GameObjects.Container;
  private strip!: RouletteStrip;
  private resultView!: RouletteResultView;

  private spinButton!: Phaser.GameObjects.Rectangle;
  private spinButtonText!: Phaser.GameObjects.Text;
  private pointer!: Phaser.GameObjects.Triangle;
  private pointerBottom!: Phaser.GameObjects.Triangle;

  private isSpinning = false;

  constructor(scene: Phaser.Scene) {
    super(scene);
    this.rouletteService = new RouletteService();
    this.gameState = scene.registry.get("gameState") as GameState;
  }

  protected buildUI(): void {
    const screenWidth = this.scene.scale.width;
    const halfWidth = screenWidth / 2;
    const { MODAL_HEIGHT, FRAME_PADDING, FRAME_HEIGHT, COVER_WIDTH } = RouletteConfig;

    // 1. Фон
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x2f4f6f, 1);
    bg.fillRoundedRect(-halfWidth, -MODAL_HEIGHT / 2, screenWidth, MODAL_HEIGHT, 20);
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

    // 3. Контейнер ленты + компонент Strip
    this.rouletteContainer = this.scene.add.container(0, 0);
    this.container.add(this.rouletteContainer);
    this.strip = new RouletteStrip(this.scene, this.rouletteContainer, this.rouletteService);
    this.strip.generate();

    // 4. Указатели
    this.pointer = this.scene.add.triangle(0, -100, 0, 0, 15, 20, -15, 20, 0xff0000);
    this.container.add(this.pointer);
    this.pointerBottom = this.scene.add.triangle(0, 120, 0, 0, 15, -20, -15, -20, 0xff0000);
    this.container.add(this.pointerBottom);

    // 5. Рамка
    const frameWidth = screenWidth - FRAME_PADDING;
    const stripFrame = this.scene.add.graphics();
    stripFrame.lineStyle(3, 0xffd700, 1);
    stripFrame.strokeRoundedRect(-frameWidth / 2, -FRAME_HEIGHT / 2, frameWidth, FRAME_HEIGHT, 10);
    this.container.add(stripFrame);

    // 6. Шторки
    const leftCover = this.scene.add
      .rectangle(-frameWidth / 2 - COVER_WIDTH / 2, 0, COVER_WIDTH, FRAME_HEIGHT + 20, 0x2f4f6f)
      .setDepth(5);
    const rightCover = this.scene.add
      .rectangle(frameWidth / 2 + COVER_WIDTH / 2, 0, COVER_WIDTH, FRAME_HEIGHT + 20, 0x2f4f6f)
      .setDepth(5);
    this.container.add([leftCover, rightCover]);

    // 7. Кнопка "Крутить"
    this.createSpinButton();

    // 8. Кнопка закрытия 🎯 ИСПРАВЛЕНО: добавлен текст "✖"
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

    // 9. Компонент экрана победы
    this.resultView = new RouletteResultView(this.scene, this.container);
  }

  private createSpinButton(): void {
    this.spinButton = this.scene.add
      .rectangle(0, 180, 250, 70, 0x4caf50)
      .setInteractive({ useHandCursor: true });
    this.spinButton.setStrokeStyle(3, 0xffffff);

    this.spinButtonText = this.scene.add
      .text(0, 180, `️ КРУТИТЬ (${this.gameState.spins})`, {
        fontSize: "22px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.spinButton.on("pointerdown", () => {
      if (!this.isSpinning && this.gameState.spins > 0) this.startSpin();
    });
    this.spinButton.on("pointerover", () => this.spinButton.setFillStyle(0x5cbf60));
    this.spinButton.on("pointerout", () => this.spinButton.setFillStyle(0x4caf50));

    this.container.add([this.spinButton, this.spinButtonText]);
  }

  private startSpin(): void {
    this.isSpinning = true;
    this.spinButton.setVisible(false);
    this.spinButtonText.setVisible(false);

    // Перегенерация ленты (перетасовка)
    this.strip.generate();

    // Запуск анимации
    this.strip.spin(() => this.onSpinComplete());
  }

  private onSpinComplete(): void {
    this.isSpinning = false;

    // Задержка перед показом результата (даем игроку осознать)
    this.scene.time.delayedCall(RouletteConfig.RESULT_DELAY, () => {
      this.resultView.show(() => this.claimPrizeAndReset());
    });
  }

  private claimPrizeAndReset(): void {
    this.resultView.hide();

    if (this.gameState.spins <= 0) {
      this.close();
      return;
    }

    this.spinButtonText.setText(`️ КРУТИТЬ (${this.gameState.spins})`);
    this.spinButton.setVisible(true);
    this.spinButtonText.setVisible(true);
  }

  public close(): void {
    if (this.isSpinning) return;
    this.resultView?.hide();
    super.close();
  }

  public destroy(): void {
    if (this.isSpinning) return;
    this.resultView?.hide();
    super.destroy();
  }
}
