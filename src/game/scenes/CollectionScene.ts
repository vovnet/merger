import * as Phaser from "phaser";

export class CollectionScene extends Phaser.Scene {
  constructor() {
    super({ key: "CollectionScene" });
  }

  create(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.cameras.main.fadeIn(300, 0, 0, 0);

    // 🎯 Паузим игровые сцены, пока игрок смотрит коллекцию
    this.scene.pause("GameScene");
    this.scene.pause("UIScene");

    // 1. Фон на весь экран (заодно перехватывает все клики)
    const bg = this.add
      .rectangle(0, 0, screenWidth, screenHeight, 0x1a1a2e)
      .setOrigin(0)
      .setInteractive();

    // 2. Заголовок
    this.add
      .text(screenWidth / 2, 60, "📚 КОЛЛЕКЦИЯ", {
        fontSize: "40px",
        color: "#ffd700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // 3. Заглушка под будущую сетку сквишей
    this.add
      .text(screenWidth / 2, screenHeight / 2, "Здесь скоро появятся сквиши...", {
        fontSize: "24px",
        color: "#888899",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);

    // 4. Кнопка "Назад"
    const backBtn = this.add
      .rectangle(80, 60, 120, 50, 0x4a4a6e)
      .setInteractive({ useHandCursor: true });
    backBtn.setStrokeStyle(2, 0xffffff, 0.5);

    const backText = this.add
      .text(80, 60, "← НАЗАД", {
        fontSize: "20px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    backBtn.on("pointerdown", () => this.close());
    backBtn.on("pointerover", () => backBtn.setFillStyle(0x5a5a7e));
    backBtn.on("pointerout", () => backBtn.setFillStyle(0x4a4a6e));
  }

  private close(): void {
    // Возобновляем игровые сцены
    this.scene.resume("GameScene");
    this.scene.resume("UIScene");

    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop();
    });
  }
}
