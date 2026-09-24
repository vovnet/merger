import * as Phaser from "phaser";
import { ItemRegistry } from "../core/ItemRegistry";

export class LevelUpScene extends Phaser.Scene {
  private level: number = 1;
  private rank: number = 1;

  // 🎯 Максимальное количество иконок рангов в атласе
  private readonly MAX_RANK_ICONS = 37;

  constructor() {
    super({ key: "LevelUpScene" });
  }

  init(data: { level: number; rank: number }): void {
    this.level = data.level;
    this.rank = data.rank;
  }

  create(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    const CLOSE_DELAY = 1000;

    // 🎯 ЛОКАЛЬНЫЕ флаги: создаются заново при каждом открытии сцены
    // Это решает проблему с переиспользованием экземпляра сцены Phaser'ом
    let canClose = false; // защита от кликов в первые 1 сек
    let isClosing = false; // защита от повторного запуска fadeOut

    // 🎯 Локальная функция закрытия (замыкает флаги из create)
    const closeScene = () => {
      if (isClosing) return;
      isClosing = true;

      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.stop();
      });
    };

    this.cameras.main.fadeIn(300, 0, 0, 0);

    // 1. Затемнение блокирует клики СРАЗУ
    const overlay = this.add
      .rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.7)
      .setOrigin(0)
      .setInteractive();

    overlay.on("pointerdown", () => {
      // Проверяем флаг: первые 1000 мс клик просто игнорируется
      if (canClose) {
        closeScene();
      }
    });

    // 2. Иконка ранга
    const iconFrame = `rank${Math.min(this.rank, this.MAX_RANK_ICONS)}`;
    const rankIcon = this.add.image(screenWidth / 2, screenHeight / 2 - 240, "ranks", iconFrame);
    rankIcon.setOrigin(0.5);

    const iconTargetSize = 100;
    const iconMaxDim = Math.max(rankIcon.width, rankIcon.height);
    const iconScale = iconTargetSize / iconMaxDim;
    rankIcon.setScale(0);

    // 3. Текст ранга
    const rankText = this.add
      .text(screenWidth / 2, screenHeight / 2 - 165, `РАНГ ${this.rank}`, {
        fontSize: "42px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // 4. Сквиш
    const squish = this.add.image(
      screenWidth / 2,
      screenHeight / 2 + 20,
      "squishes",
      ItemRegistry.getFrameName(this.level),
    );
    squish.setOrigin(0.5);
    squish.setScale(0).setDepth(10);

    // 5. Частицы
    this.spawnFirework(screenWidth / 2, screenHeight / 2 + 20);

    // 6. Подсказка (сначала скрыта)
    const hintText = this.add
      .text(screenWidth / 2, screenHeight / 2 + 220, "Нажмите, чтобы продолжить", {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // 🎯 Через 1 секунду: разрешаем закрытие + показываем подсказку
    this.time.delayedCall(CLOSE_DELAY, () => {
      canClose = true;

      this.tweens.add({
        targets: hintText,
        alpha: 1,
        duration: 400,
        onComplete: () => {
          this.tweens.add({
            targets: hintText,
            alpha: { from: 1, to: 0.5 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
        },
      });
    });

    // --- АНИМАЦИИ ---

    // Иконка ранга: pop-эффект
    this.tweens.add({
      targets: rankIcon,
      scale: { from: 0, to: iconScale * 1.25 },
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: rankIcon,
          scale: iconScale,
          duration: 150,
          ease: "Power2.out",
        });
      },
    });

    // Иконка ранга: лёгкое покачивание
    this.tweens.add({
      targets: rankIcon,
      angle: { from: -6, to: 6 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: 500,
    });

    // Текст ранга: появление снизу
    this.tweens.add({
      targets: rankText,
      alpha: 1,
      y: screenHeight / 2 - 140,
      duration: 400,
      ease: "Power2.out",
      delay: 200,
    });

    // Сквиш: pop-эффект
    const targetSize = Math.min(screenWidth, screenHeight) * 0.35;
    const targetScale = targetSize / Math.max(squish.width, squish.height);

    this.tweens.add({
      targets: squish,
      scale: { from: 0, to: targetScale * 1.2 },
      duration: 500,
      ease: "Back.easeOut",
      delay: 300,
      onComplete: () => {
        this.tweens.add({
          targets: squish,
          scale: targetScale,
          duration: 200,
          ease: "Power2.out",
        });
      },
    });

    // Сквиш: idle покачивание
    this.tweens.add({
      targets: squish,
      angle: { from: -3, to: 3 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: 900,
    });
  }

  public spawnFirework(px: number, py: number): void {
    // Искры с ADD-свечением
    const sparks = this.add
      .particles(px, py, "fireworks", {
        frame: ["star_1", "star_2", "star_3"],
        speed: { min: 200, max: 500 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 1500,
        gravityY: 150,
        tint: 0xffd93d,
        blendMode: "ADD",
        emitting: false,
      })
      .setDepth(5);

    // Звёзды с tint
    const stars = this.add
      .particles(px, py, "fireworks", {
        frame: ["star_5", "star_4"],
        speed: { min: 180, max: 380 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.6, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 1900,
        gravityY: 220,
        rotate: { min: -180, max: 180 },
        tint: [0xff6b9d, 0x4ecdc4, 0xffd93d],
        emitting: false,
      })
      .setDepth(5);

    // Конфетти с вращением
    const confetti = this.add
      .particles(px, py, "fireworks", {
        frame: ["confetti_1", "confetti_2", "confetti_3", "confetti_3"],
        speed: { min: 180, max: 380 },
        angle: { min: 200, max: 340 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 2400,
        gravityY: 400,
        rotate: { min: -360, max: 360 },
        tint: [0xff6b9d, 0x4ecdc4, 0xffd93d, 0x9b59b6],
        emitting: false,
      })
      .setDepth(5);

    this.time.delayedCall(400, () => {
      sparks.explode(22);
      stars.explode(18);
      confetti.explode(16);
    });

    this.time.delayedCall(3000, () => {
      sparks.destroy();
      stars.destroy();
      confetti.destroy();
    });
  }
}
