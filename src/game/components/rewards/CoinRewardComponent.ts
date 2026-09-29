// components/rewards/CoinRewardComponent.ts
import * as Phaser from "phaser";
import { IRewardComponent } from "./IRewardComponent";
import { RewardVFX } from "../../utils/RewardVFX";
import { AudioService } from "../../core/AudioService";
import { inRange } from "../../utils/math";

export class CoinRewardComponent implements IRewardComponent {
  private scene: Phaser.Scene;
  private amount: number;

  private coinIcon: Phaser.GameObjects.Image;
  private amountText: Phaser.GameObjects.BitmapText;
  private container: Phaser.GameObjects.Container;

  private audioService: AudioService;

  private x: number;
  private y: number;

  constructor(scene: Phaser.Scene, amount: number) {
    this.scene = scene;
    this.amount = amount;
    this.audioService = this.scene.registry.get("audioService") as AudioService;
  }

  public build(centerX: number, centerY: number): void {
    this.x = centerX;
    this.y = centerY;
    // 🎯 Создаем контейнер для всей награды, чтобы легко её анимировать как единое целое
    this.container = this.scene.add.container(centerX, centerY).setDepth(10);

    const isMedium = inRange(this.amount, 4, 10);
    const isHight = inRange(this.amount, 11, 9999999);

    const framename = isHight ? "coin_pack_3" : isMedium ? "coin_pack_2" : "coin_pack_1";

    // 1. Большая иконка монеты сверху
    this.coinIcon = this.scene.add
      .image(0, -60, "squish-pack", framename)
      .setOrigin(0.5)
      .setScale(0)
      .enableFilters()
      .setDepth(10);

    if (isHight) {
      const fx = this.coinIcon.filters?.external.addGlow(0xfbff09, 2, 0, 1, false, 10, 32);

      this.scene.tweens.add({
        targets: fx,
        outerStrength: 8,
        yoyo: true,
        loop: -1,
        ease: "sine.inout",
      });
    } else {
      this.coinIcon.filters?.external.addGlow(0xffffff, 1, 0, 1, false, 10, 32);
    }

    this.container.add(this.coinIcon);

    this.amountText = this.scene.add
      .bitmapText(0, 260, "russo", `x${this.amount}`, 82)
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.5)
      .setDepth(10);

    this.container.add(this.amountText);
  }

  public playAppearAnimation(): number {
    this.audioService.playUnlockSquish();
    RewardVFX.spawnFirework(this.scene, this.x, this.y + 20);

    // 🎯 Анимация монеты: быстрый pop с "перелетом" (Back.easeOut)
    this.scene.tweens.add({
      targets: this.coinIcon,
      scale: { from: 0, to: 1 },
      duration: 450,
      ease: "Back.easeOut",
      onComplete: () => {
        // Стабилизация до нормального размера
        this.scene.tweens.add({
          targets: this.coinIcon,
          scale: 0.8,
          duration: 200,
          ease: "Power2.out",
          onComplete: () => {
            this.scene.tweens.add({
              targets: this.coinIcon,
              angle: { from: -5, to: 5 },
              duration: 1500,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut",
            });
          },
        });
      },
    });

    // 🎯 Анимация текста: появляется чуть позже монеты, снизу вверх
    this.scene.tweens.add({
      targets: this.amountText,
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      y: 120, // Немного сдвигается вверх
      duration: 500,
      delay: 250,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.amountText,
          scale: { from: 1, to: 1.05 },
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      },
    });

    return 1000;
  }

  public playIdleAnimation(): void {}

  public destroy(): void {
    // Убиваем все активные твины, привязанные к нашим объектам
    this.scene.tweens.killTweensOf(this.coinIcon);
    this.scene.tweens.killTweensOf(this.amountText);

    // Уничтожаем контейнер — он автоматически уничтожит всех детей
    this.container.destroy();
  }
}
