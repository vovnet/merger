import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents, UIEvents } from "../types/GameEvents";
import { Economy } from "../core/Economy";
import { GameState } from "../core/GameState";
import { AddCoinButton } from "./AddCoinButton";
import { Grid } from "../core/Grid";

export class ActionButtons {
  private scene: Phaser.Scene;

  private economy: Economy;

  private fillButtonBg: Phaser.GameObjects.Rectangle;
  private fillButtonText: Phaser.GameObjects.BitmapText;

  private spinButtonBg: Phaser.GameObjects.Rectangle;
  private spinButtonText: Phaser.GameObjects.Text;
  private addCoinButton: AddCoinButton;

  private gameState: GameState;
  private grid: Grid;

  constructor(scene: Phaser.Scene, economy: Economy) {
    this.scene = scene;
    this.gameState = scene.registry.get("gameState") as GameState;
    this.grid = scene.registry.get("grid") as Grid;
    this.economy = economy;
    this.create();
    this.setupListeners();
    this.updateSpawnButtonText();
    this.updateSpinButtonText();
  }

  private create(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // 🎯 Кнопка заполнения (справа внизу)
    this.fillButtonBg = this.scene.add
      .rectangle(width - 100, height - 160, 140, 50, 0x9b59b6)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    this.fillButtonBg.setStrokeStyle(2, 0xffffff);

    this.fillButtonText = this.scene.add
      .bitmapText(width - 100, height - 160, "russo", "х", 20)
      .setOrigin(0.5)
      .setDepth(101);

    this.fillButtonBg.on("pointerdown", () => {
      EventBus.emit(UIEvents.FILL_REQUESTED);
    });

    const debugBtnX = width - 160;
    const debugBtnY = 180;

    this.addCoinButton = new AddCoinButton(this.scene, debugBtnX, debugBtnY, this.gameState);

    const spinBtnX = 100;
    const spinBtnY = height - 40;

    this.spinButtonBg = this.scene.add
      .rectangle(spinBtnX, spinBtnY, 160, 50, 0xffd700) // Золотой цвет для награды
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    this.spinButtonBg.setStrokeStyle(2, 0xffffff);

    this.spinButtonText = this.scene.add
      .text(spinBtnX, spinBtnY, `🎟️ 0`, {
        fontSize: "20px",
        color: "#000000", // Черный текст лучше читается на золотом
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#ffffff",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(101);

    this.spinButtonBg.on("pointerdown", () => {
      if (this.gameState.spins > 0) {
        // 🎯 Эмитим событие для открытия рулетки
        this.scene.scene.launch("RouletteScene");
      } else {
        // Визуальный фидбек: легкая тряска, если спинов нет
        this.scene.tweens.add({
          targets: this.spinButtonBg,
          x: { from: spinBtnX, to: spinBtnX - 5 },
          duration: 50,
          yoyo: true,
          repeat: 3,
          ease: "Sine.easeInOut",
        });
      }
    });

    EventBus.on(GameEvents.GRID_ITEM_CHANGED, this.updateSpawnButtonText);

    this.spinButtonBg.on("pointerover", () => {
      if (this.gameState.spins > 0) this.spinButtonBg.setFillStyle(0xffe44d);
    });

    this.spinButtonBg.on("pointerout", () => {
      if (this.gameState.spins > 0) this.spinButtonBg.setFillStyle(0xffd700);
    });
  }

  private updateSpawnButtonText() {
    console.log("grid changed");
  }

  private updateSpinButtonText(): void {
    const spins = this.gameState.spins;
    this.spinButtonText.setText(`🎟️ ${spins}`);

    // Если спинов 0, делаем кнопку серой и неактивной
    if (spins === 0) {
      this.spinButtonBg.setFillStyle(0x7f8c8d);
      this.spinButtonText.setColor("#ffffff");
      this.spinButtonBg.disableInteractive();
    }
    // Если есть спины, возвращаем золотой цвет и активность
    else {
      this.spinButtonBg.setFillStyle(0xffd700);
      this.spinButtonText.setColor("#000000");
      this.spinButtonBg.setInteractive({ useHandCursor: true });
    }
  }

  private setupListeners(): void {
    EventBus.on(GameEvents.LEVEL_CHANGED, (level: number) => {
      this.updateSpawnButtonText();
    });

    EventBus.on(GameEvents.SPINS_CHANGED, () => {
      this.updateSpinButtonText();

      // Небольшая анимация "пульса" при получении нового спина
      if (this.gameState.spins > 0) {
        this.scene.tweens.add({
          targets: this.spinButtonBg,
          scale: { from: 1.2, to: 1 },
          duration: 300,
          ease: "Back.easeOut",
        });
      }
    });
  }

  destroy(): void {
    this.fillButtonBg.destroy();
    this.fillButtonText.destroy();
    this.spinButtonBg.destroy();
    this.spinButtonText.destroy();
    this.addCoinButton.destroy();
  }
}
