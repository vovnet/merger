// scenes/RewardScene.ts
import * as Phaser from "phaser";
import { IRewardComponent } from "../components/rewards/IRewardComponent";
import { RankSquishComponent } from "../components/rewards/RankSquishComponent";
import { RewardVFX } from "../utils/RewardVFX";
import { RewardData } from "../types/Rewards";

export class RewardScene extends Phaser.Scene {
  private rewardData!: RewardData;
  private rewardComponent!: IRewardComponent;

  private canClose = false;
  private isClosing = false;

  constructor() {
    super({ key: "RewardScene" });
  }

  init(data: { reward: RewardData }): void {
    this.rewardData = data.reward;
    this.canClose = false;
    this.isClosing = false;
  }

  create(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;

    this.cameras.main.fadeIn(300, 0, 0, 0);

    // 1. Затемнение и логика закрытия
    const overlay = this.add
      .rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.7)
      .setOrigin(0)
      .setInteractive();

    const closeScene = () => {
      if (this.isClosing || !this.canClose) return;
      this.isClosing = true;
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.stop());
    };

    overlay.on("pointerdown", closeScene);

    // 2. 🎯 ИСПРАВЛЕНИЕ: Создаем и собираем компонент
    this.rewardComponent = this.createRewardComponent(this.rewardData);
    this.rewardComponent.build(centerX, centerY); // <-- Сначала строим UI

    // 3. 🎯 Только теперь запускаем анимацию
    this.rewardComponent.playAppearAnimation();

    // 4. VFX (Фейерверк)
    RewardVFX.spawnFirework(this, centerX, centerY + 20);

    // 5. Подсказка и разрешение на закрытие
    const hintText = this.add
      .text(centerX, centerY + 220, "Нажмите, чтобы продолжить", {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.time.delayedCall(1000, () => {
      this.canClose = true;
      this.rewardComponent.playIdleAnimation(); // Idle запускаем после появления

      this.tweens.add({
        targets: hintText,
        alpha: 1,
        duration: 400,
        onComplete: () =>
          this.tweens.add({
            targets: hintText,
            alpha: { from: 1, to: 0.5 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          }),
      });
    });
  }

  // 🎯 Фабричный метод теперь возвращает готовый, но еще не отстроенный компонент
  private createRewardComponent(data: RewardData): IRewardComponent {
    switch (data.type) {
      case "RANK_SQUISH":
        return new RankSquishComponent(this, data.rank!, data.level!);
      case "COINS":
        // return new CoinRewardComponent(this, data.amount!);
        throw new Error("CoinRewardComponent not implemented yet");
      default:
        throw new Error(`Unknown reward type: ${data.type}`);
    }
  }

  shutdown(): void {
    if (this.rewardComponent) {
      this.rewardComponent.destroy();
    }
  }
}
