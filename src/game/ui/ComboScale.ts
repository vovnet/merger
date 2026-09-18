// ui/ComboScale.ts
import * as Phaser from "phaser";
import { EventBus } from "../core/EventBus";
import { GameEvents, ComboData } from "../types/GameEvents";

export class ComboScale {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  // --- ВИЗУАЛЬНЫЕ КОМПОНЕНТЫ ---
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private fillBar!: Phaser.GameObjects.Rectangle;
  private comboText!: Phaser.GameObjects.Text;

  // --- КОНФИГУРАЦИЯ ---
  private readonly MAX_COMBO = 7; // 🎯 Обновлено до x7
  private readonly WIDTH = 60;
  private readonly HEIGHT = 200;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y).setDepth(200);

    this.createVisuals();
    this.bindEvents();
  }

  // ==========================================
  // 1. ВИЗУАЛЬНЫЙ СЛОЙ (Отвечает только за отрисовку и анимации)
  // ==========================================
  private createVisuals(): void {
    const halfW = this.WIDTH / 2;
    const halfH = this.HEIGHT / 2;

    // Фон шкалы
    this.bgGraphics = this.scene.add.graphics();
    this.bgGraphics.fillStyle(0x2a2a3e, 0.6);
    this.bgGraphics.fillRoundedRect(-halfW, -halfH, this.WIDTH, this.HEIGHT, 15);
    this.bgGraphics.lineStyle(3, 0xffffff, 1);
    this.bgGraphics.strokeRoundedRect(-halfW, -halfH, this.WIDTH, this.HEIGHT, 15);
    this.container.add(this.bgGraphics);

    // Заполняющая полоса (растет снизу вверх благодаря origin(0.5, 1))
    this.fillBar = this.scene.add.rectangle(0, halfH, this.WIDTH - 6, this.HEIGHT - 6, 0x4caf50);
    this.fillBar.setOrigin(0.5, 1);
    this.fillBar.setScale(1, 0);
    this.container.add(this.fillBar);

    // Текст
    this.comboText = this.scene.add
      .text(0, 0, "x1", {
        fontSize: "32px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.container.add(this.comboText);
  }

  /**
   * Применяет визуальные изменения на основе рассчитанных данных
   */
  private applyVisualUpdate(
    progress: number,
    text: string,
    color: number,
    isFirstShow: boolean,
  ): void {
    if (isFirstShow) {
      this.container.setScale(0);
      this.scene.tweens.add({
        targets: this.container,
        scale: 1,
        duration: 300,
        ease: "Back.easeOut",
      });
    }

    this.comboText.setText(text);

    // Убиваем предыдущие твины для предотвращения конфликтов
    this.scene.tweens.killTweensOf(this.fillBar);
    this.scene.tweens.killTweensOf(this.comboText);

    // Анимация заполнения полосы
    this.scene.tweens.add({
      targets: this.fillBar,
      scaleY: progress,
      duration: 200,
      ease: "Power2.out",
    });

    // Анимация текста ("подпрыгивание")
    this.scene.tweens.add({
      targets: this.comboText,
      scale: { from: 1.4, to: 1.0 },
      duration: 200,
      ease: "Back.easeOut",
    });

    // Плавная смена цвета
    this.scene.tweens.add({
      targets: this.fillBar,
      fillColor: color,
      duration: 200,
    });
  }

  private applyVisualReset(): void {
    this.scene.tweens.killTweensOf(this.fillBar);
    this.scene.tweens.killTweensOf(this.container);
    this.comboText.setText("");

    this.scene.tweens.add({
      targets: this.fillBar,
      scaleY: 0,
      duration: 150,
      ease: "Power2.in",
      onComplete: () => {
        this.fillBar.setFillStyle(0x4caf50); // Сброс к базовому зеленому
      },
    });
  }

  // ==========================================
  // 2. ЛОГИЧЕСКИЙ СЛОЙ (Отвечает за расчеты и реакцию на события)
  // ==========================================
  private bindEvents(): void {
    EventBus.on(GameEvents.COMBO_UPDATED, this.onComboUpdated, this);
    EventBus.on(GameEvents.COMBO_RESET, this.onComboReset, this);
  }

  private onComboUpdated(data: ComboData): void {
    const multiplier = data.multiplier;
    const isFirstShow = !this.container.visible;

    // 🎯 ЛОГИКА: Расчет прогресса (от 0.0 до 1.0)
    const progress = Math.min(multiplier / this.MAX_COMBO, 1);

    // 🎯 ЛОГИКА: Определение цвета и текста
    const color = this.getComboColor(multiplier);
    const text = `x${multiplier}`;

    // Передаем чистые данные в визуальный слой
    this.applyVisualUpdate(progress, text, color, isFirstShow);
  }

  private onComboReset(): void {
    this.applyVisualReset();
  }

  /**
   * 🎯 ЛОГИКА: Цветовая прогрессия для 7 уровней
   */
  private getComboColor(combo: number): number {
    return 0x4caf50;
    switch (combo) {
      case 1:
        return 0x4caf50; // 🟢 Зеленый (Старт)
      case 2:
        return 0x00bcd4; // 🔵 Бирюзовый
      case 3:
        return 0x2196f3; // 🔵 Голубой
      case 4:
        return 0xffeb3b; // 🟡 Желтый
      case 5:
        return 0xff9800; // 🟠 Оранжевый
      case 6:
        return 0xe91e63; // 🔴 Розовый/Красный
      case 7:
        return 0x9c27b0; // 🟣 Фиолетовый (MAX)
      default:
        return 0xffd700; // 🌟 Золотой (если комбо > 7)
    }
  }

  // ==========================================
  // 3. ЖИЗНЕННЫЙ ЦИКЛ
  // ==========================================
  public destroy(): void {
    EventBus.off(GameEvents.COMBO_UPDATED, this.onComboUpdated, this);
    EventBus.off(GameEvents.COMBO_RESET, this.onComboReset, this);
    this.container.destroy();
  }
}
