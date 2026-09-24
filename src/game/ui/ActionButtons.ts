import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents, UIEvents } from "../types/GameEvents";
import { Economy } from "../core/Economy";
import { GameState } from "../core/GameState";

export class ActionButtons {
  private scene: Phaser.Scene;

  private economy: Economy;

  private spawnButtonBg: Phaser.GameObjects.Rectangle;
  private spawnButtonText: Phaser.GameObjects.BitmapText;
  private fillButtonBg: Phaser.GameObjects.Rectangle;
  private fillButtonText: Phaser.GameObjects.BitmapText;
  private debugButtonBg: Phaser.GameObjects.Rectangle;
  private debugButtonText: Phaser.GameObjects.Text;
  private spinButtonBg: Phaser.GameObjects.Rectangle;
  private spinButtonText: Phaser.GameObjects.Text;

  private gameState: GameState;

  constructor(scene: Phaser.Scene, economy: Economy) {
    this.scene = scene;
    this.gameState = scene.registry.get("gameState") as GameState;
    this.economy = economy;
    this.create();
    this.setupListeners();
    this.updateSpawnButtonText();
    this.updateAddCoinsButton();
    this.updateSpinButtonText();
  }

  private create(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // 🎯 Кнопка спауна (по центру внизу)
    this.spawnButtonBg = this.scene.add
      .rectangle(width / 2, height - 80, 200, 60, 0x4a90e2)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    this.spawnButtonBg.setStrokeStyle(2, 0xffffff);

    this.spawnButtonText = this.scene.add
      .bitmapText(width / 2, height - 80, "russo", `СПАУН (Ур. ${this.gameState.level})`, 24)
      .setOrigin(0.5)
      .setDepth(101);

    this.spawnButtonBg.on("pointerdown", () => {
      EventBus.emit(UIEvents.SPAWN_REQUESTED);
    });
    this.spawnButtonBg.on("pointerover", () => this.spawnButtonBg.setFillStyle(0x5aa0f2));
    this.spawnButtonBg.on("pointerout", () => this.spawnButtonBg.setFillStyle(0x4a90e2));

    // 🎯 Кнопка заполнения (справа внизу)
    this.fillButtonBg = this.scene.add
      .rectangle(width - 100, height - 160, 140, 50, 0x9b59b6)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    this.fillButtonBg.setStrokeStyle(2, 0xffffff);

    this.fillButtonText = this.scene.add
      .bitmapText(width - 100, height - 160, "russo", "ЗАПОЛНИТЬ", 20)
      .setOrigin(0.5)
      .setDepth(101);

    this.fillButtonBg.on("pointerdown", () => {
      EventBus.emit(UIEvents.FILL_REQUESTED);
    });
    this.fillButtonBg.on("pointerover", () => this.fillButtonBg.setFillStyle(0xa96ac6));
    this.fillButtonBg.on("pointerout", () => this.fillButtonBg.setFillStyle(0x9b59b6));

    const debugBtnX = width - 100;
    const debugBtnY = 100;

    this.debugButtonBg = this.scene.add
      .rectangle(debugBtnX, debugBtnY, 140, 50, 0x2ecc71)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    this.debugButtonBg.setStrokeStyle(2, 0xffffff);

    this.debugButtonText = this.scene.add
      .text(debugBtnX, debugBtnY, "+500 💰 (Тест)", {
        fontSize: "16px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(101);

    this.debugButtonBg.on("pointerdown", () => {
      // 🎯 Эмитим событие, которое GameScene подхватит и добавит монеты
      EventBus.emit(UIEvents.DEBUG_ADD_COINS);

      // Анимация нажатия для фидбека
      this.scene.tweens.add({
        targets: this.debugButtonBg,
        scale: { from: 1.1, to: 1 },
        duration: 150,
        ease: "Power2",
      });
    });
    this.debugButtonBg.on("pointerover", () => this.debugButtonBg.setFillStyle(0x27ae60));
    this.debugButtonBg.on("pointerout", () => this.debugButtonBg.setFillStyle(0x2ecc71));

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

  private updateSpawnButtonText(): void {
    const cost = this.economy.getSpawnCost(this.gameState.level);
    this.spawnButtonText.setText(`СПАУН (${cost} 💰)`);
  }

  private updateAddCoinsButton() {
    const cost = this.economy.getSpawnRefund(this.gameState.level);
    this.debugButtonText.setText(`+${cost} 💰`);
  }

  private setupListeners(): void {
    EventBus.on(GameEvents.LEVEL_CHANGED, (level: number) => {
      this.updateSpawnButtonText();
      this.updateAddCoinsButton();
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
    this.spawnButtonBg.destroy();
    this.spawnButtonText.destroy();
    this.fillButtonBg.destroy();
    this.fillButtonText.destroy();
    this.debugButtonBg.destroy();
    this.debugButtonText.destroy();
    this.spinButtonBg.destroy();
    this.spinButtonText.destroy();
  }
}
