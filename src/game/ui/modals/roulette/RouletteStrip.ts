import * as Phaser from "phaser";
import { RouletteService } from "../../../core/RouletteService";
import { RoulettePrize } from "../../../types/Rulette";
import { RouletteConfig } from "./config";

export class RouletteStrip {
  private container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private service: RouletteService;

  constructor(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    service: RouletteService,
  ) {
    this.scene = scene;
    this.container = container;
    this.service = service;
  }

  public generate(): void {
    this.container.removeAll(true);

    const { ITEM_WIDTH, ITEM_GAP, TOTAL_ITEMS } = RouletteConfig;
    const cellWidth = ITEM_WIDTH + ITEM_GAP;

    for (let i = 0; i < TOTAL_ITEMS; i++) {
      const prize = this.service.getRandomPrize();
      this.renderItem(prize, i * cellWidth);
    }

    this.setStartPosition();
  }

  private renderItem(prize: RoulettePrize, x: number): void {
    const { ITEM_WIDTH } = RouletteConfig;

    const bgColor = this.getRarityColor(prize.rarity);
    const bg = this.scene.add.rectangle(x, 0, ITEM_WIDTH, 150, bgColor);
    bg.setStrokeStyle(2, 0xffffff, 0.5);
    this.container.add(bg);

    const sprite = this.scene.add.image(x, -10, "squishes", prize.frameName);
    const maxDim = Math.max(sprite.width, sprite.height);
    sprite.setScale((100 / maxDim) * 0.9);
    this.container.add(sprite);

    const text = this.scene.add
      .text(x, 50, `Ур.${prize.level}`, {
        fontSize: "16px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.container.add(text);
  }

  private setStartPosition(): void {
    const { ITEM_WIDTH, ITEM_GAP, START_INDEX, START_OFFSET } = RouletteConfig;
    const cellWidth = ITEM_WIDTH + ITEM_GAP;
    this.container.x = -(START_INDEX * cellWidth) + START_OFFSET;
  }

  public spin(onComplete: () => void): void {
    const { ITEM_WIDTH, ITEM_GAP, WINNING_INDEX, SPIN_DURATION, MICRO_BOUNCE, BOUNCE_DURATION } =
      RouletteConfig;
    const cellWidth = ITEM_WIDTH + ITEM_GAP;
    const endRandomOffset = Phaser.Math.Between(-ITEM_WIDTH / 4, ITEM_WIDTH / 4);
    const targetX = -(WINNING_INDEX * cellWidth) + endRandomOffset;

    // Этап 1: плавное замедление
    this.scene.tweens.add({
      targets: this.container,
      x: targetX,
      duration: SPIN_DURATION,
      ease: "Cubic.easeOut",
      onComplete,
    });
  }

  private getRarityColor(rarity: RoulettePrize["rarity"]): number {
    switch (rarity) {
      case "common":
        return 0x4a4a6e;
      case "rare":
        return 0x2196f3;
      case "epic":
        return 0x9c27b0;
      case "legendary":
        return 0xffd700;
      default:
        return 0x4a4a6e;
    }
  }
}
