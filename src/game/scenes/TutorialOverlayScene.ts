import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { TutorialStep } from "../types/Tutorial";

export class TutorialOverlayScene extends Phaser.Scene {
  private overlay!: Phaser.GameObjects.Container;
  private dimmer!: Phaser.GameObjects.Rectangle;
  private skipButton!: Phaser.GameObjects.Text;
  private currentHighlightMask?: Phaser.Display.Masks.GeometryMask;

  constructor() {
    super({ key: "TutorialOverlayScene" });
  }

  create(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    // 1. Затемнение всего экрана. 🎯 ДОБАВЛЕНО: .setVisible(false) по умолчанию
    this.dimmer = this.add
      .rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.75)
      .setOrigin(0)
      .setDepth(9000)
      .setVisible(false);

    // 2. Контейнер для подсказки
    this.overlay = this.add.container(0, 0).setDepth(9001);
    this.overlay.setVisible(false);

    // 4. Слушаем события
    EventBus.on(GameEvents.SHOW_TUTORIAL_STEP, this.showStep, this);
    EventBus.on(GameEvents.HIDE_TUTORIAL_STEP, this.hideStep, this);

    EventBus.emit(GameEvents.TUTORIAL_SCENE_READY);
  }

  // 🎯 Показ шага
  private showStep(step: TutorialStep): void {
    this.overlay.removeAll(true);
    this.clearHighlight();

    // 🎯 ПОКАЗЫВАЕМ и оверлей, и затемнение
    this.overlay.setVisible(true);
    this.dimmer.setVisible(true);

    // Управление кликами
    if (step.waitForClick) {
      this.dimmer.setInteractive({ useHandCursor: false });
      this.dimmer.on("pointerdown", this.handleOverlayClick, this);
    } else {
      this.dimmer.disableInteractive();
      this.dimmer.off("pointerdown", this.handleOverlayClick, this);
    }

    if (step.highlightArea) {
      this.createHighlight(step.highlightArea);
    }

    this.createTextBox(step.text);

    // Анимация появления
    this.overlay.setAlpha(0);
    this.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration: 300,
      ease: "Power2.out",
    });
  }

  private handleOverlayClick(): void {
    EventBus.emit(GameEvents.TUTORIAL_STEP_CLICKED);
  }

  // 🎯 Создание подсветки
  private createHighlight(area: { x: number; y: number; width: number; height: number }): void {
    const maskGraphics = this.add.graphics();
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRect(area.x, area.y, area.width, area.height);
    maskGraphics.setVisible(false);

    this.currentHighlightMask = maskGraphics.createGeometryMask();
    this.dimmer.setMask(this.currentHighlightMask);

    const border = this.add
      .rectangle(area.x + area.width / 2, area.y + area.height / 2, area.width + 8, area.height + 8)
      .setStrokeStyle(3, 0xffd700)
      .setDepth(9001);

    this.tweens.add({
      targets: border,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.overlay.add(border);
  }

  private clearHighlight(): void {
    if (this.currentHighlightMask) {
      this.dimmer.clearMask();
      this.currentHighlightMask.destroy();
      this.currentHighlightMask = undefined;
    }
  }

  private createTextBox(text: string): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    const boxX = screenWidth / 2;
    const boxY = screenHeight - 120;

    const bg = this.add
      .rectangle(boxX, boxY, 600, 100, 0x2a2a3e, 0.95)
      .setStrokeStyle(2, 0xffd700)
      .setOrigin(0.5);

    const textObj = this.add
      .text(boxX, boxY, text, {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
        align: "center",
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5);

    this.overlay.add([bg, textObj]);
  }

  // 🎯 Скрытие шага
  private hideStep(): void {
    this.clearHighlight();

    // 🎯 СКРЫВАЕМ и оверлей, и затемнение
    this.overlay.setVisible(false);
    this.dimmer.setVisible(false);

    // Сбрасываем интерактивность
    this.dimmer.disableInteractive();
    this.dimmer.off("pointerdown", this.handleOverlayClick, this);
  }

  // 🎯 Очистка при уничтожении сцены
  shutdown(): void {
    this.clearHighlight();
    this.overlay.setVisible(false);
    this.dimmer.setVisible(false); // 🎯 Гарантируем скрытие при выходе
    this.dimmer.disableInteractive();
    this.dimmer.off("pointerdown", this.handleOverlayClick, this);
    EventBus.off(GameEvents.SHOW_TUTORIAL_STEP, this.showStep, this);
    EventBus.off(GameEvents.HIDE_TUTORIAL_STEP, this.hideStep, this);
  }
}
