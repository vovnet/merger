import * as Phaser from "phaser";
import { GameState } from "../core/GameState";
import { RouletteLogic, RouletteState, RouletteWinData } from "../core/RouleteLogic";

export class RouletteScene extends Phaser.Scene {
  private gameState!: GameState;
  private rouletteLogic!: RouletteLogic;

  private spinBtn!: Phaser.GameObjects.Rectangle;
  private spinText!: Phaser.GameObjects.Text;
  private closeBtn!: Phaser.GameObjects.Rectangle;
  private closeText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "RouletteScene" });
  }

  init(): void {
    if (this.rouletteLogic) {
      this.rouletteLogic.reset();
    }
  }

  create(): void {
    this.gameState = this.registry.get("gameState") as GameState;
    this.events.once("shutdown", () => this.rouletteLogic.destroy());

    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.scene.pause("GameScene");
    this.scene.pause("UIScene");

    this.rouletteLogic = new RouletteLogic(this, this.gameState, {
      totalItems: 60,
      cardW: 120,
      cardH: 150,
      cardGap: 10,
    });

    this.add.rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.85).setOrigin(0).setDepth(0);
    this.add
      .text(screenWidth / 2, 80, "🎰 РУЛЕТКА", {
        fontSize: "48px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.add
      .triangle(screenWidth / 2, screenHeight / 2 - 90, 0, 0, -20, -30, 20, -30, 0xffd700, 1)
      .setDepth(20);
    this.add.rectangle(screenWidth / 2, screenHeight / 2, 4, 180, 0xffd700, 0.6).setDepth(15);

    this.rouletteLogic.initReel(screenWidth, screenHeight);
    this.setupUI(screenWidth, screenHeight);
    this.updateUIState();
  }

  private setupUI(screenWidth: number, screenHeight: number): void {
    this.spinBtn = this.add
      .rectangle(screenWidth / 2, screenHeight - 100, 200, 60, 0x4ecdc4)
      .setInteractive({ useHandCursor: true })
      .setDepth(30);
    this.spinBtn.setStrokeStyle(3, 0xffffff, 0.8);

    this.spinText = this.add
      .text(screenWidth / 2, screenHeight - 100, "КРУТИТЬ", {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(30);

    this.spinBtn.on("pointerdown", () => this.handleSpinClick());

    this.closeBtn = this.add
      .rectangle(screenWidth - 80, 80, 50, 50, 0xff4444)
      .setInteractive({ useHandCursor: true })
      .setDepth(30)
      .setVisible(false);
    this.closeBtn.setStrokeStyle(2, 0xffffff, 0.8);

    this.closeText = this.add
      .text(screenWidth - 80, 80, "✕", {
        fontSize: "32px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setVisible(false);

    this.closeBtn.on("pointerdown", () => this.handleCloseClick());
  }

  private handleSpinClick(): void {
    if (this.rouletteLogic.currentState !== RouletteState.IDLE) return;
    if (this.gameState.spins <= 0) return;

    // this.gameState.spins -= 1;
    this.rouletteLogic.startSpin((winData) => this.onSpinComplete(winData));
    this.updateUIState();
  }

  // 🎯 ОБНОВЛЁННАЯ ЛОГИКА ОБРАБОТКИ ВЫИГРЫША
  private onSpinComplete(winData: RouletteWinData): void {
    if (winData.type === "RARE_SQUISH") {
      const index = winData.rareIndex!;
      this.gameState.discoverRareSquish(index);
      console.log(`💎 Выигран редкий сквиш #${index + 1}!`);
    } else {
      this.gameState.addCoins(winData.value);
      console.log(`🎉 Выиграно ${winData.value} монет!`);
    }

    if (this.gameState.spins > 0) {
      // this.rouletteLogic.resetForNextSpin();
    }
    this.updateUIState();
  }

  private handleCloseClick(): void {
    if (this.rouletteLogic.currentState === RouletteState.SPINNING) return;

    this.scene.resume("GameScene");
    this.scene.resume("UIScene");
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop();
    });
  }

  private updateUIState(): void {
    const state = this.rouletteLogic.currentState;
    const spins = this.gameState.spins;

    if (state === RouletteState.IDLE) {
      this.spinBtn.setInteractive({ useHandCursor: true });
      this.spinBtn.setFillStyle(0x4ecdc4);
      this.spinText.setText(`КРУТИТЬ (${spins} 🎟️)`);
      this.closeBtn.setVisible(true);
      this.closeText.setVisible(true);
    } else if (state === RouletteState.SPINNING) {
      this.spinBtn.disableInteractive();
      this.spinBtn.setFillStyle(0x7f8c8d);
      this.spinText.setText("КРУТИМ...");
      this.closeBtn.setVisible(false);
      this.closeText.setVisible(false);
    } else if (state === RouletteState.RESULT) {
      this.closeBtn.setVisible(true);
      this.closeText.setVisible(true);

      if (spins > 0) {
        this.spinBtn.setInteractive({ useHandCursor: true });
        this.spinBtn.setFillStyle(0x4ecdc4);
        this.spinText.setText(`КРУТИТЬ (${spins} 🎟️)`);
      } else {
        this.spinBtn.disableInteractive();
        this.spinBtn.setFillStyle(0x7f8c8d);
        this.spinText.setText("НЕТ СПИНОВ");
      }
    }
  }
}
