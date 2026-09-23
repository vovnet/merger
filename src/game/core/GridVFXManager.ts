import * as Phaser from "phaser";

export class GridVFXManager {
  private activeContractLevel: number | null = null;

  constructor(private scene: Phaser.Scene) {}

  public setContractLevel(level: number | null): void {
    this.activeContractLevel = level;
  }

  public updateHighlights(spritesMap: Map<string, Phaser.GameObjects.Container>): void {
    spritesMap.forEach((container) => {
      const level = container.getData("level") as number;
      const mainSprite = container.getData("mainSprite") as Phaser.GameObjects.Image;
      if (!mainSprite) return;

      let glowGraphics = container.getData("glowGraphics") as Phaser.GameObjects.Graphics;
      if (!glowGraphics) {
        glowGraphics = this.scene.add.graphics();
        glowGraphics.setDepth(-1);
        container.add(glowGraphics);
        container.setData("glowGraphics", glowGraphics);
      }

      glowGraphics.clear();

      if (this.activeContractLevel !== null && level === this.activeContractLevel) {
        mainSprite.setTint(0xffff00);
        const radius = 45;
        glowGraphics.fillStyle(0xffd700, 0.3);
        glowGraphics.fillCircle(0, 0, radius + 10);
        glowGraphics.fillStyle(0xffff00, 0.5);
        glowGraphics.fillCircle(0, 0, radius);
      } else {
        mainSprite.clearTint();
      }
    });
  }

  public spawnMergeParticles(px: number, py: number, level: number): void {
    const colors = [0xff6b9d, 0x4ecdc4, 0xffd93d, 0xff8c42, 0x9b59b6, 0xe74c3c, 0xffd700];
    const color = colors[Math.min(level - 1, colors.length - 1)];

    const particles = this.scene.add.particles(px, py, "particle_blob", {
      speed: { min: 180, max: 960 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.6, end: 0 },
      lifespan: 300,
      gravityY: 250,
      tint: color,
      alpha: { start: 1, end: 0.5 },
      emitting: false,
      blendMode: "ADD",
    });

    particles.explode(20);
    this.scene.time.delayedCall(600, () => particles.destroy());
  }

  public spawnMoneyPopup(px: number, py: number, amount: number): void {
    // 🎯 Рандомные параметры для точки старта
    const randomXOffset = Phaser.Math.Between(-30, 30); // смещение startX: ±30px
    const randomAngle = Phaser.Math.FloatBetween(-15, 15); // фиксированный наклон: ±15°

    const startX = px + randomXOffset; // 🎯 точка старта смещена

    const popup = this.scene.add
      .bitmapText(startX, py - 30, "russo", `+${amount}`, Phaser.Math.Between(22, 32))
      .setTint(0xecc900)
      .setOrigin(0.5, 1)
      .setDepth(1000)
      .setAlpha(0)
      .setAngle(randomAngle); // 🎯 фиксированный наклон

    // 1. Лёгкое появление
    popup.setScale(0.5);
    this.scene.tweens.add({
      targets: popup,
      scale: 1.05,
      alpha: 1,
      duration: 120,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: popup,
          scale: 1,
          duration: 80,
          ease: "Power2.out",
        });
      },
    });

    // 2. Полёт строго вверх (X не меняется!)
    this.scene.tweens.add({
      targets: popup,
      y: py - 120,
      // 🎯 НЕТ изменения x — летит строго вертикально от своей стартовой точки
      duration: 600,
      delay: 80,
      ease: "Cubic.out",
    });

    // 3. Растворение
    this.scene.tweens.add({
      targets: popup,
      alpha: 0,
      duration: 200,
      delay: 400,
      ease: "Power2.in",
      onComplete: () => popup.destroy(),
    });
  }
}
