import * as Phaser from "phaser";
import { GameState } from "../core/GameState";
import { RouletteLogic, RouletteState, RouletteWinData } from "../core/RouleteLogic";
import { AlertButton } from "../ui/AlertButton";
import { RewardData } from "../types/Rewards";

export class RouletteScene extends Phaser.Scene {
  private gameState: GameState;
  private rouletteLogic: RouletteLogic;

  private rouletteView: Phaser.GameObjects.Container;
  private spinBtn: Phaser.GameObjects.Rectangle;
  private spinText: Phaser.GameObjects.Text;
  private closeBtn: AlertButton;

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

    this.events.once("shutdown", () => {
      this.events.off("wake", this.onSceneWake, this);
      this.rouletteLogic.destroy();
    });

    this.events.on("wake", this.onSceneWake, this);

    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.scene.pause("GameScene");
    this.scene.pause("UIScene");

    this.add.rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.85).setOrigin(0);

    this.rouletteView = this.add.container(0, 0).setDepth(10);

    this.rouletteLogic = new RouletteLogic(this, {
      totalItems: 60,
      cardW: 120,
      cardH: 150,
      cardGap: 10,
    });

    this.rouletteView.add(
      this.add
        .text(screenWidth / 2, 80, "РУЛЕТКА", {
          fontSize: "48px",
          color: "#ffd700",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 6,
        })
        .setOrigin(0.5),
    );

    this.rouletteView.add(
      this.add.triangle(
        screenWidth / 2,
        screenHeight / 2 - 90,
        0,
        0,
        -20,
        -30,
        20,
        -30,
        0xffd700,
        1,
      ),
    );

    this.rouletteLogic.initReel(screenWidth, screenHeight);
    this.rouletteView.add(this.rouletteLogic.reelContainer);

    this.setupUI(screenWidth, screenHeight);
    this.updateUIState();
  }

  private setupUI(screenWidth: number, screenHeight: number): void {
    this.spinBtn = this.add
      .rectangle(screenWidth / 2, screenHeight - 100, 200, 60, 0x4ecdc4)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(3, 0xffffff, 0.8);
    this.rouletteView.add(this.spinBtn);

    this.spinText = this.add
      .text(screenWidth / 2, screenHeight - 100, "КРУТИТЬ", {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.rouletteView.add(this.spinText);

    this.spinBtn.on("pointerdown", () => this.handleSpinClick());

    this.closeBtn = new AlertButton(this, {
      x: screenWidth - 60,
      y: 60,
      scale: 0.7,
      textureKey: "ui",
      frameKey: "close_btn",
      onClick: () => this.handleCloseClick(),
      parent: this.rouletteView,
    });
  }

  private handleSpinClick(): void {
    if (this.rouletteLogic.currentState !== RouletteState.IDLE) return;
    if (this.gameState.spins <= 0) return;

    this.gameState.spendSpin();
    this.rouletteLogic.startSpin((winData) => this.onSpinComplete(winData));
    this.updateUIState();
  }

  private onSpinComplete(winData: RouletteWinData): void {
    // 1. Обновляем состояние игры (это делается ДО показа награды)
    if (winData.type === "RARE_SQUISH") {
      const rare = this.gameState.upgradeRandomRareSquish();
      winData.rareIndex = rare.index;
    } else {
      this.gameState.addCoins(winData.value);
    }

    // 2. Передаем управление сцене наград
    this.time.delayedCall(600, () => {
      this.showRewardScene(winData);
    });
  }

  private showRewardScene(winData: RouletteWinData): void {
    // Маппинг данных рулетки в формат RewardData
    const rewardData: RewardData =
      winData.type === "RARE_SQUISH"
        ? {
            type: "RARE_SQUISH",
            level: winData.rareIndex !== undefined ? winData.rareIndex + 1 : 1,
            rank:
              winData.rareIndex !== undefined
                ? this.gameState.getRareSquishRank(winData.rareIndex)
                : 1,
          }
        : {
            type: "COINS",
            amount: winData.value,
          };

    // Плавно скрываем рулетку
    this.tweens.add({
      targets: this.rouletteView,
      alpha: 0,
      duration: 400,
      ease: "Power2.in",
      onComplete: () => {
        this.scene.launch("RewardScene", {
          reward: rewardData,
          onComplete: () => this.scene.wake("RouletteScene"),
        });

        this.scene.sleep();
      },
    });
  }

  private onSceneWake(): void {
    // 1. Сбрасываем состояние рулетки
    if (this.gameState.spins > 0) {
      this.rouletteLogic.resetForNextSpin();
    } else {
      this.rouletteLogic.currentState = RouletteState.RESULT;
    }

    this.cameras.main.resetFX();

    // 3. Гарантированно скрываем контейнер перед анимацией появления
    this.rouletteView.setAlpha(0);

    // Убедимся, что контейнер вообще существует и видим на уровне сцены
    this.rouletteView.setVisible(true);

    // 4. Запускаем анимацию появления
    this.tweens.add({
      targets: this.rouletteView,
      alpha: 1,
      duration: 400,
      ease: "Power2.out",
      onComplete: () => {
        console.log("✅ Анимация появления рулетки завершена, обновляем UI");
        this.updateUIState();
      },
    });
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
    } else if (state === RouletteState.SPINNING) {
      this.spinBtn.disableInteractive();
      this.spinBtn.setFillStyle(0x7f8c8d);
      this.spinText.setText("КРУТИМ...");
    } else if (state === RouletteState.RESULT) {
      if (spins <= 0) {
        this.spinBtn.disableInteractive();
        this.spinBtn.setFillStyle(0x7f8c8d);
        this.spinText.setText("НЕТ СПИНОВ");
      }
    }
  }
}
