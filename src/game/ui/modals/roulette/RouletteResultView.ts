import * as Phaser from "phaser";
import { RouletteConfig } from "./config";

export class RouletteResultView {
  private scene: Phaser.Scene;
  private parentContainer: Phaser.GameObjects.Container;

  private overlay!: Phaser.GameObjects.Rectangle;
  private text!: Phaser.GameObjects.Text;
  private button!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, parentContainer: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.parentContainer = parentContainer;
  }

  public show(onClaim: () => void): void {
    const { MODAL_HEIGHT } = RouletteConfig;
    const screenWidth = this.scene.scale.width;

    this.overlay = this.scene.add
      .rectangle(0, 0, screenWidth, MODAL_HEIGHT, 0x000000, 0.7)
      .setDepth(50);
    this.parentContainer.add(this.overlay);

    this.text = this.scene.add
      .text(0, -50, "🎉 ПОБЕДА!", {
        fontSize: "48px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(51);
    this.parentContainer.add(this.text);

    this.button = this.scene.add
      .text(0, 50, "ЗАБРАТЬ", {
        fontSize: "24px",
        color: "#4caf50",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(52);

    this.button.on("pointerdown", onClaim);
    this.button.on("pointerover", () => this.button.setColor("#66bb6a"));
    this.button.on("pointerout", () => this.button.setColor("#4caf50"));

    this.parentContainer.add(this.button);
  }

  public hide(): void {
    this.overlay?.destroy();
    this.text?.destroy();
    this.button?.destroy();
  }
}
