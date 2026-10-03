// components/rewards/RankSquishComponent.ts
import * as Phaser from "phaser";
import { IRewardComponent } from "./IRewardComponent";
import { ItemRegistry } from "../../core/ItemRegistry";
import { AudioService } from "../../core/AudioService";
import { RewardVFX } from "../../utils/RewardVFX";
import { t } from "../../../locales";

export class RankSquishComponent implements IRewardComponent {
  private scene: Phaser.Scene;
  private rank: number;
  private level: number;
  private audioService: AudioService;

  private x: number;
  private y: number;

  private rankIcon!: Phaser.GameObjects.Image;
  private rankText!: Phaser.GameObjects.BitmapText;
  private squish!: Phaser.GameObjects.Image;
  private readonly MAX_RANK_ICONS = 37;

  constructor(scene: Phaser.Scene, rank: number, level: number) {
    this.scene = scene;
    this.rank = rank;
    this.level = level;
    this.audioService = this.scene.registry.get("audioService") as AudioService;
  }

  // 🎯 1. Сначала мы ТОЛЬКО создаем объекты и расставляем их (без анимаций)
  public build(centerX: number, centerY: number): void {
    this.x = centerX;
    this.y = centerY;
    const iconFrame = `rank${Math.min(this.rank, this.MAX_RANK_ICONS)}`;
    this.rankIcon = this.scene.add.image(centerX, centerY - 240, "ranks", iconFrame).setOrigin(0.5);

    this.rankIcon.setScale(0); // Начальное состояние для анимации

    this.rankText = this.scene.add
      .bitmapText(centerX, centerY - 165, "russo", t("RANK_LABEL", { rank: this.rank }), 32)
      .setTint(0xffd700)
      .setOrigin(0.5)
      .setAlpha(0);

    this.squish = this.scene.add
      .image(centerX, centerY + 20, "squishes", ItemRegistry.getFrameName(this.level))
      .setOrigin(0.5)
      .setScale(0)
      .setDepth(10);
  }

  // 🎯 2. Потом запускаем анимацию появления (объекты уже существуют)
  public playAppearAnimation(): number {
    RewardVFX.spawnFirework(this.scene, this.x, this.y + 20);

    const iconScale = 100 / Math.max(this.rankIcon.width, this.rankIcon.height);

    this.scene.tweens.add({
      targets: this.rankIcon,
      scale: { from: 0, to: iconScale * 1.25 },
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () =>
        this.scene.tweens.add({
          targets: this.rankIcon,
          scale: iconScale,
          duration: 150,
          ease: "Power2.out",
        }),
    });

    this.scene.tweens.add({
      targets: this.rankText,
      alpha: 1,
      y: this.rankIcon.y + 75,
      duration: 400,
      ease: "Power2.out",
      delay: 200,
    });

    const targetSize = Math.min(this.scene.scale.width, this.scene.scale.height) * 0.35;
    const targetScale = targetSize / Math.max(this.squish.width, this.squish.height);

    this.scene.tweens.add({
      targets: this.squish,
      scale: { from: 0, to: targetScale * 1.2 },
      duration: 500,
      ease: "Back.easeOut",
      delay: 300,
      onStart: () => this.audioService.playUnlockSquish(),
      onComplete: () =>
        this.scene.tweens.add({
          targets: this.squish,
          scale: targetScale,
          duration: 200,
          ease: "Power2.out",
          onComplete: () => {
            this.scene.tweens.add({
              targets: this.squish,
              angle: { from: -3, to: 3 },
              duration: 1500,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut",
            });
          },
        }),
    });

    return 1000;
  }

  public playIdleAnimation(): void {}

  public destroy(): void {
    this.rankIcon.destroy();
    this.rankText.destroy();
    this.squish.destroy();
  }
}
