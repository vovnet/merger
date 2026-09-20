import * as Phaser from "phaser";
import { BaseModal } from "./BaseModal";

const WIDTH = 900;
const HEIGHT = 600;

export class RouletteModal extends BaseModal {
  protected buildUI(): void {
    const hitShield = this.scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0).setInteractive();
    this.container.add(hitShield);
    // 1. Фон самой модалки (белая карточка по центру)
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x2a2a3e, 1);
    bg.fillRoundedRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT, 20);
    bg.lineStyle(4, 0xffffff, 1);
    bg.strokeRoundedRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT, 20);
    this.container.add(bg);

    // 2. Заголовок
    const title = this.scene.add
      .text(0, -150, "🎰 РУЛЕТКА", {
        fontSize: "32px",
        color: "#3eff2d",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.container.add(title);

    // 3. Кнопка закрытия (крестик)
    const closeBtn = this.scene.add
      .text(420, -260, "✖", {
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    closeBtn.on("pointerdown", () => this.close());
    closeBtn.on("pointerover", () => closeBtn.setColor("#ff6b6b"));
    closeBtn.on("pointerout", () => closeBtn.setColor("#ffffff"));
    this.container.add(closeBtn);

    // 4. Здесь будет твоя логика рулетки (спрайты, кнопка "Крутить" и т.д.)
    const placeholder = this.scene.add
      .text(0, 0, "Здесь будет анимация рулетки", {
        fontSize: "20px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5);
    this.container.add(placeholder);
  }
}
