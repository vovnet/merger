import { t } from "../../../locales";
import { AudioService } from "../../core/AudioService";
import { RewardVFX } from "../../utils/RewardVFX";
import { IRewardComponent } from "./IRewardComponent";

export class RareRewardComponent implements IRewardComponent {
  private scene: Phaser.Scene;
  private audioService: AudioService;
  private rank: number;
  private level: number;
  private x: number;
  private y: number;

  constructor(scene: Phaser.Scene, rank: number, level: number) {
    this.scene = scene;
    this.rank = rank;
    this.level = level;
    this.audioService = this.scene.registry.get("audioService") as AudioService;
  }

  build(centerX: number, centerY: number): void {
    this.x = centerX;
    this.y = centerY;
  }

  playAppearAnimation(): number {
    this.playRareUnboxingAnimation();
    return 3000;
  }

  playIdleAnimation(): void {
    // TODO
  }

  destroy(): void {
    // TODO
  }

  private playRareUnboxingAnimation(): void {
    // 🎯 1. СОЗДАЁМ УПАКОВКУ ИЗНАЧАЛЬНО НЕВИДИМОЙ И ЧУТЬ МЕНЬШЕ (для эффекта "pop")
    const pkgLeft = this.scene.add
      .image(this.x, this.y, "squish-pack", "left_pack")
      .setDepth(90)
      .setAlpha(0)
      .setScale(0.8);

    const pkgRight = this.scene.add
      .image(this.x + 10, this.y, "squish-pack", "right_pack")
      .setDepth(90)
      .setAlpha(0)
      .setScale(0.8);

    // 🎯 2. ЭФФЕКТ РАЗРЕЗА (твои координаты для масштаба 1.6)
    const startX = this.x + 265;
    const startY = this.y - 275;

    const slash = this.scene.add.graphics().setDepth(95).setAlpha(0).setScale(0);
    slash.setPosition(startX, startY);

    slash.lineStyle(8, 0xffffff, 1);
    slash.lineBetween(0, 0, -640, 640);

    slash.lineStyle(4, 0xffd700, 1);
    slash.lineBetween(0, 0, -640, 640);

    // Вспышка
    const flash = this.scene.add
      .rectangle(this.x, this.y, 1500, 1500, 0xffffff)
      .setAlpha(0)
      .setDepth(98);

    // Сам сквиш (изначально невидим)
    const squish = this.scene.add
      .image(this.x, this.y + 40, "rare-squishes", this.level)
      .setAlpha(0)
      .setScale(0)
      .setDepth(100);

    // 🎯 Иконка ранга
    const rankIcon = this.scene.add
      .image(this.x, this.y - 220, "ranks", `rank${Math.min(this.rank, 37)}`)
      .setAlpha(0)
      .setScale(0)
      .setDepth(101);

    // 🎯 Текст ранга
    const rankText = this.scene.add
      .bitmapText(this.x, this.y - 140, "russo", t("RANK_LABEL", { rank: this.rank }), 42)
      .setTint(0xffd700)
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0)
      .setDepth(101);

    // ШАГ 0: Плавное появление упаковки (создаём ожидание)
    this.scene.tweens.add({
      targets: [pkgLeft, pkgRight], // Анимируем обе половинки одновременно
      alpha: 1,
      scale: 1.6, // Возвращаем к твоему целевому размеру
      duration: 400, // 0.4 секунды на плавное появление
      ease: "Back.easeOut", // Лёгкий эффект "пружинки" при появлении
      onComplete: () => {
        // ШАГ 1: Удар/разрез (запускается ТОЛЬКО после появления упаковки)
        this.scene.tweens.add({
          targets: slash,
          alpha: 1,
          scale: 1.2,
          duration: 150,
          ease: "Power2.out",
          onComplete: () => {
            this.audioService.playSword();
            this.audioService.playUnlockSquish();
            RewardVFX.spawnFirework(this.scene, this.x, this.y + 20);
            // ШАГ 2: Разделение коробки + Вспышка
            this.scene.tweens.add({
              targets: pkgLeft,
              x: "-=150",
              angle: -20,
              alpha: 0,
              duration: 500,
              ease: "Back.easeIn",
            });
            this.scene.tweens.add({
              targets: pkgRight,
              x: "+=150",
              angle: 20,
              alpha: 0,
              duration: 500,
              ease: "Back.easeIn",
            });
            this.scene.tweens.add({ targets: slash, alpha: 0, duration: 100 });

            this.scene.tweens.add({
              targets: flash,
              alpha: { from: 0, to: 1 },
              duration: 100,
              yoyo: true,
              hold: 100,
            });

            // ШАГ 3: Появление сквиша, иконки и текста с эффектом "pop"
            this.scene.tweens.add({
              targets: squish,
              alpha: 1,
              scale: 2.3,
              duration: 500,
              delay: 100, // Небольшая пауза после вспышки
              ease: "Back.easeOut",
            });

            this.scene.tweens.add({
              targets: [rankIcon, rankText],
              alpha: 1,
              scale: 0.8,
              duration: 500,
              delay: 150,
              ease: "Back.easeOut",
              onComplete: () => {
                // Финальная стабилизация размеров
                this.scene.tweens.add({
                  targets: squish,
                  scale: 2.0,
                  duration: 300,
                  ease: "Sine.easeInOut",
                });

                this.scene.tweens.add({
                  targets: [rankIcon, rankText],
                  scale: 0.6,
                  duration: 300,
                  ease: "Sine.easeInOut",
                  onComplete: () => {
                    // Добавляем сквишу лёгкое покачивание (idle)
                    this.scene.tweens.add({
                      targets: squish,
                      angle: { from: -3, to: 3 },
                      duration: 1500,
                      yoyo: true,
                      repeat: -1,
                      ease: "Sine.easeInOut",
                    });

                    // 🎯 Очистка мусора
                    pkgLeft.destroy();
                    pkgRight.destroy();
                    slash.destroy();
                    flash.destroy();
                  },
                });
              },
            });
          },
        });
      },
    });
  }
}
