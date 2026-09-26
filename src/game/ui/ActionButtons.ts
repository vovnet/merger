import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { Economy } from "../core/Economy";
import { GameState } from "../core/GameState";
import { Grid } from "../core/Grid";
import { AddCoinButton } from "./AddCoinButton";
import { FillButton } from "./FillButton"; // 🎯 Новый импорт

export class ActionButtons {
  private scene: Phaser.Scene;
  private economy: Economy;
  private gameState: GameState;
  private grid: Grid;

  // 🎯 Заменяем отдельные переменные на экземпляр класса
  private fillButton!: FillButton;

  private spinButtonBg!: Phaser.GameObjects.Rectangle;
  private spinButtonText!: Phaser.GameObjects.Text;
  private addCoinButton!: AddCoinButton;

  constructor(scene: Phaser.Scene, economy: Economy) {
    this.scene = scene;
    this.gameState = scene.registry.get("gameState") as GameState;
    this.grid = scene.registry.get("grid") as Grid;
    this.economy = economy;

    this.create();
    this.setupListeners();
    this.updateSpinButtonText();
  }

  private create(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // 🎯 1. Создаем кнопку заполнения через новый класс
    this.fillButton = new FillButton(
      this.scene,
      width - 140,
      height - 160,
      this.gameState,
      this.grid,
    );

    // 🎯 2. Кнопка добавления монет (твоя отладочная/основная кнопка)
    const debugBtnX = width - 160;
    const debugBtnY = 180;
    this.addCoinButton = new AddCoinButton(this.scene, debugBtnX, debugBtnY, this.gameState);

    // 🎯 3. Кнопка рулетки (Спины)
    const spinBtnX = 100;
    const spinBtnY = height - 40;

    this.spinButtonBg = this.scene.add
      .rectangle(spinBtnX, spinBtnY, 160, 50, 0xffd700)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    this.spinButtonBg.setStrokeStyle(2, 0xffffff);

    this.spinButtonText = this.scene.add
      .text(spinBtnX, spinBtnY, `🎟️ 0`, {
        fontSize: "20px",
        color: "#000000",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#ffffff",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(101);

    this.spinButtonBg.on("pointerdown", () => {
      if (this.gameState.spins > 0) {
        this.scene.scene.launch("RouletteScene");
      } else {
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

    this.spinButtonBg.on("pointerover", () => {
      if (this.gameState.spins > 0) this.spinButtonBg.setFillStyle(0xffe44d);
    });

    this.spinButtonBg.on("pointerout", () => {
      if (this.gameState.spins > 0) this.spinButtonBg.setFillStyle(0xffd700);
    });
  }

  private updateSpinButtonText(): void {
    const spins = this.gameState.spins;
    this.spinButtonText.setText(`🎟️ ${spins}`);

    if (spins === 0) {
      this.spinButtonBg.setFillStyle(0x7f8c8d);
      this.spinButtonText.setColor("#ffffff");
      this.spinButtonBg.disableInteractive();
    } else {
      this.spinButtonBg.setFillStyle(0xffd700);
      this.spinButtonText.setColor("#000000");
      this.spinButtonBg.setInteractive({ useHandCursor: true });
    }
  }

  private setupListeners(): void {
    EventBus.on(GameEvents.SPINS_CHANGED, () => {
      this.updateSpinButtonText();

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
    // 🎯 Вызываем destroy у вложенных компонентов
    this.fillButton.destroy();
    this.addCoinButton.destroy();

    this.spinButtonBg.destroy();
    this.spinButtonText.destroy();
  }
}
