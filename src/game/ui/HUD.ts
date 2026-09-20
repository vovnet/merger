import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { ItemChain } from "./ItemChain";
import { GameState } from "../core/GameState";

export class HUD {
  private scene: Phaser.Scene;
  private gameState: GameState;
  private coinsText: Phaser.GameObjects.Text;
  private itemChain: ItemChain;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.gameState = this.scene.registry.get("gameState") as GameState;

    this.create();
    this.setupListeners();
  }

  private create(): void {
    // 💰 Текст монет (слева сверху)
    this.coinsText = this.scene.add
      .text(20, 20, `💰 0`, {
        fontSize: "24px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0, 0)
      .setDepth(100);

    this.itemChain = new ItemChain(this.scene);

    this.syncUI();
  }

  private setupListeners(): void {
    EventBus.on(GameEvents.COINS_CHANGED, () => this.syncUI());
    EventBus.on(GameEvents.LEVEL_CHANGED, () => this.syncUI());
  }

  private syncUI(): void {
    this.coinsText.setText(`💰 ${this.gameState.coins}`);
  }

  destroy(): void {
    this.coinsText.destroy();
    this.itemChain.destroy();
  }
}
