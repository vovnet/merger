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

  // 🎯 Всплывающие деньги: pop-появление → полёт вверх → исчезновение
  public spawnMoneyPopup(px: number, py: number, amount: number): void {
    const popup = this.scene.add
      .text(px, py - 30, `+${amount}`, {
        fontSize: amount >= 1000 ? "38px" : "30px",
        fontFamily: "Arial",
        fontStyle: "bold",
        color: "#ffd700",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5, 1)
      .setDepth(1000)
      .setAlpha(0);

    // 1. Лёгкое появление (без сильного отскока)
    popup.setScale(0.5);
    this.scene.tweens.add({
      targets: popup,
      scale: 1.05, // 🎯 было 1.15 → уменьшил отскок
      alpha: 1,
      duration: 120, // 🎯 было 180 → быстрее
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: popup,
          scale: 1,
          duration: 80, // 🎯 было 120 → быстрая усадка
          ease: "Power2.out",
        });
      },
    });

    // 2. Полёт вверх — значительно быстрее
    this.scene.tweens.add({
      targets: popup,
      y: py - 120, // 🎯 было -150 → не так высоко
      duration: 600, // 🎯 было 1000 → почти в 2 раза быстрее
      delay: 80, // 🎯 было 120
      ease: "Cubic.out",
    });

    // 3. Растворение синхронно с концом полёта
    this.scene.tweens.add({
      targets: popup,
      alpha: 0,
      duration: 200, // 🎯 было 300
      delay: 400, // 🎯 было 820 → исчезает пока ещё летит (более естественно)
      ease: "Power2.in",
      onComplete: () => popup.destroy(),
    });
  }
}
