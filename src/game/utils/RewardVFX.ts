import * as Phaser from "phaser";

export class RewardVFX {
  static spawnFirework(scene: Phaser.Scene, px: number, py: number): void {
    const sparks = scene.add
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
    const stars = scene.add
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
    const confetti = scene.add
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

    scene.time.delayedCall(400, () => {
      sparks.explode(22);
      stars.explode(18);
      confetti.explode(16);
    });

    scene.time.delayedCall(3000, () => {
      sparks.destroy();
      stars.destroy();
      confetti.destroy();
    });
  }
}
