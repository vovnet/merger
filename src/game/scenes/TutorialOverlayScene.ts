import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents } from "../types/GameEvents";
import { TutorialStep } from "../types/Tutorial";

export class TutorialOverlayScene extends Phaser.Scene {
  private overlay!: Phaser.GameObjects.Container;
  private dimmer!: Phaser.GameObjects.Rectangle;
  private skipButton!: Phaser.GameObjects.Text;
  private highlightGraphics?: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: "TutorialOverlayScene" });
  }

  create(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    // 1. Полноэкранное затемнение
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

    this.overlay.setVisible(true);

    // 🎯 Если есть зона подсветки, рисуем "дырку"
    if (step.highlightArea) {
      this.dimmer.setVisible(false);
      // 🎯 ПЕРЕДАЕМ флаг waitForClick в метод создания подсветки
      this.createHighlight(step.highlightArea, step.waitForClick || false);
    } else {
      this.dimmer.setVisible(true);
      // Управление кликами для сплошного затемнения
      if (step.waitForClick) {
        this.dimmer.setInteractive({ useHandCursor: false });
        this.dimmer.on("pointerdown", this.handleOverlayClick, this);
      } else {
        this.dimmer.disableInteractive();
        this.dimmer.off("pointerdown", this.handleOverlayClick, this);
      }
    }

    this.createTextBox(step.text, step.textPosition);

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

  // 🎯 Создание подсветки с "дыркой"
  private createHighlight(
    area: { x: number; y: number; width: number; height: number },
    isInteractive: boolean, // 🎯 НОВЫЙ ПАРАМЕТР
  ): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.highlightGraphics = this.add.graphics().setDepth(9000);
    this.highlightGraphics.fillStyle(0x000000, 0.75);

    // 1. Верхняя часть
    this.highlightGraphics.fillRect(0, 0, screenWidth, area.y);
    // 2. Нижняя часть
    this.highlightGraphics.fillRect(
      0,
      area.y + area.height,
      screenWidth,
      screenHeight - (area.y + area.height),
    );
    // 3. Левая часть
    this.highlightGraphics.fillRect(0, area.y, area.x, area.height);
    // 4. Правая часть
    this.highlightGraphics.fillRect(
      area.x + area.width,
      area.y,
      screenWidth - (area.x + area.width),
      area.height,
    );

    // 🎯 ГЛАВНОЕ ИСПРАВЛЕНИЕ: Делаем графику интерактивной, если нужно ждать клик
    if (isInteractive) {
      // Задаем область нажатия во весь экран, чтобы клик в "дырку" тоже продвигал туториал
      this.highlightGraphics.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, screenWidth, screenHeight),
        Phaser.Geom.Rectangle.Contains,
      );
      this.highlightGraphics.on("pointerdown", this.handleOverlayClick, this);
    }

    // Пульсирующая рамка
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

  // 🎯 Очистка подсветки
  private clearHighlight(): void {
    if (this.highlightGraphics) {
      // 🎯 Обязательно отписываемся от событий перед уничтожением
      this.highlightGraphics.off("pointerdown", this.handleOverlayClick, this);
      this.highlightGraphics.destroy();
      this.highlightGraphics = undefined;
    }
  }

  // 🎯 Создание текстового блока
  private createTextBox(text: string, textPosition?: { x: number; y: number }): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    // 🎯 Используем переданные координаты или стандартные (внизу по центру)
    const boxX = textPosition?.x ?? screenWidth / 2;
    const boxY = textPosition?.y ?? screenHeight - 120;

    const bg = this.add
      .rectangle(boxX, boxY, 600, 100, 0x2a2a3e, 0.95)
      .setStrokeStyle(2, 0xffd700)
      .setOrigin(0.5); // Центр прямоугольника будет в точке (boxX, boxY)

    const textObj = this.add
      .text(boxX, boxY, text, {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
        align: "center",
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5); // Центр текста совпадает с центром фона

    this.overlay.add([bg, textObj]);
  }

  // 🎯 Скрытие шага
  private hideStep(): void {
    this.clearHighlight();

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
    this.dimmer.setVisible(false);
    this.dimmer.disableInteractive();
    this.dimmer.off("pointerdown", this.handleOverlayClick, this);
    EventBus.off(GameEvents.SHOW_TUTORIAL_STEP, this.showStep, this);
    EventBus.off(GameEvents.HIDE_TUTORIAL_STEP, this.hideStep, this);
  }
}
