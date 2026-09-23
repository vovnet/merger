import * as Phaser from "phaser";
import { ItemRegistry } from "../core/ItemRegistry";

export class LevelUpScene extends Phaser.Scene {
  private level: number = 1;

  constructor() {
    super({ key: "LevelUpScene" });
  }

  init(data: { level: number }): void {
    this.level = data.level;
  }

  create(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    // Плавное появление
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // 1. Затемнение фона (перехватывает все клики)
    const overlay = this.add
      .rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.7)
      .setOrigin(0)
      .setInteractive();
    overlay.on("pointerdown", () => this.close());

    // 2. Текст "НОВЫЙ УРОВЕНЬ!"
    const titleText = this.add
      .text(screenWidth / 2, screenHeight / 2 - 150, `УРОВЕНЬ ${this.level}!`, {
        fontSize: "48px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // 3. Сквиш
    const squish = this.add.image(
      screenWidth / 2,
      screenHeight / 2,
      "squishes",
      ItemRegistry.getFrameName(this.level),
    );
    squish.setOrigin(0.5);
    squish.setScale(0);

    // 4. Частицы
    const particles = this.add.particles(screenWidth / 2, screenHeight / 2, "particle_blob", {
      speed: { min: 200, max: 400 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      quantity: 30,
      emitting: false,
    });

    // 5. Подсказка
    const hintText = this.add
      .text(screenWidth / 2, screenHeight / 2 + 200, "Нажмите, чтобы продолжить", {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // 6. Анимации появления
    this.tweens.add({
      targets: titleText,
      alpha: 1,
      y: screenHeight / 2 - 180,
      duration: 400,
      ease: "Power2.out",
    });

    const targetSize = Math.min(screenWidth, screenHeight) * 0.4;
    const targetScale = targetSize / Math.max(squish.width, squish.height);

    this.tweens.add({
      targets: squish,
      scale: { from: 0, to: targetScale * 1.2 },
      duration: 500,
      ease: "Back.easeOut",
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

    // Idle анимация сквиша
    this.tweens.add({
      targets: squish,
      angle: { from: -3, to: 3 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: 700,
    });

    // Подсказка с пульсацией
    this.tweens.add({
      targets: hintText,
      alpha: 1,
      duration: 400,
      delay: 600,
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
    // Плавное исчезновение, затем остановка сцены
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop();
    });
  }
}
