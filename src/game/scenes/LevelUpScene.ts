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

    this.cameras.main.fadeIn(300, 0, 0, 0);

    // 1. Затемнение фона (перехватывает все клики)
    const overlay = this.add
      .rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.7)
      .setOrigin(0)
      .setInteractive();
    overlay.on("pointerdown", () => this.close());

    // 2. 🎯 ИКОНКА РАНГА (с ограничением: если ранг > 37, берём последнюю иконку)
    const iconFrame = `rank${Math.min(this.rank, this.MAX_RANK_ICONS)}`;
    const rankIcon = this.add.image(screenWidth / 2, screenHeight / 2 - 240, "ranks", iconFrame);
    rankIcon.setOrigin(0.5);

    const iconTargetSize = 100;
    const iconMaxDim = Math.max(rankIcon.width, rankIcon.height);
    const iconScale = iconTargetSize / iconMaxDim;
    rankIcon.setScale(0);

    // 3. 🎯 ТЕКСТ РАНГА
    const rankText = this.add
      .text(screenWidth / 2, screenHeight / 2 - 165, `${this.rank} Ранг`, {
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
    squish.setScale(0);

    // 5. Частицы
    const particles = this.add.particles(screenWidth / 2, screenHeight / 2 + 20, "particle_blob", {
      speed: { min: 200, max: 400 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      quantity: 30,
      emitting: false,
    });

    // 6. Подсказка
    const hintText = this.add
      .text(screenWidth / 2, screenHeight / 2 + 220, "Нажмите, чтобы продолжить", {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setAlpha(0);

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
      y: screenHeight / 2 - 175,
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
          onComplete: () => particles.explode(30),
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

    // Подсказка с пульсацией
    this.tweens.add({
      targets: hintText,
      alpha: 1,
      duration: 400,
      delay: 800,
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
  }

  private close(): void {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop();
    });
  }
}
