import * as Phaser from "phaser";
import { GameState } from "../core/GameState";
import { RouletteLogic, RouletteState, RouletteWinData } from "../core/RouleteLogic";
import { AlertButton } from "../ui/AlertButton";
import { RewardData } from "../types/Rewards";

export class RouletteScene extends Phaser.Scene {
  private gameState: GameState;
  private rouletteLogic: RouletteLogic;

  private rouletteView: Phaser.GameObjects.Container;
  private spinBtn: AlertButton;
  private spinText: Phaser.GameObjects.BitmapText;
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
        .bitmapText(screenWidth / 2, 80, "russo", "СКВИШ-ВЕРТУШКА", 74)
        .setOrigin(0.5)
        .setTint(0xffcb1f),
    );

    const arrow = this.add
      .sprite(screenWidth / 2, screenHeight / 2 - 120, "ui", "roulette_arrow")
      .setOrigin(0.5)
      .setScale(0.6);

    this.tweens.add({
      targets: arrow,
      y: "-=5", // Сдвигаем на 5 пикселей вверх от текущей позиции
      duration: 500, // Длительность одного движения (1 секунда = очень плавно)
      ease: "Sine.easeInOut", // Самая плавная и естественная функция сглаживания
      yoyo: true, // Возвращаем обратно вниз
      repeat: -1, // Повторять бесконечно
    });

    this.rouletteView.add(arrow);

    this.rouletteLogic.initReel(screenWidth, screenHeight);
    this.rouletteView.add(this.rouletteLogic.reelContainer);

    this.setupUI(screenWidth, screenHeight);
    this.updateUIState();
  }

  private setupUI(screenWidth: number, screenHeight: number): void {
    this.spinBtn = new AlertButton(this, {
      textureKey: "ui",
      frameKey: "run_roulette_png",
      x: screenWidth / 2,
      y: screenHeight - 100,
      scale: 0.8,
      onClick: () => this.handleSpinClick(),
    });

    const ticketSprite = this.add.image(0, 0, "ui", "ticket").setScale(1.8);

    this.spinText = this.add.bitmapText(0, 0, "russo", "", 42).setOrigin(0.5).setTint(0xe1ff3a);

    const ticketContainer = this.add.container(screenWidth / 2, screenHeight - 220, [
      ticketSprite,
      this.spinText,
    ]);

    this.rouletteView.add(ticketContainer);

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

    this.spinText.setText(`${spins}`);

    if (state === RouletteState.IDLE) {
      this.spinBtn.setDisabled(false);
    } else if (state === RouletteState.SPINNING) {
      this.spinBtn.setDisabled(true);
    } else if (state === RouletteState.RESULT) {
      if (spins <= 0) {
        this.spinBtn.setDisabled(true);
      }
    }
  }
}
