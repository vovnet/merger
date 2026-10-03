import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { TutorialStep, HandPointerConfig } from "../types/Tutorial";

export class TutorialOverlayScene extends Phaser.Scene {
  private overlay!: Phaser.GameObjects.Container;
  private dimmer!: Phaser.GameObjects.Rectangle;
  private highlightGraphics?: Phaser.GameObjects.Graphics;

  // 🎯 Новые свойства для руки
  private handSprite?: Phaser.GameObjects.Sprite;
  private handTween?: Phaser.Tweens.Tween;

  constructor() {
    super({ key: "TutorialOverlayScene" });
  }

  create(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.dimmer = this.add
      .rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.75)
      .setOrigin(0)
      .setDepth(9000)
      .setVisible(false);

    this.overlay = this.add.container(0, 0).setDepth(9001);
    this.overlay.setVisible(false);

    EventBus.on(GameEvents.SHOW_TUTORIAL_STEP, this.showStep, this);
    EventBus.on(GameEvents.HIDE_TUTORIAL_STEP, this.hideStep, this);

    EventBus.emit(GameEvents.TUTORIAL_SCENE_READY);
  }

  // 🎯 Показ шага
  private showStep(step: TutorialStep): void {
    this.overlay.removeAll(true);
    this.clearHighlight();
    this.cleanupHand(); // 🎯 Очищаем руку от предыдущего шага

    this.overlay.setVisible(true);

    if (step.highlightArea) {
      this.dimmer.setVisible(false);
      this.createHighlight(step.highlightArea, step.waitForClick || false);
    } else {
      this.dimmer.setVisible(true);
      if (step.waitForClick) {
        this.dimmer.setInteractive({ useHandCursor: false });
        this.dimmer.on("pointerdown", this.handleOverlayClick, this);
      } else {
        this.dimmer.disableInteractive();
        this.dimmer.off("pointerdown", this.handleOverlayClick, this);
      }
    }

    // 🎯 Создаем руку, если она указана в конфиге
    if (step.handPointer) {
      this.createHandPointer(step.handPointer);
    }

    this.createTextBox(step.text, step.textPosition);

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

  // 🎯 Создание подсветки с "дыркой" (без изменений)
  private createHighlight(
    area: { x: number; y: number; width: number; height: number },
    isInteractive: boolean,
  ): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.highlightGraphics = this.add.graphics().setDepth(9000);
    this.highlightGraphics.fillStyle(0x000000, 0.75);

    this.highlightGraphics.fillRect(0, 0, screenWidth, area.y);
    this.highlightGraphics.fillRect(
      0,
      area.y + area.height,
      screenWidth,
      screenHeight - (area.y + area.height),
    );
    this.highlightGraphics.fillRect(0, area.y, area.x, area.height);
    this.highlightGraphics.fillRect(
      area.x + area.width,
      area.y,
      screenWidth - (area.x + area.width),
      area.height,
    );

    if (isInteractive) {
      this.highlightGraphics.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, screenWidth, screenHeight),
        Phaser.Geom.Rectangle.Contains,
      );
      this.highlightGraphics.on("pointerdown", this.handleOverlayClick, this);
    }

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

  // 🎯 Очистка подсветки (без изменений)
  private clearHighlight(): void {
    if (this.highlightGraphics) {
      this.highlightGraphics.off("pointerdown", this.handleOverlayClick, this);
      this.highlightGraphics.destroy();
      this.highlightGraphics = undefined;
    }
  }

  // 🎯 СОЗДАНИЕ АНИМИРОВАННОЙ РУКИ
  private createHandPointer(config: HandPointerConfig): void {
    // Depth 9002, чтобы рука была поверх затемнения (9000) и рамки (9001), но под/над текстом по желанию
    if (config.type === "tap") {
      this.handSprite = this.add
        .sprite(config.x, config.y, "ui", "hand")
        .setOrigin(0.5)
        .setDepth(9002);

      // Анимация "Тап": пульсация размера и легкий поворот
      this.handTween = this.tweens.add({
        targets: this.handSprite,
        scale: { from: 1.0, to: 0.8 },
        angle: { from: 0, to: -15 },
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else if (config.type === "slide") {
      // Если начальные координаты не заданы, делаем смещение от целевой (например, сверху-слева)
      const startX = config.startX ?? config.x - 80;
      const startY = config.startY ?? config.y - 80;
      const endX = config.endX ?? config.x;
      const endY = config.endY ?? config.y;

      this.handSprite = this.add
        .sprite(startX, startY, "ui", "hand")
        .setOrigin(0.5)
        .setDepth(9002)
        // Поворачиваем руку в сторону движения (опционально, зависит от вашего спрайта)
        .setAngle(45);

      // Анимация "Слайд": плавное перемещение туда-обратно
      this.handTween = this.tweens.add({
        targets: this.handSprite,
        x: endX,
        y: endY,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // 🎯 ОЧИСТКА РУКИ (вызывать при смене шага или закрытии)
  private cleanupHand(): void {
    if (this.handTween) {
      this.handTween.stop();
      this.handTween.remove();
      this.handTween = undefined;
    }
    if (this.handSprite) {
      this.handSprite.destroy();
      this.handSprite = undefined;
    }
  }

  // 🎯 Создание текстового блока (без изменений)
  private createTextBox(text: string, textPosition?: { x: number; y: number }): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    const boxX = textPosition?.x ?? screenWidth / 2;
    const boxY = textPosition?.y ?? screenHeight - 120;

    const bg = this.add
      .rectangle(boxX, boxY, 600, 100, 0x2a2a3e, 0.95)
      .setStrokeStyle(2, 0x866fd7)
      .setOrigin(0.5);

    const textObj = this.add
      .bitmapText(boxX, boxY, "russo", text, 24)
      .setTint(0xffea74)
      .setOrigin(0.5)
      .setMaxWidth(550)
      .setCenterAlign();

    this.overlay.add([bg, textObj]);
  }

  // 🎯 Скрытие шага
  private hideStep(): void {
    this.clearHighlight();
    this.cleanupHand(); // 🎯 Очищаем руку

    this.overlay.setVisible(false);
    this.dimmer.setVisible(false);

    this.dimmer.disableInteractive();
    this.dimmer.off("pointerdown", this.handleOverlayClick, this);
  }

  // 🎯 Очистка при уничтожении сцены
  shutdown(): void {
    this.clearHighlight();
    this.cleanupHand(); // 🎯 Очищаем руку
    this.overlay.setVisible(false);
    this.dimmer.setVisible(false);
    this.dimmer.disableInteractive();
    this.dimmer.off("pointerdown", this.handleOverlayClick, this);
    EventBus.off(GameEvents.SHOW_TUTORIAL_STEP, this.showStep, this);
    EventBus.off(GameEvents.HIDE_TUTORIAL_STEP, this.hideStep, this);
  }
}
